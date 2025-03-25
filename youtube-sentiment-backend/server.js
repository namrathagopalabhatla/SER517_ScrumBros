require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Strong password validator
function isStrongPassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
  return passwordRegex.test(password);
}

// ✅ REGISTER + Send confirmation email
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  if (!isStrongPassword(password))
    return res.status(400).json({
      error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
    });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, is_verified: false, confirmation_token: token }])
      .select();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({ error: "Failed to register user" });
    }

    const confirmLink = `${process.env.BASE_URL}/confirm/${token}`;

    await transporter.sendMail({
      from: `"Verify your Email" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Confirm your Email",
      html: `<h3>Click to confirm your email</h3><a href="${confirmLink}">${confirmLink}</a>`
    });

    res.json({ message: "Registration successful. Please check your email to confirm." });

  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ CONFIRMATION endpoint
app.get('/confirm/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const { email } = decoded;

    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: true, confirmation_token: null })
      .eq('email', email)
      .eq('is_verified', false)
      .select();

    if (error || !data || data.length === 0)
      return res.status(400).send("Invalid or already verified");

    res.send("Email confirmed! You can now log in.");
  } catch (err) {
    console.error("Confirmation error:", err.message);
    res.status(400).send("Invalid or expired confirmation link");
  }
});

// ✅ LOGIN with verification + return auth JWT
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    if (!user.is_verified)
      return res.status(403).json({ error: "Please confirm your email before logging in." });

    const authToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: "Login successful", token: authToken });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Fetch YouTube Comments
async function fetchYouTubeComments(videoId) {
    let comments = [];
    let nextPageToken = '';

    try {
        while (comments.length < 1000) {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
                params: {
                    part: 'snippet',
                    videoId,
                    key: YOUTUBE_API_KEY,
                    maxResults: 100,
                    pageToken: nextPageToken
                }
            });

            response.data.items.forEach(item => {
                comments.push(item.snippet.topLevelComment.snippet.textOriginal);
            });

            nextPageToken = response.data.nextPageToken;
            if (!nextPageToken) break;
        }
    } catch (error) {
        console.error("Error fetching comments:", error.message);
    }

    return comments.slice(0, 1000);
}

// Analyze Sentiment with OpenAI
async function analyzeSentiment(comments) {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing! Please check your .env file.");
    }

    const prompt = `Classify the following YouTube comments into five categories: positive, negative, neutral, irrelevant, and scam. Also, provide a brief summary of the overall sentiment:\n\nComments:\n${comments.slice(0, 20).join("\n")}\n\nRespond in JSON format like:\n{\n  "positive": [ ... ],\n  "negative": [ ... ],\n  "neutral": [ ... ],\n  "irrelevant": [ ... ],\n  "scam": [ ... ],\n  "summary": "..."\n}`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let content = response.data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("OpenAI API Error:", error);
        return null;
    }
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

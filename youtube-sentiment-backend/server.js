require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Function to validate password strength
function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Register API with password validation
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).json({
            error: "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([{ email, password: hashedPassword }])
            .select();

        if (error) {
            console.error("Supabase insert error:", error.message);
            return res.status(500).json({ error: "Failed to register user" });
        }

        res.json({ message: "User registered successfully", user: data[0] });
    } catch (err) {
        console.error("Error registering user:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login API
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, data.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ message: "Login successful", user: { id: data.id, email: data.email } });
    } catch (err) {
        console.error("Error logging in user:", err.message);
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

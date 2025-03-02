require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing! Please check your .env file.");
    }

    const prompt = `Classify the following YouTube comments into five categories: positive, negative, neutral, irrelevant, and scam. Also, provide a brief summary of the overall sentiment:

    Comments:
    ${comments.slice(0, 20).join("\n")}

    Respond in JSON format like:
    {
      "positive": [ ... ],
      "negative": [ ... ],
      "neutral": [ ... ],
      "irrelevant": [ ... ],
      "scam": [ ... ],
      "summary": "..."
    }`;

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
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,  // Use env variable
                    "Content-Type": "application/json"
                }
            }
        );

        // Ensure response is valid before parsing
        if (!response.data || !response.data.choices || !response.data.choices[0].message) {
            console.error("Invalid response from OpenAI:", response.data);
            return null;
        }

        let content = response.data.choices[0].message.content;
        content = content.replace(/```json|```/g, '').trim(); // Remove extra backticks and format properly

        return JSON.parse(content);
    } catch (error) {
        if (error.response) {
            console.error("OpenAI API Error:", error.response.status, error.response.data);
        } else {
            console.error("Request failed:", error.message);
        }
        return null;
    }
}

// Save Sentiment Data to Supabase
async function saveSentimentData(videoId, analysis) {
    const totalComments = Object.values(analysis).flat().length;

    const percentages = {
        positive: (analysis.positive.length / totalComments) * 100,
        negative: (analysis.negative.length / totalComments) * 100,
        neutral: (analysis.neutral.length / totalComments) * 100,
        irrelevant: (analysis.irrelevant.length / totalComments) * 100,
        scam: (analysis.scam.length / totalComments) * 100,
    };

    const { data, error } = await supabase
        .from('youtube_sentiment')
        .upsert([
            {
                videoid: videoId,
                positive_percentage: percentages.positive,
                negative_percentage: percentages.negative,
                neutral_percentage: percentages.neutral,
                irrelevant_percentage: percentages.irrelevant,
                scam_percentage: percentages.scam,
                summary: analysis.summary
            }
        ]);

    if (error) console.error("Error saving to Supabase:", error.message);
}

// Middleware to authenticate user
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }

        req.user = user;
        next();
    });
}

// Register API Endpoint
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        // Check if user already exists
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError) {
            return res.status(500).json({ error: "Error checking for existing user." });
        }

        if (existingUser) {
            return res.status(400).json({ error: "User already exists." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const { data, error } = await supabase
            .from('users')
            .insert([{ email, password: hashedPassword }]);

        if (error) {
            return res.status(500).json({ error: "Error registering user." });
        }

        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// Login API Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        // Check if the user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError) {
            return res.status(500).json({ error: "Error fetching user data." });
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials." });
        }

        // Compare the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials." });
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        // Send the token in the response
        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// API Endpoint to Analyze a Video
app.post('/analyze', authenticateToken, async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "videoId is required" });

    console.log(`Fetching comments for video: ${videoId}`);
    const comments = await fetchYouTubeComments(videoId);
    
    console.log(`Analyzing ${comments.length} comments...`);
    const analysis = await analyzeSentiment(comments);

    if (!analysis) return res.status(500).json({ error: "Sentiment analysis failed" });

    await saveSentimentData(videoId, analysis);

    res.json(analysis);
});

// API Endpoint to Retrieve Results
app.get('/sentiment/:videoId', async (req, res) => {
    const { videoId } = req.params;

    const { data, error } = await supabase
        .from('youtube_sentiment')
        .select('*')
        .eq('videoid', videoId)
        .single();

    if (error) return res.status(500).json({ error: "No results found." });

    res.json(data);
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

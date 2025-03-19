require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const cors = require('cors');

// app.use(cors({
//     origin: '*', // Allows requests from any origin
//     methods: ['GET', 'POST', 'OPTIONS'], 
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

// Ensure preflight requests are handled
app.options('*', cors());
const corsOptions = {
    origin: '*', 
    methods: 'GET, POST, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true
};

app.use(cors(corsOptions));

app.options('/analyze', (req, res) => {
    res.set(corsOptions);
    res.sendStatus(200);
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://www.youtube.com");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});



const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



// Fetch YouTube Comments
async function fetchYouTubeComments(videoId) {
    let comments = [];
    let nextPageToken = '';

    try {
        while (comments.length < 100) {
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

    return comments.slice(0, 100); // Limit to 100 comments for now, can be adjusted later
}

// Analyze Sentiment with OpenAI
async function analyzeSentiment(comments) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing! Please check your .env file.");
    }

  

    const prompt = `Classify the following YouTube comments into three categories: positive, negative, and neutral. Also, provide a brief summary of the overall sentiment of the comments.

    Comments:
    ${comments.slice(0, 20).join("\n")}

    Respond ONLY in JSON format like:
    {
    "positive": ["comment 1", "comment 2"],
    "negative": ["comment 3"],
    "neutral": ["comment 4", "comment 5"],
    "summary": "This is the summary..."
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
        content = content.replace(/json|/g, '').trim(); // Remove extra backticks and format properly

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

// API Endpoint to Analyze a Video
app.post('/analyze', async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "videoId is required" });

    console.log( `Fetching comments for video: ${videoId}`);
    const comments = await fetchYouTubeComments(videoId);
    const realTotal = 3600; // You can dynamically replace this if needed

    console.log(`Analyzing ${comments.length} comments...`);
    const analysis = await analyzeSentiment(comments);
    if (!analysis) return res.status(500).json({ error: "Sentiment analysis failed" });

    // Count totals
    const totalAnalyzed = comments.length;
    const pos = analysis.positive?.length || 0;
    const neg = analysis.negative?.length || 0;
    const neutral = analysis.neutral?.length || 0;

    // Compute verdict score
    let verdict = 0;
    const posRatio = pos / totalAnalyzed;
    const negRatio = neg / totalAnalyzed;
    if (posRatio >= 0.6) verdict = 2;
    else if (posRatio >= 0.4) verdict = 1;
    else if (negRatio >= 0.6) verdict = -2;
    else if (negRatio >= 0.4) verdict = -1;

    // Pick helpful comments
    const helpfulComments = [
        ...analysis.positive.slice(0, 2),
        ...analysis.neutral.slice(0, 2),
        analysis.negative[0]
    ].filter(Boolean).slice(0, 5); // Max 5

    // Save to Supabase
    const { error } = await supabase
        .from('video_sentiment_summary')
        .upsert([
            {
                videoid: videoId,
                summary: analysis.summary,
                most_helpful_comments: helpfulComments,
                verdict: verdict,
                real_total_comments: realTotal,
                comments_data: [totalAnalyzed, pos, neutral, neg]
            }
        ]);

    if (error) {
        console.error("❌ Error saving to Supabase:", error.message);
        return res.status(500).json({ error: "Failed to save analysis result." });
    }

    // Send formatted response
    res.json({
        summary: analysis.summary,
        most_helpful_comments: helpfulComments,
        verdict: verdict,
        real_total_comments: realTotal,
        comments_data: [totalAnalyzed, pos, neutral, neg]
    });
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
app.get('/test-supabase', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('video_sentiment_summary') // or 'video_sentiment_summary' if you're testing new table
            .select('*')
            .limit(1);

        if (error) {
            console.error("❌ Supabase error:", error.message);
            return res.status(500).json({ connected: false, error: error.message });
        }

        res.json({ connected: true, sample: data });
    } catch (err) {
        console.error("❌ Unexpected error:", err.message);
        res.status(500).json({ connected: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
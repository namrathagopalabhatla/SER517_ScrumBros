require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { jsonrepair } = require("jsonrepair");

const app = express();
app.use(express.json());

const cors = require('cors');

    app.options('*', cors());
    const corsOptions = {
        origin: '*', 
        methods: 'GET, POST, OPTIONS',
        allowedHeaders: 'Content-Type, Authorization'
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
    const maxToCollect = 150; 

    try {
        while (comments.length < maxToCollect) {
            const response = await axios.get(
                'https://www.googleapis.com/youtube/v3/commentThreads',
                {
                    params: {
                        part: 'snippet',
                        videoId,
                        key: YOUTUBE_API_KEY,
                        maxResults: 100,
                        pageToken: nextPageToken,
                        textFormat: 'plainText'
                    }
                }
            );

            const items = response.data.items || [];

            items.forEach(item => {
                const comment = item.snippet.topLevelComment.snippet.textDisplay;
                if (comment && comment.trim().length > 5) {
                    comments.push(comment.trim());
                }
            });

            nextPageToken = response.data.nextPageToken;
            if (!nextPageToken) break;
        }
    } catch (error) {
        console.error("Error fetching comments:", error.message);
    }

    console.log(`Collected ${comments.length} top-level comments.`);
    return comments.slice(0, maxToCollect); 
}


// Analyze Sentiment with OpenAI
async function analyzeSentiment(comments) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing! Please check .env file.");
    }

    // Trim comments to 200 characters each to keep prompt concise
    const trimmedComments = comments
        .filter(c => typeof c === 'string' && c.trim().length > 5)
        .slice(0, 100)
        .map(c => c.trim().slice(0, 200));

    // AI prompt ensuring structured JSON output
    const prompt = `You are an AI assistant specializing in sentiment analysis. Your task is to categorize each YouTube comment into one of the following categories: "positive", "negative", or "neutral". Every comment must be categorized—do not skip any.

Additionally, provide:
1. A brief **summary** of the overall sentiment in the comments.
2. **Five helpful comments** that best represent the general discussion.

### **JSON Output Format**
Your response **must** be structured strictly as follows:

{
    "summary": "A brief overview of the overall sentiment in the comments.",
    "most_helpful_comments": [
        "Comment 1",
        "Comment 2",
        "Comment 3",
        "Comment 4",
        "Comment 5"
    ],
    "verdict": 0,
    "real_total_comments": 3600,
    "comments_data": [
        total_comments_analyzed,
        total_positive,
        total_neutral,
        total_negative
    ]
}

- **Only categorize the first 100 comments provided**.
- **total_comments_analyzed must be exactly the number of comments analyzed (max 100)**.
- **total_positive + total_neutral + total_negative must equal total_comments_analyzed**.
- **real_total_comments is 3600 but represents all YouTube comments, not just the analyzed ones**.
- The **verdict** is determined based on:
  - **2** if positive comments are ≥ 60%.
  - **1** if positive comments are ≥ 40%.
  - **-1** if negative comments are ≥ 40%.
  - **-2** if negative comments are ≥ 60%.
  - **0** otherwise.

### **YouTube Comments to Analyze**
${trimmedComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini", 
                messages: [{ role: "user", content: prompt }],
                temperature: 0.4,
                max_tokens: 1000
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Extract response content
        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
            console.error("No content returned from OpenAI.");
            return null;
        }

        // Attempt to repair and parse JSON
        try {
            const cleanedJson = jsonrepair(content);
            const parsedData = JSON.parse(cleanedJson);

            // 🔹 Step 1: Extract and validate numbers
            let totalAnalyzed = parsedData.comments_data[0];  // AI's reported count
            let totalPositive = parsedData.comments_data[1];
            let totalNeutral = parsedData.comments_data[2];
            let totalNegative = parsedData.comments_data[3];

            // 🔹 Step 2: Ensure total is correctly limited to 100
            const calculatedTotal = totalPositive + totalNeutral + totalNegative;

            if (calculatedTotal !== totalAnalyzed || totalAnalyzed > 100) {
                console.error(`Mismatch in counts: AI reported ${totalAnalyzed}, but sum is ${calculatedTotal}. Fixing...`);
                totalAnalyzed = Math.min(100, calculatedTotal);  // Ensure it doesn't exceed 100
                parsedData.comments_data[0] = totalAnalyzed;
            }

            return parsedData;

        } catch (repairError) {
            console.error("JSON Repair Failed:", repairError.message);
            return null;
        }

    } catch (error) {
        console.error("OpenAI API Error:", error.response?.status, error.response?.data || error.message);
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
    const { videoId, autoRetry = false } = req.body;

    if (!videoId) return res.status(400).json({ error: "videoId is required" });

    // Step 1: Check if analysis already exists
    const { data: existingData, error: fetchError } = await supabase
        .from('video_sentiment_summary')
        .select('*')
        .eq('videoid', videoId)
        .single();

    if (existingData && !autoRetry) {
        console.log(`Returning cached result for video: ${videoId}`);
        return res.json(existingData);
    }

    // Step 2: Fetch comments and analyze sentiment
    console.log(`Fetching comments for video: ${videoId}`);
    const comments = await fetchYouTubeComments(videoId);

    console.log(`Analyzing ${comments.length} comments...`);
    const analysis = await analyzeSentiment(comments);
    if (!analysis) return res.status(500).json({ error: "Sentiment analysis failed" });

    // Step 3: Directly use AI's structured response
    const { summary, most_helpful_comments, verdict, real_total_comments, comments_data } = analysis;

    // Step 4: Save new analysis to Supabase
    const { error: saveError } = await supabase
        .from('video_sentiment_summary')
        .upsert([
            {
                videoid: videoId,
                summary,
                most_helpful_comments,
                verdict,
                real_total_comments,
                comments_data
            }
        ], { onConflict: 'videoid' });

    if (saveError) {
        console.error("Error saving to Supabase:", saveError.message);
        return res.status(500).json({ error: "Failed to save analysis result." });
    }

    // Step 5: Return the structured AI-generated response
    res.json({ summary, most_helpful_comments, verdict, real_total_comments, comments_data });
});
// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

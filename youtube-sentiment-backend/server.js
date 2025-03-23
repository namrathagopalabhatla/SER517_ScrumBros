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
    return comments.slice(0, 100); // Limit to exactly 100 for analysis
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

    const prompt = `You are a sentiment analysis assistant. Classify each of the following YouTube comments into one of the following categories: "positive", "negative", or "neutral". Do not skip any comment. Return a summary at the end. 
    
Respond strictly in this JSON format:
{
  "positive": [ ... ],
  "negative": [ ... ],
  "neutral": [ ... ],
  "summary": "..."
}

Comments:
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

        // Parse content
        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
            console.error("No content returned from OpenAI.");
            return null;
        }

        // const cleaned = content.replace(/```json|```/g, '').trim();
        // return JSON.parse(cleaned);
        let cleanedJson;
        try {
            cleanedJson = jsonrepair(content);
            return JSON.parse(cleanedJson);
        } catch (repairError) {
            console.error("JSON Repair Failed:", repairError.message);
            return null;
        }

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
    const { videoId, autoRetry = false } = req.body;

    if (!videoId) return res.status(400).json({ error: "videoId is required" });

    // Step 1: Try to fetch existing sentiment analysis
    const { data: existingData, error: fetchError } = await supabase
        .from('video_sentiment_summary')
        .select('*')
        .eq('videoid', videoId)
        .single();

    if (existingData && !autoRetry) {
        console.log(`Returning cached result for video: ${videoId}`);
        return res.json(existingData);
    }

    // Step 2: Otherwise, analyze the comments
    console.log(`Fetching comments for video: ${videoId}`);
    const comments = await fetchYouTubeComments(videoId);

    console.log(`Analyzing ${comments.length} comments...`);
    const analysis = await analyzeSentiment(comments);
    if (!analysis) return res.status(500).json({ error: "Sentiment analysis failed" });

    const pos = analysis.positive?.length || 0;
    const neg = analysis.negative?.length || 0;
    const neutral = analysis.neutral?.length || 0;
    const totalAnalyzed = pos + neg + neutral;

    // Step 3: Compute verdict
    let verdict = 0;
    const posRatio = pos / totalAnalyzed;
    const negRatio = neg / totalAnalyzed;
    if (posRatio >= 0.6) verdict = 2;
    else if (posRatio >= 0.4) verdict = 1;
    else if (negRatio >= 0.6) verdict = -2;
    else if (negRatio >= 0.4) verdict = -1;

    const helpfulComments = [
    ...(Array.isArray(analysis.positive) ? analysis.positive.slice(0, 2) : []),
    ...(Array.isArray(analysis.neutral) ? analysis.neutral.slice(0, 2) : []),
    ...(Array.isArray(analysis.negative) && analysis.negative.length > 0 ? [analysis.negative[0]] : [])
].filter(Boolean).slice(0, 5);

    const realTotal = 3600; // You can make this dynamic later

    // Step 4: Save new analysis
    const { error: saveError } = await supabase
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
        ], { onConflict: 'videoid' });

    if (saveError) {
        console.error("Error saving to Supabase:", saveError.message);
        return res.status(500).json({ error: "Failed to save analysis result." });
    }

    // Step 5: Return newly generated data
    res.json({
        summary: analysis.summary,
        most_helpful_comments: helpfulComments,
        verdict: verdict,
        real_total_comments: realTotal,
        comments_data: [totalAnalyzed, pos, neutral, neg]
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

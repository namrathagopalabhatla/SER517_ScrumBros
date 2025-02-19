const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const OpenAI = require("openai");

dotenv.config();

const serviceAccount = require("./firebase-credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://console.firebase.google.com/project/ivory-cycle-451307-a0"
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
  });

// Function to fetch the comments from YouTube
async function fetchYouTubeComments(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}&maxResults=100`;

  try {
    const response = await axios.get(url);
    return response.data.items.map(item => item.snippet.topLevelComment.snippet.textOriginal);
  } catch (error) {
    console.error("Error while fetching YouTube comments:", error);
    return [];
  }
}

// Function to analyze the sentiments using OpenAI
async function analyzeSentiment(comments) {
    if (comments.length === 0) {
      return { positive: 0, negative: 0, neutral: 0, summary: "No comments analyzed" };
    }
  
    const limitedComments = comments.slice(0, 20); 
  
    const prompt = `Analyze the sentiment of these YouTube comments:\n\n${limitedComments.join("\n")}\n\nProvide the percentage of positive, negative, and neutral comments, along with a short summary in JSON format.`;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,  
      });
  
      console.log("OpenAI Response:", response.choices[0].message.content); 
  
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("Error analyzing the sentiment:", error);
      return { positive: 0, negative: 0, neutral: 0, summary: "Insufficient rate limit. Could not process your request" };
    }
  }
  
  
  

// API Endpoint to analyze the sentiment and store in Firestore
app.post("/analyze", async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: "Missing videoId" });

  // Fetch comments
  const comments = await fetchYouTubeComments(videoId);
  const sentiment = await analyzeSentiment(comments);

  let category = "neutral";
  if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
    category = "positive";
  } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
    category = "negative";
  }

  const analysisData = {
    videoId,
    category, // Overall sentiment category
    positive: sentiment.positive,
    negative: sentiment.negative,
    neutral: sentiment.neutral,
    summary: sentiment.summary,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // Saving data in Firestore 
    await db.collection("youtube_analysis").doc(videoId).set(analysisData);
    res.json({ success: true, message: "Analysis stored successfully", data: analysisData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint to retrieve the stored sentiment analysis
app.get("/get-analysis/:videoId", async (req, res) => {
  const { videoId } = req.params;

  try {
    const doc = await db.collection("youtube_analysis").doc(videoId).get();
    if (!doc.exists) return res.status(404).json({ error: "No analysis data found" });

    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

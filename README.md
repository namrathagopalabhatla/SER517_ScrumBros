# 📡 YouTube Sentiment Analysis – Backend

This is the backend for the **YouTube Sentiment Analyzer Chrome Extension**. It extracts comments from YouTube videos, performs sentiment classification using OpenAI, and stores results in Supabase. It also supports user authentication features (login, registration, email confirmation, password reset) via Supabase.

---

## ⚙️ Project Setup

### 🧱 1. Initialize Node Project
```bash
mkdir youtube-sentiment-backend
cd youtube-sentiment-backend
npm init -y
```

### 📦 2. Install Dependencies

Install required Node.js packages:

```bash
npm install express axios dotenv @supabase/supabase-js openai
```

### 🔐 3. Create .env File
Create a .env file in the root of your project and add the following keys:

```bash
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```
⚠️ Important: Never commit your .env file to version control.

🧠 Supabase Setup
📄 Create Sentiment Storage Table
Run the following SQL in your Supabase SQL Editor:

```bash
CREATE TABLE youtube_sentiment (
    videoID VARCHAR(20) PRIMARY KEY,
    positive_percentage FLOAT,
    negative_percentage FLOAT,
    neutral_percentage FLOAT,
    irrelevant_percentage FLOAT,
    scam_percentage FLOAT,
    summary TEXT
);
```
Make sure Supabase authentication is set up with email confirmation enabled if you're using auth features.

### 🚀 Run the Backend Server
Start the backend server using the following command:

```bash
node server.js
The backend will run on:


http://localhost:3000
```
### 🧪 API Testing
📤 Analyze a Video
Send a POST request to analyze a video by its YouTube video ID:

```bash
curl -X POST http://localhost:3000/analyze \
     -H "Content-Type: application/json" \
     -d '{"videoId": "7wWkGWXIshA"}'
```
### 📥 Retrieve Sentiment Results
Get stored sentiment results for a specific video:

```bash
curl http://localhost:3000/sentiment/7wWkGWXIshA
```
### 

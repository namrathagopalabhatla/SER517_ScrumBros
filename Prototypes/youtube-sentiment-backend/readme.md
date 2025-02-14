# YouTube Sentiment Analysis Backend Setup

## **Step 1: Set Up Project**
```sh
mkdir youtube-sentiment-backend
cd youtube-sentiment-backend
npm init -y 
```
## **Step 2: Install dependancies**
```sh
npm install express axios dotenv @supabase/supabase-js openai
```
## **Step 3: Create .env file**
```ini
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
PORT=3000
```

## **Step 4: Run following command in supbase project**
```sql
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

## **Step 5: Run the backend server**
```sh
node server.js
```

## Test the Setup
```sh
curl -X POST http://localhost:3000/analyze \
     -H "Content-Type: application/json" \
     -d '{"videoId": "7wWkGWXIshA"}'

```
```sh
curl http://localhost:3000/sentiment/7wWkGWXIshA
```
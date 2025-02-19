import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from flask import Flask, jsonify
import psycopg2
from flask_cors import CORS

# Download VADER if not available
nltk.download("vader_lexicon")

app = Flask(__name__)
CORS(app)

# Initialize Sentiment Analyzer
sia = SentimentIntensityAnalyzer()

# PostgreSQL Connection
conn = psycopg2.connect(
    dbname="youtube_analysis",
    user="postgres",
    password="1234",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()

# Function to Analyze Sentiment Using VADER
def analyze_sentiment_vader(comment):
    scores = sia.polarity_scores(comment)  # Get sentiment scores

    sentiment_score = scores["compound"]   # Overall sentiment polarity (-1 to 1)
    positive_score = scores["pos"]         # Positive score (0 to 1)
    negative_score = scores["neg"]         # Negative score (0 to 1)
    neutral_score = scores["neu"]          # Neutral score (0 to 1)

    # Classify sentiment based on compound score
    if sentiment_score >= 0.05:
        sentiment = "positive"
    elif sentiment_score <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    print(f"DEBUG: Comment = {comment}")  # Print comment for debugging
    print(f"DEBUG: Sentiment = {sentiment}, Scores = {sentiment_score}, {positive_score}, {negative_score}, {neutral_score}")

    return sentiment, sentiment_score, positive_score, negative_score, neutral_score

# API to Fetch & Analyze Sentiment
@app.route("/analyze", methods=["GET"])
def analyze_comments():
    cursor.execute("SELECT id, comment FROM youtube_comments WHERE sentiment IS NULL OR sentiment_score IS NULL")
    comments = cursor.fetchall()

    for comment in comments:
        comment_id = comment[0]
        comment = comment[1]

        # Analyze Sentiment
        sentiment, sentiment_score, positive_score, negative_score, neutral_score = analyze_sentiment_vader(comment)

        # Debugging Print
        print(f"Updating DB: ID={comment_id}, Sentiment={sentiment}, Sentiment Score={sentiment_score}, Pos={positive_score}, Neg={negative_score}, Neu={neutral_score}")

        # Update in Database
        cursor.execute("""
            UPDATE youtube_comments 
            SET sentiment = %s, sentiment_score = %s, positive_score = %s, 
                negative_score = %s, neutral_score = %s, processed_at = NOW()
            WHERE id = %s
        """, (sentiment, sentiment_score, positive_score, negative_score, neutral_score, comment_id))

        conn.commit()

    return jsonify({"message": "Sentiment analysis updated for comments"})

if __name__ == "__main__":
    app.run(debug=True)

import psycopg2
import requests
from textblob import TextBlob

# YouTube API Key and Video ID
API_KEY = "AIzaSyB4Ya0RZaRdq4cbQ9GUX4Cu8YRBWNWxdxQ"
VIDEO_ID = "CnEOLuCojY0"

# YouTube API URL
URL = f"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={VIDEO_ID}&key={API_KEY}&maxResults=100"

# Fetch comments from YouTube
response = requests.get(URL)
comments_data = response.json()

# Connect to PostgreSQL Database
conn = psycopg2.connect(
    dbname="youtube_analysis",
    user="postgres",
    password="1234",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()

# Function to insert comments into the database
def insert_comment(video_id, comment):
    cursor.execute("INSERT INTO youtube_comments (video_id, comment) VALUES (%s, %s)", (video_id, comment))
    conn.commit()

# Extract and store comments
for item in comments_data.get("items", []):
    comment = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
    insert_comment(VIDEO_ID, comment)

print("YouTube comments successfully stored in PostgreSQL.")


def analyze_sentiment(comment):
    analysis = TextBlob(comment)
    if analysis.sentiment.polarity > 0:
        return "positive"
    elif analysis.sentiment.polarity < 0:
        return "negative"
    else:
        return "neutral"

cursor.execute("SELECT id, comment FROM youtube_comments")
rows = cursor.fetchall()

for row in rows:
    sentiment = analyze_sentiment(row[1])
    cursor.execute("UPDATE youtube_comments SET sentiment = %s WHERE id = %s", (sentiment, row[0]))
    conn.commit()
# Close the connection
cursor.close()
conn.close()

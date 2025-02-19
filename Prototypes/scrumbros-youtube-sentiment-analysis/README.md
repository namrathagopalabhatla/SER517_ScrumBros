Steps to set up:
1. Clone the repository:
   git clone https://github.com/namrathagopalabhatla/SER517_ScrumBros.git
2. cd SER517_ScrumBros/Prototypes/scrumbros-youtube-sentiment-analysis
3. npm init -y
4. npm install express axios dotenv openai firebase-admin cors
5. Create a .env file and add the below lines to it:
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
FIREBASE_DATABASE_URL=YOUR_FIREBASE_DATABASE_URL
PORT=3000
6. Set up Firebase Firestore
Go to Firebase console, create a new project, and create a new firestore database. After that, generate a firebase admin SDK key. 
Once generated, download the json file and place it in the project folder.
7. Run the backend server: node server.js
8. Test the API Endpoints.

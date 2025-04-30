#  YouTube Sentiment Analysis

##  Chrome Extension with Deployed Backend

This project contains a Chrome Extension that performs sentiment analysis on YouTube comments using a backend API deployed on Render.

The extension allows users to analyze comments, view categorized sentiments, and optionally re-analyze using updated comments. User authentication, email verification, and password recovery are also supported.

---

##  Features

-  Sentiment analysis of YouTube comments
- User authentication (Register, Login, Forgot Password)
-  Email verification
- Comment reanalysis
- Backend hosted on Render

---

##  Installation Guide

### Prerequisites

- Google Chrome browser
- Internet connection (required to access the hosted backend API)

---

### Install the Chrome Extension Locally

1. Download or clone the repository 
2. Open Google Chrome and navigate to 
``` bash
chrome://extensions 
``` 
3. Enable developer mode
4. Click **Load Unpacked** and select the folder that contains the frontend extension files, which is the **ChromeExtension** folder
5. The extension should be loaded onto the browser toolbar
6. Once you load a YouTube video page, the option to sign up will show up.
7. Activation mail is sent to the user, once activated, user can login, a prompt to **Return to YouTube** will show up.
8. Once you return to YouTube video page, analysis would be available to the user.

### Backend API (Already deployed on Render)
- Base API URL
``` bash
https://ser517-scrumbros.onrender.com
```

- The extension communicates with the following APIs
``` bash
- POST /register - Register a new user
- POST /login - User login
- POST /verify-email - Email verification
- POST /analyze - Analyze YouTube comments
- POST /forgot-password & POST /reset-password - Password recovery
```


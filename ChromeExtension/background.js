chrome.runtime.onInstalled.addListener(() => {
    console.log("YouTube Comment Analyzer Extension Installed");
    
    // Check if user already has a token
    chrome.storage.local.get(['authToken'], function(result) {
        if (!result.authToken) {
            // Open auth page on install if not logged in
            chrome.tabs.create({ url: chrome.runtime.getURL('auth.html') });
        } else {
            console.log("User is already logged in with token: ", result.authToken.substring(0, 10) + "...");
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openAuthPage") {
        chrome.tabs.create({ url: chrome.runtime.getURL('auth.html') });
    }
});

// Handle toolbar icon click
chrome.action.onClicked.addListener((tab) => {
    // Check if we're on YouTube
    if (tab.url.includes('youtube.com')) {
        // Check auth status
        chrome.storage.local.get(['authToken'], function(result) {
            if (result.authToken) {
                // User is logged in, reload the page to refresh the analysis
                chrome.tabs.reload(tab.id);
            } else {
                // User is not logged in, open the auth page
                chrome.tabs.create({ url: chrome.runtime.getURL('auth.html') });
            }
        });
    } else {
        // Not on YouTube, just open the auth page
        chrome.tabs.create({ url: chrome.runtime.getURL('auth.html') });
    }
});
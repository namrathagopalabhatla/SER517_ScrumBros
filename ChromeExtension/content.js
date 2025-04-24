// Global state and variables
let comments_data = [100, 100, 0, 0]; // default data
let currentVideoId = null;
let authToken = null;
let currentInterval = null;
let isExtensionActive = true;
let isLoading = false; // New loading state flag

// Store video ID in sessionStorage for persistence across context invalidations
function saveCurrentVideoId(videoId) {
  try {
    sessionStorage.setItem('yt_analyzer_current_video', videoId);
  } catch (e) {
    console.log('Failed to save to sessionStorage:', e);
  }
}

// Retrieve video ID from sessionStorage
function getSavedVideoId() {
  try {
    return sessionStorage.getItem('yt_analyzer_current_video');
  } catch (e) {
    console.log('Failed to read from sessionStorage:', e);
    return null;
  }
}

// Immediately try to load auth token at script initialization
(function loadAuthToken() {
  try {
    chrome.storage.local.get(['authToken'], function(result) {
      if (result && result.authToken) {
        authToken = result.authToken;
        console.log('Auth token loaded successfully');
      }
    });
  } catch (e) {
    console.log('Failed to load auth token:', e);
  }
})();

// Load Chart.js dynamically
function loadChartJS(callback) {
  if (window.Chart) {
    callback();
    return;
  }
  
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("libs/chart.js");
    script.onload = function() {
      console.log("Chart.js loaded successfully.");
      callback();
    };
    script.onerror = function() {
      console.error("Failed to load Chart.js");
      callback(new Error("Failed to load Chart.js"));
    };
    document.head.appendChild(script);
  } catch (e) {
    console.error("Error loading Chart.js:", e);
    callback(e);
  }
}

// Get video ID from current URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

// Fetch comment analysis from API
async function fetchCommentAnalysis(videoId, forceRetry = false) {
  if (!authToken) {
    return {
      summary: "Please log in to view analysis", 
      verdict: 0, 
      totalComments: "No comments available", 
      mostHelpfulComments: []
    };
  }
  
  try {
    const response = await fetch("https://ser517-scrumbros.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ videoId, forceRetry }) // Added forceRetry flag
    });

    if (!response.ok) {
      throw new Error("Failed to fetch analysis");
    }

    const data = await response.json();
    console.log("Analysis data:", data);

    comments_data = data.comments_data.slice(1) || comments_data;
    return {
      summary: data.summary || "No analysis available", 
      verdict: data.verdict !== undefined && data.verdict !== null ? data.verdict : 0, 
      totalComments: data.real_total_comments || "No comments available", 
      mostHelpfulComments: data.most_helpful_comments || []
    };
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return {
      summary: "Error fetching analysis", 
      verdict: 0, 
      totalComments: "Error fetching comments", 
      mostHelpfulComments: []
    };
  }
}

// Open authentication page
function openAuthPage() {
  try {
    chrome.runtime.sendMessage({ action: "openAuthPage" });
  } catch (e) {
    console.error("Failed to send message to open auth page:", e);
    try {
      // Fallback: try to open auth page directly
      window.open(chrome.runtime.getURL('auth.html'), '_blank');
    } catch (e2) {
      console.error("Also failed to open auth page directly:", e2);
      // Last resort: tell user to click the extension icon
      alert("Please click on the YouTube Comment Analyzer extension icon to log in");
    }
  }
}

// Remove existing analyzer UI components
function removeExistingAnalyzer() {
  const container = document.querySelector('.yt-comment-analyzer-container');
  if (container) {
    container.remove();
  }
  const header = document.querySelector('.yt-comment-analyzer-header');
  if (header) {
    header.remove();
  }
}

// Show login prompt UI
function addLoginPrompt() {
  if (document.querySelector('.yt-comment-analyzer-container')) {
    return;
  }
  
  const commentsSection = document.querySelector('#comments');
  if (!commentsSection) {
    return false; // Signal UI couldn't be added
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'yt-comment-analyzer-header';

  const headerText = document.createElement('span');
  headerText.textContent = "Analysis Scoop";
  headerText.className = 'yt-comment-analyzer-headerText';

  const icon = document.createElement('img');
  try {
    icon.src = chrome.runtime.getURL("images/smeter.png");
  } catch (e) {
    console.log("Could not load icon", e);
    // Use a fallback icon or skip adding the icon
  }
  icon.style.width = "24px";
  icon.style.height = "24px";

  const extraText = document.createElement('span');
  extraText.textContent = "Your Comments, Our Insights!";
  extraText.className = 'yt-comment-analyzer-extraText';

  headerDiv.appendChild(headerText);
  headerDiv.appendChild(icon);
  headerDiv.appendChild(extraText);

  const containerDiv = document.createElement('div');
  containerDiv.className = 'yt-comment-analyzer-container';
  containerDiv.style.flexDirection = "column";
  containerDiv.style.alignItems = "center";
  containerDiv.style.justifyContent = "center";
  containerDiv.style.padding = "40px 20px";

  const loginText = document.createElement('p');
  loginText.textContent = "Please sign in to access comment analysis features";
  loginText.style.color = "#f1f1f1";
  loginText.style.fontSize = "16px";
  loginText.style.textAlign = "center";
  loginText.style.marginBottom = "20px";

  const loginBtn = document.createElement('button');
  loginBtn.textContent = "Sign In / Sign Up";
  loginBtn.className = 'yt-comment-analyzer-login-btn';
  loginBtn.addEventListener('click', openAuthPage);

  containerDiv.appendChild(loginText);
  containerDiv.appendChild(loginBtn);

  commentsSection.insertBefore(headerDiv, commentsSection.firstChild);
  commentsSection.insertBefore(containerDiv, commentsSection.firstChild.nextSibling);
  
  return true; // Signal UI was added successfully
}

// Force reload function to refresh analysis
async function forceReloadAnalysis() {
  const videoId = getVideoId();
  if (!videoId || !authToken) return;
  
  const container = document.querySelector('.yt-comment-analyzer-container');
  if (!container) return;
  
  // Show loading screen
  const loadingDiv = container.querySelector('.yt-comment-analyzer-loading');
  if (loadingDiv) {
    loadingDiv.style.display = "flex";
  } else {
    // Create loading div if it doesn't exist
    const newLoadingDiv = document.createElement('div');
    newLoadingDiv.className = 'yt-comment-analyzer-loading';
    newLoadingDiv.innerHTML = '<div class="loading-spinner"></div><span>Loading Analysis...</span>';
    container.appendChild(newLoadingDiv);
  }
  
  isLoading = true;
  
  // Hide other content while loading
  const leftDiv = container.querySelector('.yt-comment-analyzer-summary');
  const rightDiv = container.querySelector('.yt-comment-analyzer-chart');
  if (leftDiv) leftDiv.style.display = "none";
  if (rightDiv) rightDiv.style.display = "none";
  
  // Disable reload button while loading
  const reloadBtn = document.querySelector('.yt-comment-analyzer-reload-btn');
  if (reloadBtn) {
    reloadBtn.disabled = true;
  }
  
  // Fetch analysis with forceRetry flag
  try {
    const analysis = await fetchCommentAnalysis(videoId, true);
    
    // Update the UI directly with the received analysis data
    // Instead of rebuilding the entire UI which would trigger another fetch
    updateUIWithAnalysisData(analysis, loadingDiv, leftDiv, rightDiv);
  } catch (error) {
    console.error("Force reload failed:", error);
    // Return to normal view
    if (loadingDiv) loadingDiv.style.display = "none";
    if (leftDiv) leftDiv.style.display = "block";
    if (rightDiv) rightDiv.style.display = "block";
    
    // Re-enable reload button
    if (reloadBtn) {
      reloadBtn.disabled = false;
    }
    
    isLoading = false;
  }
}

// Function to update UI with analysis data without rebuilding
function updateUIWithAnalysisData(analysis, loadingDiv, leftDiv, rightDiv) {
  try {
    // Hide loading and show content
    if (loadingDiv) loadingDiv.style.display = "none";
    if (leftDiv) leftDiv.style.display = "block";
    if (rightDiv) rightDiv.style.display = "block";
    
    isLoading = false;
    
    // Update reload button state
    const reloadBtn = document.querySelector('.yt-comment-analyzer-reload-btn');
    if (reloadBtn) {
      reloadBtn.disabled = false;
    }
    
    // Update summary and total comments
    const summaryDiv = document.querySelector('.yt-comment-analyzer-summary-text');
    if (summaryDiv) {
      summaryDiv.textContent = `${analysis.summary}`;
    }
    
    const totalComments = document.querySelector('.yt-comment-analyzer-verdict span:last-child');
    if (totalComments) {
      totalComments.textContent = `(${analysis.totalComments} Comments)`;
    }
    
    // Update verdict and icon
    const verdictText = document.querySelector('.yt-comment-analyzer-verdict-text');
    const verdictIcon = document.querySelector('.yt-comment-analyzer-verdict img');
    
    if (verdictText && verdictIcon) {
      console.log("Verdict Type:", typeof analysis.verdict, "Verdict:", analysis.verdict);
      switch (analysis.verdict) {
        case -2:
          verdictText.textContent = "Mostly Negative";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/MostlyNegative.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
        case -1:
          verdictText.textContent = "Negative";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/Negative.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
        case 0:
          verdictText.textContent = "Neutral";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/Neutral.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
        case 1:
          verdictText.textContent = "Positive";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/Positive.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
        case 2:
          verdictText.textContent = "Mostly Positive";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/MostlyPositive.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
        default:
          console.warn("Unexpected verdict value:", `${analysis.verdict}`);
          verdictText.textContent = "Unknown";
          try {
            verdictIcon.src = chrome.runtime.getURL("images/Unknown.png");
          } catch (e) {
            console.log("Could not load verdict icon", e);
          }
          break;
      }
    }
    
    // Update helpful comments
    const helpfulCommentsDiv = document.querySelector('.yt-comment-analyzer-helpful-comments-container');
    if (helpfulCommentsDiv) {
      // Clear previous helpful comments
      helpfulCommentsDiv.innerHTML = '';
      
      analysis.mostHelpfulComments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.textContent = comment;
        commentElement.className = 'yt-comment-analyzer-helpful-comments';
        
        helpfulCommentsDiv.appendChild(commentElement);
      });
    }
    
    // Update chart data and re-render
    comments_data = analysis.comments_data ? (analysis.comments_data.slice(1) || comments_data) : comments_data;
    try {
      renderChart();
    } catch (e) {
      console.error("Error rendering chart:", e);
    }
  } catch (error) {
    console.error("Error updating UI with analysis data:", error);
    if (loadingDiv) loadingDiv.style.display = "none";
    if (leftDiv) leftDiv.style.display = "block";
    if (rightDiv) rightDiv.style.display = "block";
    isLoading = false;
  }
}

// Main function to render the analyzer UI
async function addAnalyzerContainer() {
  const textData = ["Analysis Scoop", "Your Comments, Our Insights!"];

  // Remove existing container if it's already there
  removeExistingAnalyzer();
  
  const commentsSection = document.querySelector('#comments');
  if (!commentsSection) {
    return false; // Signal UI couldn't be added
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'yt-comment-analyzer-header';

  const headerText = document.createElement('span');
  headerText.textContent = textData[0];
  headerText.className = 'yt-comment-analyzer-headerText';

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL("images/smeter.png");
  icon.style.width = "24px";
  icon.style.height = "24px";

  const extraText = document.createElement('span');
  extraText.textContent = textData[1];
  extraText.className = 'yt-comment-analyzer-extraText';
  
  const accountContainer = document.createElement('div');
  accountContainer.className = 'yt-comment-analyzer-account';
  
  // Add Force Reload button
  const reloadButton = document.createElement('button');
  reloadButton.className = 'yt-comment-analyzer-reload-btn';
  reloadButton.textContent = 'Force Reload';
  reloadButton.addEventListener('click', forceReloadAnalysis);
  reloadButton.disabled = isLoading; // Disable if currently loading
  accountContainer.appendChild(reloadButton);
  
  // Add Account button
  const accountButton = document.createElement('button');
  accountButton.className = 'yt-comment-analyzer-account-btn';
  accountButton.textContent = 'Account';
  accountButton.addEventListener('click', openAuthPage);
  accountContainer.appendChild(accountButton);

  headerDiv.appendChild(headerText);
  headerDiv.appendChild(icon);
  headerDiv.appendChild(extraText);
  headerDiv.appendChild(accountContainer);

  const containerDiv = document.createElement('div');
  containerDiv.className = 'yt-comment-analyzer-container';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'yt-comment-analyzer-loading';
  loadingDiv.innerHTML = '<div class="loading-spinner"></div><span>Loading Analysis...</span>';
  loadingDiv.style.display = isLoading ? "flex" : "none";
  containerDiv.appendChild(loadingDiv);

  const leftDiv = document.createElement('div');
  leftDiv.className = 'yt-comment-analyzer-summary';
  leftDiv.style.display = isLoading ? "none" : "block";

  const rightDiv = document.createElement('div');
  rightDiv.className = 'yt-comment-analyzer-chart';
  rightDiv.style.display = isLoading ? "none" : "block";

  const overviewText = document.createElement('span');
  overviewText.textContent = "Overview";
  overviewText.className = 'yt-comment-analyzer-overview';

  const verdictDiv = document.createElement('div');
  verdictDiv.className = 'yt-comment-analyzer-verdict';

  const verdictIcon = document.createElement('img');
  verdictIcon.style.marginRight = "10px";
  verdictIcon.style.width = "24px";
  verdictIcon.style.height = "24px";
  
  const verdictText = document.createElement('span');
  verdictText.className = 'yt-comment-analyzer-verdict-text';

  const total_Comments = document.createElement('span');
  total_Comments.style.fontSize = "10px";
  total_Comments.style.color = "#aaaaaa";
  
  verdictDiv.appendChild(verdictIcon);
  verdictDiv.appendChild(verdictText);
  verdictDiv.appendChild(total_Comments);

  const horizontalLine = document.createElement('hr');
  horizontalLine.style.border = "none";
  horizontalLine.style.borderTop = "0.6px solid #aaaaaa";
  horizontalLine.style.margin = "6px 0";

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'yt-comment-analyzer-summary-text';

  const helpfulReviewsText = document.createElement('div');
  helpfulReviewsText.textContent = "MOST HELPFUL COMMENTS";
  helpfulReviewsText.className = 'yt-comment-analyzer-most-helpful-reviews';

  const helpfulCommentsDiv = document.createElement('div');
  helpfulCommentsDiv.className = 'yt-comment-analyzer-helpful-comments-container';
  
  leftDiv.appendChild(overviewText);
  leftDiv.appendChild(verdictDiv);
  leftDiv.appendChild(horizontalLine);
  leftDiv.appendChild(summaryDiv);
  leftDiv.appendChild(helpfulReviewsText);
  leftDiv.appendChild(helpfulCommentsDiv);

  const chartCanvas = document.createElement("canvas");
  chartCanvas.id = "commentChart";
  rightDiv.appendChild(chartCanvas);

  containerDiv.appendChild(leftDiv);
  containerDiv.appendChild(rightDiv);
  commentsSection.insertBefore(headerDiv, commentsSection.firstChild);
  commentsSection.insertBefore(containerDiv, commentsSection.firstChild.nextSibling);

  const videoId = getVideoId();
  if (videoId) {
    // Update current video ID in memory and storage
    currentVideoId = videoId;
    saveCurrentVideoId(videoId);
    
    const loadChartAndAnalyze = async () => {
      try {
        loadChartJS(async function(err) {
          if (err) {
            loadingDiv.style.display = "none";
            summaryDiv.textContent = "Error loading chart library. Please refresh the page.";
            return;
          }
          
          if (!isLoading) {
            loadingDiv.style.display = "flex";
            leftDiv.style.display = "none";
            rightDiv.style.display = "none";
          }
          
          const analysis = await fetchCommentAnalysis(videoId);
          updateUIWithAnalysisData(analysis, loadingDiv, leftDiv, rightDiv);
        });
      } catch (e) {
        console.error("Error in loadChartAndAnalyze:", e);
        loadingDiv.style.display = "none";
        leftDiv.style.display = "block";
        rightDiv.style.display = "block";
        isLoading = false;
        summaryDiv.textContent = "Error loading analysis. Please refresh the page.";
      }
    };
    
    loadChartAndAnalyze();
  } else {
    summaryDiv.textContent = "Could not determine video ID.";
  }
  
  return true; // Signal UI was added successfully
}

// Render the pie chart
function renderChart() {
  if (!window.Chart) {
    console.error("Chart.js is not available.");
    return;
  }

  const chartCanvas = document.getElementById("commentChart");
  if (!chartCanvas) {
    console.error("Chart canvas element not found.");
    return;
  }

  const ctx = chartCanvas.getContext("2d");

  if (window.myChart) {
    window.myChart.destroy();
  }

  console.log("Rendering chart with data:", comments_data);
  
  let totalAnalyzed = comments_data.reduce((sum, value) => sum + value, 0);

  window.myChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [{
        data: comments_data,
        backgroundColor: ["#4CAF50", "#FFC107", "#F44336"],
        hoverOffset: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            color: "#ffffff",
            font: {
              size: 14
            },
            boxWidth: 30
          }
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `${tooltipItem.raw} (${((tooltipItem.raw / totalAnalyzed) * 100).toFixed(2)}%)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}

// Main function to check and update UI based on current state
function updateUI() {
  // Only proceed if the extension is active
  if (!isExtensionActive) {
    console.log("Extension not active, skipping UI update");
    return;
  }
  
  const videoId = getVideoId();
  if (!videoId) {
    console.log("No video ID found, skipping UI update");
    return;
  }
  
  console.log("Updating UI for video:", videoId);
  
  const savedVideoId = getSavedVideoId();
  const existingContainer = document.querySelector('.yt-comment-analyzer-container');
  
  const needsUpdate = 
    !existingContainer || // No container exists
    videoId !== currentVideoId || // Video has changed
    videoId !== savedVideoId; // Saved video is different
  
  if (needsUpdate) {
    console.log(`UI update needed. Current: ${currentVideoId}, New: ${videoId}, Saved: ${savedVideoId}`);
    
    currentVideoId = videoId;
    saveCurrentVideoId(videoId);
    
    if (authToken) {
      console.log("User is authenticated, adding analyzer container");
      addAnalyzerContainer();
    } else {
      try {
        chrome.storage.local.get(['authToken'], function(result) {
          if (result && result.authToken) {
            console.log("Retrieved auth token from storage");
            authToken = result.authToken;
            addAnalyzerContainer();
          } else {
            console.log("No auth token found, showing login prompt");
            addLoginPrompt();
          }
        });
      } catch (e) {
        console.log("Failed to check auth token:", e);
        addLoginPrompt();
      }
    }
  } else {
    console.log("No UI update needed");
  }
}

function setupContinuousChecks() {
  if (currentInterval) {
    clearInterval(currentInterval);
    console.log("Cleared existing check interval");
  }
  
  currentInterval = setInterval(() => {
    const commentsSection = document.querySelector('#comments');
    if (!commentsSection) {
      console.log("Comments section not found during continuous check");
      return;
    }
    
    const container = document.querySelector('.yt-comment-analyzer-container');
    if (!container) {
      console.log("Container not found, triggering UI update");
      updateUI();
      return;
    }
    
    const videoId = getVideoId();
    if (videoId && videoId !== currentVideoId) {
      console.log(`Video ID changed during continuous check: ${currentVideoId} -> ${videoId}`);
      updateUI();
    }
  }, 2000); // Check every 2 seconds
  
  setTimeout(() => {
    const checkPageReady = setInterval(() => {
      const commentsSection = document.querySelector('#comments');
      const container = document.querySelector('.yt-comment-analyzer-container');
      
      if (commentsSection && !container) {
        console.log("Comments found but no container during page ready check");
        updateUI();
        clearInterval(checkPageReady);
      }
    }, 500); // Check every 500ms
    
    setTimeout(() => {
      clearInterval(checkPageReady);
    }, 10000);
  }, 1000);
}

function setupStorageListener() {
  try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local' && changes.authToken) {
        authToken = changes.authToken.newValue;
        
        updateUI();
      }
    });
  } catch (e) {
    console.error("Error setting up storage listener:", e);
  }
}

function initExtension() {
  console.log("Initializing YouTube Comment Analyzer extension");
  isExtensionActive = true;
  
  const savedId = getSavedVideoId();
  if (savedId) {
    currentVideoId = savedId;
    console.log("Loaded saved video ID:", currentVideoId);
  }
  
  try {
    chrome.storage.local.get(['authToken'], function(result) {
      if (result && result.authToken) {
        authToken = result.authToken;
        console.log("Auth token loaded successfully");
      } else {
        console.log("No auth token found");
      }
      
      // Make sure UI is updated after auth check
      setTimeout(updateUI, 500);
    });
  } catch (e) {
    console.log("Failed to get auth token:", e);
    setTimeout(updateUI, 500);
  }
  
  setupContinuousChecks();
  
  setupStorageListener();
  
  setupYouTubeNavigation();
  
  window.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded - checking for comments section");
    setTimeout(checkForCommentsSection, 1000);
    setTimeout(checkForCommentsSection, 3000);
    setTimeout(checkForCommentsSection, 5000);
  });
}

function checkForCommentsSection() {
  const commentsSection = document.querySelector('#comments');
  if (commentsSection) {
    console.log("Comments section found, updating UI");
    updateUI();
  } else {
    console.log("Comments section not found yet");
  }
}

function setupYouTubeNavigation() {
  try {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      setTimeout(updateUI, 1000);
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      setTimeout(updateUI, 1000);
    };
    
    window.addEventListener('popstate', function() {
      setTimeout(updateUI, 1000);
    });
  } catch (e) {
    console.error("Error setting up history monitoring:", e);
  }
  
  let lastUrl = location.href;
  function checkForUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(updateUI, 1000);
    }
    if (isExtensionActive) {
      requestAnimationFrame(checkForUrlChange);
    }
  }
  checkForUrlChange();
  
  try {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        // If comments section is added or changed
        if (mutation.type === 'childList' && 
            (mutation.target.id === 'comments' || 
             [...mutation.addedNodes].some(node => 
               node.nodeType === 1 && (node.id === 'comments' || node.querySelector('#comments'))
             ))) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        setTimeout(updateUI, 1000);
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  } catch (e) {
    console.error("Error setting up mutation observer:", e);
  }
  
  window.addEventListener('load', function() {
    console.log("Page fully loaded - initializing UI");
    setTimeout(updateUI, 1500);
  });
}

function deactivateExtension() {
  isExtensionActive = false;
  if (currentInterval) {
    clearInterval(currentInterval);
  }
  removeExistingAnalyzer();
}

window.addEventListener('load', initExtension);

window.addEventListener('unload', deactivateExtension);
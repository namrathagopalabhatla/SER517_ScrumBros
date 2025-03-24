function loadChartJS(callback) {
  if (window.Chart) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("libs/chart.js");
  script.onload = function() {
    console.log("Chart.js loaded successfully.");
    callback();
  };
  script.onerror = function() {
    console.error("Failed to load Chart.js:", chrome.runtime.getURL("libs/chart.js"));
  };
  document.head.appendChild(script);
}

let comments_data = [100, 100, 0, 0]; // default data

async function fetchCommentAnalysis(videoId) {
  
  try {
    const response = await fetch("https://ser517-scrumbros.onrender.com/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ videoId })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch analysis");
    }

    const data = await response.json();
    console.log("Analysis data:", data);

    comments_data = data.comments_data.slice(1) || comments_data;
    return {summary: data.summary || "No analysis available", verdict: data.verdict || "No verdict available", totalComments: data.real_total_comments || "No comments available", mostHelpfulComments: data.most_helpful_comments || []};
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return {summary: "Error fetching analysis", verdict: "Error fetching verdict", totalComments: "Error fetching comments", mostHelpfulComments: []};
  }
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

async function addAnalyzerContainer() {
  
  const textData = ["ScrumBros Sentiment Scoop", "Your Comments, Our Insights!"];

  if (document.querySelector('.yt-comment-analyzer-container')) {
    return;
  }
  
  const commentsSection = document.querySelector('#comments');
  if (!commentsSection) {
    setTimeout(addAnalyzerContainer, 1000);
    return;
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

  headerDiv.appendChild(headerText);
  headerDiv.appendChild(icon);
  headerDiv.appendChild(extraText);

  const containerDiv = document.createElement('div');
  containerDiv.className = 'yt-comment-analyzer-container';

  const leftDiv = document.createElement('div');
  leftDiv.className = 'yt-comment-analyzer-summary';

  const rightDiv = document.createElement('div');
  rightDiv.className = 'yt-comment-analyzer-chart';

  const overviewText = document.createElement('span');
  overviewText.textContent = "Overview";
  overviewText.className = 'yt-comment-analyzer-overview';

  const verdictDiv = document.createElement('div');
  verdictDiv.className = 'yt-comment-analyzer-verdict';

  const verdictIcon = document.createElement('img');
  verdictIcon.style.marginRight = "10px";
  
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
  helpfulReviewsText.textContent = "MOST HELPFUL REVIEWS";
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
    loadChartJS(async function() {
      const analysis = await fetchCommentAnalysis(videoId);
      summaryDiv.textContent = `${analysis.summary}`;
      total_Comments.textContent = `(${analysis.totalComments} Comments)`;
      console.log("Stored verdict:", `${analysis.verdict}`);

      switch (Number(analysis.verdict)) {
        case -2:
          verdictText.textContent = "Mostly Negative";
          verdictIcon.src = chrome.runtime.getURL("images/MostlyNegative.png");
          break;
        case -1:
          verdictText.textContent = "Negative";
          verdictIcon.src = chrome.runtime.getURL("images/Negative.png");
          break;
        case 0:
          verdictText.textContent = "Neutral";
          verdictIcon.src = chrome.runtime.getURL("images/Neutral.png");
          break;
        case 1:
          verdictText.textContent = "Positive";
          verdictIcon.src = chrome.runtime.getURL("images/Positive.png");
          break;
        case 2:
          verdictText.textContent = "Mostly Positive";
          verdictIcon.src = chrome.runtime.getURL("images/MostlyPositive.png");
          break;
        default:
          console.warn("Unexpected verdict value:", `${analysis.verdict}`);
          verdictText.textContent = "Unknown";
          verdictIcon.src = chrome.runtime.getURL("images/Unknown.png");
          break;
      }

      analysis.mostHelpfulComments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.textContent = comment;
      commentElement.className = 'yt-comment-analyzer-helpful-comments';
      
      helpfulCommentsDiv.appendChild(commentElement);
      });

      renderChart();
    });
  } else {
    summaryDiv.textContent = "Could not determine video ID.";
  }
}

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
              return `${((tooltipItem.raw / totalAnalyzed) * 100).toFixed(2)}%`;
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

function waitForYouTubeUI() {
  if (document.querySelector('#comments')) {
    addAnalyzerContainer();
  } else {
    setTimeout(waitForYouTubeUI, 1000);
  }
}

window.addEventListener('load', function() {
  waitForYouTubeUI();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length && !document.querySelector('.yt-comment-analyzer-container')) {
        addAnalyzerContainer();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
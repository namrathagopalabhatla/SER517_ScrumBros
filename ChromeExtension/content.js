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

let comments_data = [100, 100, 0, 0]; // defalt data

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
    return data.summary || "No analysis available";
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return "Error fetching analysis";
  }
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

async function addAnalyzerContainer() {
  if (document.querySelector('.yt-comment-analyzer-container')) {
    return;
  }
  
  const commentsSection = document.querySelector('#comments');
  if (!commentsSection) {
    setTimeout(addAnalyzerContainer, 1000);
    return;
  }

  const containerDiv = document.createElement('div');
  containerDiv.className = 'yt-comment-analyzer-container';

  const leftDiv = document.createElement('div');
  leftDiv.className = 'yt-comment-analyzer-summary';

  const rightDiv = document.createElement('div');
  rightDiv.className = 'yt-comment-analyzer-chart';

  const chartCanvas = document.createElement("canvas");
  chartCanvas.id = "commentChart";
  rightDiv.appendChild(chartCanvas);

  containerDiv.appendChild(leftDiv);
  containerDiv.appendChild(rightDiv);
  commentsSection.insertBefore(containerDiv, commentsSection.firstChild);

  const videoId = getVideoId();
  if (videoId) {
    loadChartJS(async function() {
      const analysis = await fetchCommentAnalysis(videoId);
      leftDiv.textContent = `Comment Analysis: ${analysis}`;
      renderChart();
    });
  } else {
    leftDiv.textContent = "Could not determine video ID.";
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
        legend: { position: "bottom" }
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
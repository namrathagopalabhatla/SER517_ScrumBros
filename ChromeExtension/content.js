function insertSummaryBox() {
  const metaDataSection = document.querySelector("#above-the-fold");
  const commentSection = document.querySelector("#comments");

  if (!metaDataSection || !commentSection) return;

  const summaryBox = document.createElement("div");
  summaryBox.id = "comment-summary-box";
  summaryBox.style.marginTop = "20px";
  summaryBox.style.backgroundColor = "#181818"; // Dark background
  summaryBox.style.fontFamily = "Roboto, Arial, sans-serif";
  summaryBox.style.borderRadius = "12px";
  summaryBox.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.5)";
  summaryBox.style.color = "#fff"; // White text
  summaryBox.style.padding = "20px";
  summaryBox.style.display = "grid";
  summaryBox.style.gridTemplateColumns = "1fr 1fr";
  summaryBox.style.gap = "20px";

  // Header
  const header = document.createElement("h2");
  header.innerText = "ScrumBros Sentiment Scoop";
  header.style.gridColumn = "1 / 3";
  header.style.marginBottom = "10px";
  header.style.fontSize = "1.5em";
  summaryBox.appendChild(header);

  // Summary Text
  const summaryTextDiv = document.createElement("div");
  summaryTextDiv.style.gridColumn = "1 / 2";
  summaryTextDiv.style.display = "flex";
  summaryTextDiv.style.flexDirection = "column";
  summaryTextDiv.style.alignItems = "flex-start";

  const overallSentiment = document.createElement("div");
  overallSentiment.style.display = "flex";
  overallSentiment.style.alignItems = "center";
  overallSentiment.style.marginBottom = "10px";

  const sentimentIcon = document.createElement("span");
  sentimentIcon.innerText = "😊"; // Or any relevant icon
  sentimentIcon.style.fontSize = "1.5em";
  sentimentIcon.style.marginRight = "10px";

  const sentimentLabel = document.createElement("span");
  sentimentLabel.innerText = "Mostly Positive";
  sentimentLabel.style.fontSize = "1.2em";

  overallSentiment.appendChild(sentimentIcon);
  overallSentiment.appendChild(sentimentLabel);

  const summaryParagraph = document.createElement("p");
  summaryParagraph.innerText = "Most users found this video informative and entertaining.";
  summaryParagraph.style.fontSize = "1em";
  summaryParagraph.style.lineHeight = "1.6";

  summaryTextDiv.appendChild(overallSentiment);
  summaryTextDiv.appendChild(summaryParagraph);
  summaryBox.appendChild(summaryTextDiv);

  // Pie Chart Container
  const chartContainer = document.createElement("div");
  chartContainer.style.gridColumn = "2 / 3";
  chartContainer.style.display = "flex";
  chartContainer.style.justifyContent = "center";
  chartContainer.style.alignItems = "center";

  const sentimentChartCanvas = document.createElement("canvas");
  sentimentChartCanvas.id = "sentiment-pie-chart";
  sentimentChartCanvas.style.width = "200px";
  sentimentChartCanvas.style.height = "200px";

  chartContainer.appendChild(sentimentChartCanvas);
  summaryBox.appendChild(chartContainer);

  commentSection.parentNode.insertBefore(summaryBox, commentSection);
  fetchSummary();
}

function fetchSummary() {
  const videoUrl = window.location.href;
  // Mock API call
  setTimeout(() => {
    // Inject Chart.js if it's not already there (CORRECTED PLACEMENT)
    if (typeof Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('ChromeExtension/node_modules/chart.js/dist/chart.js');
      (document.head || document.documentElement).appendChild(script);
    }

    // Wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
      // Initialize pie chart for sentiment
      const ctx = document.getElementById('sentiment-pie-chart').getContext('2d');
      new Chart(ctx, {

        type: 'pie',
        
        data: {
        
        labels: ['Positive', 'Neutral', 'Negative'],
        
        datasets: [{
        
        label: 'Sentiment Distribution',
        
        data: [70, 20, 10], // mock data for sentiment distribution
        
        backgroundColor: ['#4caf50', '#ffeb3b', '#f44336'],
        
        }]
        
        },
        
        options: {
        
        responsive: true,
        
        plugins: {
        
        legend: {
        
        display: false,
        
        },
        
        tooltip: {
        
        enabled: true,
        
        }
        
        }
        
        }
        
        });
    });
  }, 1000);
}

window.addEventListener("load", insertSummaryBox);
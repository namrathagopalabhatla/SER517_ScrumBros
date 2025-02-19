function insertSummaryBox() {
  const metaDataSection = document.querySelector("#above-the-fold");
  const commentSection = document.querySelector("#comments");
  
  if (!metaDataSection || !commentSection) return;

  const summaryBox = document.createElement("div");
  summaryBox.id = "comment-summary-box";
  summaryBox.style.padding = "10px";
  summaryBox.style.border = "1px solid #ccc";
  summaryBox.style.marginTop = "10px";
  summaryBox.style.backgroundColor = "#f9f9f9";
  summaryBox.style.fontFamily = "Arial, sans-serif";
  summaryBox.style.borderRadius = "8px";
  summaryBox.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.1)";
  summaryBox.innerText = "Loading comment summary...";
  
  // Create the summary text
  const summaryText = document.createElement("p");
  summaryText.innerText = "Loading comment summary...";

  // Create canvas for the pie chart
  const sentimentChartContainer = document.createElement("canvas");
  sentimentChartContainer.id = "sentiment-pie-chart";
  sentimentChartContainer.style.width = "100%";
  sentimentChartContainer.style.height = "250px";

  summaryBox.appendChild(summaryText);
  summaryBox.appendChild(sentimentChartContainer);

  commentSection.parentNode.insertBefore(summaryBox, commentSection);
  fetchSummary();
}

function fetchSummary() {
  const videoUrl = window.location.href;
  // Mock API call
  setTimeout(() => {
      document.getElementById("comment-summary-box").innerText = 
          "Sentiment: Positive \nSummary: Most users found this video informative and entertaining.";
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
              position: 'top',
            },
            tooltip: {
              enabled: true,
            }
          }
        }
      });
  }, 2000);
}

window.addEventListener("load", insertSummaryBox);

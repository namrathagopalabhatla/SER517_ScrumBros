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
  
  commentSection.parentNode.insertBefore(summaryBox, commentSection);
  fetchSummary();
}

function fetchSummary() {
  const videoUrl = window.location.href;
  // Mock API call
  setTimeout(() => {
      document.getElementById("comment-summary-box").innerText = 
          "Sentiment: Positive \nSummary: Most users found this video informative and entertaining.";
  }, 2000);
}

window.addEventListener("load", insertSummaryBox);

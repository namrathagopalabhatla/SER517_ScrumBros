async function fetchScrumBrosAnalysis(videoId) {
  try {
    // const response = await fetch("https://ser517-scrumbros.onrender.com/analyze", {
      const response = await fetch("http://localhost:3000/analyze", {
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

async function addScrumBrosContainer() {
  const commentsSection = document.querySelector('#comments');
  
  if (commentsSection && !document.querySelector('.scrum-bros-container')) {
    const containerDiv = document.createElement('div');
    containerDiv.className = 'scrum-bros-container';
    containerDiv.style.padding = "20px";
    containerDiv.style.border = "1px solid #ccc";
    containerDiv.style.borderRadius = "8px";
    containerDiv.style.backgroundColor = "#f9f9f9";
    containerDiv.style.marginBottom = "10px";
    containerDiv.style.fontSize = "14px";
    containerDiv.style.fontFamily = "Arial, sans-serif";
    containerDiv.style.display = "flex";
    containerDiv.style.flexDirection = "row";
    containerDiv.style.justifyContent = "space-between";
    
    const leftDiv = document.createElement('div');
    leftDiv.className = 'scrum-bros-left';
    leftDiv.style.width = "48%";
    leftDiv.style.border = "1px solid #ddd";
    leftDiv.style.padding = "10px";
    leftDiv.style.borderRadius = "8px";
    leftDiv.style.backgroundColor = "#fff";
    
    const rightDiv = document.createElement('div');
    rightDiv.className = 'scrum-bros-right';
    rightDiv.style.width = "48%";
    rightDiv.style.border = "1px solid #ddd";
    rightDiv.style.padding = "10px";
    rightDiv.style.borderRadius = "8px";
    rightDiv.style.backgroundColor = "#fff";
    
    containerDiv.appendChild(leftDiv);
    containerDiv.appendChild(rightDiv);
    commentsSection.insertBefore(containerDiv, commentsSection.firstChild);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      addScrumBrosContainer();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

addScrumBrosContainer();

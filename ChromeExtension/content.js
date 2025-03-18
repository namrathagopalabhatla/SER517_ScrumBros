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

async function addScrumBrosMessage() {
  const commentsSection = document.querySelector('#comments');
  
  if (commentsSection && !document.querySelector('.scrum-bros-message')) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'scrum-bros-message';
    messageDiv.style.padding = "10px";
    messageDiv.style.border = "1px solid #ccc";
    messageDiv.style.borderRadius = "8px";
    messageDiv.style.backgroundColor = "#f9f9f9";
    messageDiv.style.marginBottom = "10px";
    messageDiv.style.fontSize = "14px";
    messageDiv.style.fontFamily = "Arial, sans-serif";

    messageDiv.textContent = "Fetching Scrum Bro's analysis...";
    commentsSection.insertBefore(messageDiv, commentsSection.firstChild);

    const videoId = getVideoId();
    if (videoId) {
      const analysis = await fetchScrumBrosAnalysis(videoId);
      messageDiv.textContent = `Scrum Bro's Analysis: ${analysis}`;
    } else {
      messageDiv.textContent = "Could not determine video ID.";
    }
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      addScrumBrosMessage();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

addScrumBrosMessage();

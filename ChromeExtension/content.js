function addScrumBrosMessage() {
  const commentsSection = document.querySelector('#comments');
  
  if (commentsSection) {
    if (!document.querySelector('.scrum-bros-message')) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'scrum-bros-message';
      messageDiv.textContent = "Hello, we are Scrum Bro's";

      commentsSection.insertBefore(messageDiv, commentsSection.firstChild);
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

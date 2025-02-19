document.addEventListener("DOMContentLoaded", () => {
    fetch("http://localhost:5000/comments")
    .then(response => response.json())
    .then(data => {
        const commentsList = document.getElementById("commentsList");
        data.forEach(comment => {
            let listItem = document.createElement("li");
            listItem.textContent = `${comment[2]} - Sentiment: ${comment[3]}`;
            commentsList.appendChild(listItem);
        });
    })
    .catch(error => console.error("Error fetching comments:", error));
});

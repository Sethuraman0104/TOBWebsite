// --------------------
// Admin Panel JS
// --------------------

// Post News Form
const postNewsForm = document.getElementById('postNewsForm');
const postNewsMsg = document.getElementById('postNewsMsg');

postNewsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(postNewsForm);

  try {
    const res = await fetch('/api/news/create', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    postNewsMsg.textContent = data.message || 'News posted!';
    postNewsForm.reset();
    loadPendingNews();
  } catch (err) {
    postNewsMsg.textContent = 'Error: ' + err.message;
  }
});

// Load Pending News
// Load Pending News with likes & comment counts
async function loadPendingNews() {
  const container = document.getElementById('pendingNewsContainer');
  try {
    const res = await fetch('/api/news/admin'); // use admin route
    const news = await res.json();
    const pending = news.filter(n => !n.IsApproved); // only unapproved

    container.innerHTML = pending.length ? pending.map(n => `
      <div class="news-card">
        ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}"/>` : ''}
        <h3>${n.Title}</h3>
        <p>${n.Content.substring(0, 150)}...</p>
        <p>👍 Likes: ${n.LikesCount} | 💬 Comments: ${n.CommentsCount}</p>
        <button onclick="approveNews(${n.ArticleID})">Approve</button>
      </div>
    `).join('') : '<p>No pending news.</p>';
  } catch (err) {
    container.textContent = 'Error loading news: ' + err.message;
  }
}

async function loadAllNewsEngagement() {
  const container = document.getElementById('allNewsEngagement');
  try {
    const res = await fetch('/api/news/admin');
    const news = await res.json();

    container.innerHTML = news.length ? news.map(n => `
      <div class="news-card">
        <h3>${n.Title}</h3>
        <p>👍 Likes: ${n.LikesCount} | 💬 Comments: ${n.CommentsCount}</p>
        <p>Status: ${n.IsApproved ? 'Approved ✅' : 'Pending ⏳'}</p>
      </div>
    `).join('') : '<p>No news articles found.</p>';
  } catch (err) {
    container.textContent = 'Error loading news: ' + err.message;
  }
}

// Call this function on load
loadAllNewsEngagement();


// Approve News
async function approveNews(articleID) {
  try {
    const res = await fetch(`/api/news/approve/${articleID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? 'News approved!' : 'Error');
    loadPendingNews();
    loadPendingComments(); // refresh comments as well
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Load Pending Comments
async function loadPendingComments() {
  const container = document.getElementById('pendingCommentsContainer');
  try {
    const res = await fetch('/api/comments/pending'); // create this route later
    const comments = await res.json();
    container.innerHTML = comments.length ? comments.map(c => `
      <div class="news-card">
        <p><strong>User ${c.UserID}:</strong> ${c.CommentText}</p>
        <button onclick="approveComment(${c.CommentID})">Approve Comment</button>
      </div>
    `).join('') : '<p>No pending comments.</p>';
  } catch (err) {
    container.textContent = 'Error loading comments: ' + err.message;
  }
}

// Approve Comment
async function approveComment(commentID) {
  try {
    const res = await fetch(`/api/comments/approve/${commentID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? 'Comment approved!' : 'Error');
    loadPendingComments();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Initial load
loadPendingNews();
loadPendingComments();

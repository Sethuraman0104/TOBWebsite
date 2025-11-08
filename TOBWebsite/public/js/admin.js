// --------------------
// Admin Panel JS
// --------------------

const postNewsForm = document.getElementById('postNewsForm');
const postNewsMsg = document.getElementById('postNewsMsg');
const pendingNewsContainer = document.getElementById('pendingNewsContainer');
const pendingCommentsContainer = document.getElementById('pendingCommentsContainer');
const allNewsEngagementContainer = document.getElementById('allNewsEngagement');
const filterMonthInput = document.getElementById('filterMonth'); // optional date filter input
const applyFilterBtn = document.getElementById('applyFilter');

// --------------------
// Global create news submit
// --------------------
async function postNewsFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(postNewsForm);
  try {
    const res = await fetch('/api/news/create', { method: 'POST', body: formData });
    const data = await res.json();
    postNewsMsg.textContent = data.message || 'News posted!';
    postNewsForm.reset();
    await loadPendingNews();
    await loadAllNewsEngagement(moment().format('YYYY-MM'));
  } catch (err) {
    postNewsMsg.textContent = 'Error: ' + err.message;
  }
}

postNewsForm.onsubmit = postNewsFormSubmit;

// --------------------
// Load Pending News
// --------------------
async function loadPendingNews() {
  try {
    const res = await fetch('/api/news/admin');
    const news = await res.json();
    const pending = news.filter(n => !n.IsApproved);

    pendingNewsContainer.innerHTML = pending.length
      ? pending.map(n => `
        <div class="news-card">
          ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}"/>` : ''}
          <h3>${n.Title}</h3>
          <p>${n.Content.substring(0, 150)}...</p>
          <p>👍 ${n.LikesCount} | 💬 ${n.CommentsCount}</p>
          <button onclick="approveNews(${n.ArticleID})">Approve</button>
        </div>
      `).join('')
      : '<p>No pending news.</p>';
  } catch (err) {
    pendingNewsContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Load All Published News with optional month filter
// --------------------
async function loadAllNewsEngagement(filterMonthValue = null) {
  try {
    const res = await fetch('/api/news/admin');
    const news = await res.json();
    let filteredNews = news.filter(n => n.IsApproved);

    if (filterMonthValue) {
      filteredNews = filteredNews.filter(n => {
        const date = new Date(n.PublishedOn);
        const [year, month] = filterMonthValue.split('-');
        return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
      });
    }

    allNewsEngagementContainer.innerHTML = filteredNews.length
      ? filteredNews.map(n => `
        <div class="news-card">
          <h3>${n.Title}</h3>
          <p>Published On: ${new Date(n.PublishedOn).toLocaleDateString()}</p>
          <p>👍 Likes: ${n.LikesCount} | 💬 Comments: ${n.CommentsCount}</p>
          <button onclick="editNews(${n.ArticleID})">Edit</button>
          <button onclick="deleteNews(${n.ArticleID})">Delete</button>
        </div>
      `).join('')
      : '<p>No news articles for selected month.</p>';
  } catch (err) {
    allNewsEngagementContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Delete News
// --------------------
async function deleteNews(articleID) {
  if (!confirm('Are you sure you want to delete this news?')) return;
  try {
    const res = await fetch(`/api/news/${articleID}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    await loadPendingNews();
    await loadAllNewsEngagement(moment().format('YYYY-MM'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --------------------
// Approve News
// --------------------
async function approveNews(articleID) {
  try {
    const res = await fetch(`/api/news/approve/${articleID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? 'News approved!' : 'Error');
    await loadPendingNews();
    await loadAllNewsEngagement(moment().format('YYYY-MM'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --------------------
// Edit News
// --------------------
async function editNews(articleID) {
  try {
    const res = await fetch('/api/news/admin');
    const news = await res.json();
    const article = news.find(n => n.ArticleID === articleID);
    if (!article) return alert('News not found');

    postNewsForm.Title.value = article.Title;
    postNewsForm.Title_Ar.value = article.Title_Ar || '';
    postNewsForm.Content.value = article.Content;
    postNewsForm.Content_Ar.value = article.Content_Ar || '';
    postNewsForm.CategoryID.value = article.CategoryID || 1;

    postNewsForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(postNewsForm);
      try {
        const res = await fetch(`/api/news/${articleID}`, { method: 'PUT', body: formData });
        const data = await res.json();
        alert(data.message);
        postNewsForm.reset();
        postNewsForm.onsubmit = postNewsFormSubmit; // restore create handler
        await loadPendingNews();
        await loadAllNewsEngagement(moment().format('YYYY-MM'));
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --------------------
// Load Pending Comments
// --------------------
async function loadPendingComments() {
  try {
    const res = await fetch('/api/comments/pending');
    const comments = await res.json();

    pendingCommentsContainer.innerHTML = comments.length
      ? comments.map(c => `
        <div class="news-card">
          <p><strong>User ${c.UserID}:</strong> ${c.CommentText}</p>
          <button onclick="approveComment(${c.CommentID})">Approve Comment</button>
        </div>
      `).join('')
      : '<p>No pending comments.</p>';
  } catch (err) {
    pendingCommentsContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Approve Comment
// --------------------
async function approveComment(commentID) {
  try {
    const res = await fetch(`/api/comments/approve/${commentID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? 'Comment approved!' : 'Error');
    await loadPendingComments();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --------------------
// Apply Month Filter
// --------------------
if (applyFilterBtn && filterMonthInput) {
  applyFilterBtn.addEventListener('click', async () => {
    const month = filterMonthInput.value;
    await loadAllNewsEngagement(month || moment().format('YYYY-MM'));
  });
}

// --------------------
// Initial Load
// --------------------
loadPendingNews();
loadAllNewsEngagement(moment().format('YYYY-MM'));
loadPendingComments();

// --------------------
// Sidebar Menu Navigation
// --------------------
const menuItems = document.querySelectorAll('.sidebar .menu li');
const sections = document.querySelectorAll('.section');

menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    const section = document.getElementById(item.dataset.section);
    section.classList.add('active');
  });
});

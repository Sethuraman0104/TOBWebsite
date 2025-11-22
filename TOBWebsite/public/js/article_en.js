// Get articleId from URL query ?id=12
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('id');
document.getElementById('articleId').value = articleId;

const SITE = {
    logoPath: 'images/TOBLOGO.jpg',
    mapLat: 26.2285,
    mapLng: 50.5857
};

// 🕒 Live Date & Time
function updateDateTime() {
    const now = new Date();

    // Format date as: Mon, 11 Nov 2025
    const date = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Format time as: 10:25:34 AM (12-hour with AM/PM)
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    document.getElementById('currentDateTime').textContent = date;
    document.getElementById('currentTimeSmall').textContent = time;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ---------- LANGUAGE SWITCH ----------
document.getElementById('langToggle').addEventListener('click', () => {
    const isEnglish = document.documentElement.lang === 'en';
    if (isEnglish) {
        window.location.href = 'index_ar.html';
    } else {
        window.location.href = 'index_en.html';
    }
});

// 🌍 Detect User Location (via free API)
async function getUserLocation() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        document.getElementById('userLocation').innerText = `${data.city}, ${data.country_name}`;
    } catch {
        document.getElementById('userLocation').innerText = "Location unavailable";
    }
}
getUserLocation();

// 🌤️ Free Weather API (Open-Meteo)
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.22&longitude=50.58&current=temperature_2m,weathercode');
        const data = await res.json();
        const temp = data?.current?.temperature_2m ?? '--';
        document.getElementById('weatherTemp').textContent = `${temp}°C`;

        // Basic condition mapping
        const weatherCodes = {
            0: 'Clear Sky ☀️',
            1: 'Mainly Clear 🌤️',
            2: 'Partly Cloudy ⛅',
            3: 'Cloudy ☁️',
            45: 'Fog 🌫️',
            61: 'Light Rain 🌦️',
            63: 'Moderate Rain 🌧️',
            80: 'Showers 🌦️',
        };
        const code = data?.current?.weathercode ?? 0;
        document.getElementById('weatherText').textContent = weatherCodes[code] || 'Clear';
    } catch (err) {
        document.getElementById('weatherText').textContent = 'Unavailable';
    }
}
fetchWeather();

async function loadTrends() {
    const stripInner = document.getElementById('trendsStripInnerCD');
    stripInner.innerHTML = '<div class="muted-small">Loading trends...</div>';

    try {
        const res = await fetch(`/api/trends`, { cache: 'no-store' });
        const data = await res.json();
        const trends = Array.isArray(data) ? data : (data.success ? data.data : []);

        if (!trends.length) {
            stripInner.innerHTML = '<div class="muted-small">No active trends found</div>';
            return;
        }

        stripInner.innerHTML = '';
        const fragment = document.createDocumentFragment();

        trends.slice(0, 10).forEach(t => {
            const img = t.ImageURL || '/images/default-trend.jpg';
            const title = t.TrendTitle_EN || "Trend";
            const link = t.TrendLink || '#';
            const a = document.createElement('a');
            a.className = 'trend-item text-decoration-none text-reset';
            a.href = link;
            a.innerHTML = `<img src="${img}" alt="${title}" style='margin-right: 2px;margin-left: 5px;' onerror="this.src='/images/default-trend.jpg';" />
                     <div><small>${title}</small></div>`;
            fragment.appendChild(a);
        });

        // Duplicate content for seamless scroll
        stripInner.appendChild(fragment.cloneNode(true));
        stripInner.appendChild(fragment);

    } catch (err) {
        stripInner.innerHTML = '<div class="text-danger">⚠️ Error loading trends</div>';
        console.error('loadTrends error:', err);
    }
}

async function loadTrendsTicker() {
    const tickerInner = document.getElementById('trendsTickerInner');

    tickerInner.innerHTML = 'Loading trends...';

    try {
        const res = await fetch('/api/trends', { cache: 'no-store' });
        const data = await res.json();
        const trends = Array.isArray(data) ? data : (data.success ? data.data : []);

        if (!trends.length) {
            tickerInner.innerHTML = 'No active trends';
            return;
        }

        // ----------------------
        // 1️⃣ Ticker
        // ----------------------
        tickerInner.innerHTML = '';
        const tickerFragment = document.createDocumentFragment();

        trends.forEach(t => {
            const img = t.ImageURL || '/images/default-trend.jpg';
            const title = t.TrendTitle_EN || 'Trend';
            const link = t.TrendLink || '#';

            const a = document.createElement('a');
            a.className = 'trend-item';
            a.href = link;
            a.innerHTML = `
        <img src="${img}" alt="${title}" style='margin-left:10px;' onerror="this.src='/images/default-trend.jpg';" />
        <div><small>${title}</small></div>
      `;
            tickerFragment.appendChild(a);
        });

        tickerInner.appendChild(tickerFragment);
        tickerInner.appendChild(tickerFragment.cloneNode(true)); // seamless scroll
    } catch (err) {
        tickerInner.innerHTML = 'Error loading trends';
        console.error(err);
    }
}
// Initialize
document.addEventListener('DOMContentLoaded', loadTrendsTicker);

// Load article
// async function loadArticle() {
//     try {
//         const res = await fetch(`/api/news/${articleId}`);
//         const result = await res.json();

//         const container = document.getElementById('articleContainer');

//         if (result.success && result.data && result.data.IsActive && result.data.IsApproved) {
//             const n = result.data;
//             container.innerHTML = `
//   <h1>${n.Title}</h1>
//   <p class="text-muted">Published on ${formatDateTime(n.PublishedOn)}</p>
//   ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}" class="img-fluid mb-3">` : ''}
//   <div>${n.Content}</div>

//   <div class="mt-4 d-flex align-items-center gap-3">
//     <button id="likeBtn" class="btn btn-outline-danger"><i class="fa-solid fa-heart"></i> Like</button>
//     <span id="likeCount" class="text-muted small">Loading likes...</span>
//   </div>
// `;
//             loadLikes();
//         } else {
//             container.innerHTML = '<p class="text-muted">This article is not available.</p>';
//         }
//     } catch (err) {
//         console.error(err);
//         document.getElementById('articleContainer').innerHTML = '<p class="text-danger">Failed to load article.</p>';
//     }
// }

// Load article
async function loadArticle() {
    try {
        const res = await fetch(`/api/news/${articleId}`);
        const result = await res.json();

        const container = document.getElementById('articleContainer');

        if (result.success && result.data && result.data.IsActive && result.data.IsApproved) {

            const n = result.data;

            container.innerHTML = `
                <!-- ARTICLE HEADER -->
                <div class="article-header">
                    <div class="article-title-wrapper">
                        <i class="fa-solid fa-newspaper article-icon"></i>
                        <h1 class="article-title">${n.Title}</h1>
                    </div>
                    <p class="article-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${formatDateTime(n.PublishedOn)}
                    </p>
                </div>

                <!-- FEATURED IMAGE -->
                ${n.ImageURL ? `
                <div class="article-image-box">
                    <img src="${n.ImageURL}" alt="${n.Title}" class="article-image">
                </div>` : ''}

                <!-- MAIN CONTENT -->
                <div class="article-content">
                    ${n.Content}
                </div>

                <!-- ACTIONS -->
                <div class="article-actions">
                    <button id="likeBtn" class="like-btn">
                        <i class="fa-solid fa-heart"></i> Like
                    </button>
                    <span id="likeCount" class="like-count">Loading likes...</span>
                </div>
            `;

            // Load Likes
            loadLikes();

        } else {
            container.innerHTML = `
                <p class="text-muted">This article is not available.</p>
            `;
        }

    } catch (err) {
        console.error(err);
        document.getElementById('articleContainer').innerHTML =
            '<p class="text-danger">Failed to load article.</p>';
    }
}

let otherNewsPage = 0;
const pageSize = 8;
let isLoadingNews = false;
let allNewsLoaded = false;

const container = document.querySelector('#otherNewsContainer');
container.innerHTML = '';   // clear previous content
otherNewsPage = 0;          // reset page
allNewsLoaded = false;      // reset flag

// Keep track of already loaded article IDs to prevent duplicates
const loadedArticleIds = new Set();

async function loadOtherNewsGrid() {
    if (isLoadingNews || allNewsLoaded) return;
    isLoadingNews = true;
    document.getElementById('newsLoader').style.display = 'block';

    try {
        const res = await fetch(`/api/news/admin?skip=${otherNewsPage * pageSize}&take=${pageSize}`);
        const news = await res.json();

        const otherNews = (Array.isArray(news) ? news : [])
            .filter(n => n.IsActive && n.IsApproved && n.ArticleID != articleId && !loadedArticleIds.has(n.ArticleID));

        if (!otherNews.length) {
            allNewsLoaded = true;
            return;
        }

        const fragment = document.createDocumentFragment();

        otherNews.forEach((n, i) => {
            loadedArticleIds.add(n.ArticleID);  // mark as loaded

            const img = n.ImageURL || '/images/default-news.jpg';
            const item = document.createElement('div');
            item.className = 'other-news-item';
            item.innerHTML = `
                <div class="other-news-card">
                    <img data-src="${img}" alt="${n.Title}" class="lazy-image" onerror="this.src='/images/default-news.jpg'">
                    <div class="overlay">
                        <div class="title">${n.Title}</div>
                        <a href="article_en.html?id=${n.ArticleID}" class="btn-read">Read More</a>
                    </div>
                </div>
            `;
            fragment.appendChild(item);
        });

        container.appendChild(fragment);

        // Lazy load images
        container.querySelectorAll('.lazy-image').forEach(img => {
            if (img.dataset.src && !img.src) img.src = img.dataset.src;
        });

        // Animate cards with staggered delay
        container.querySelectorAll('.other-news-item:not(.show)').forEach((el, i) => {
            setTimeout(() => el.classList.add('show'), i * 100);
        });

        otherNewsPage++;
    } catch (err) {
        console.error(err);
    } finally {
        isLoadingNews = false;
        document.getElementById('newsLoader').style.display = 'none';
    }
}

// Infinite scroll
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 300)) {
        loadOtherNewsGrid();
    }
});

// Initial load
loadOtherNewsGrid();

async function loadFooterCategories() {
    const container = document.getElementById('footerCategories');
    container.innerHTML = '<li>Loading categories...</li>';
    try {
        const res = await fetch('/api/news/categories/admin', { cache: 'no-store' });
        const categories = await res.json();
        if (!categories.length) {
            container.innerHTML = '<li>No categories</li>';
            return;
        }
        container.innerHTML = '';
        categories.forEach(cat => {
            const safeId = encodeURIComponent(cat.CategoryName);
            const li = document.createElement('li');
            li.className = "footer-category-link";
            li.innerHTML = `
    <a href="TOBHome.html#${safeId}" class="footer-category-link-item">
      <i class="fa-solid fa-angle-right me-1"></i>${cat.CategoryName}
    </a>`;
            container.appendChild(li);
        });

    } catch {
        container.innerHTML = '<li>Error loading</li>';
    }
}
function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    return d.toLocaleString('en-US', options);
}
// Submit new comment
document.getElementById('commentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        articleId: document.getElementById('articleId').value,
        name: document.getElementById('commentName').value,
        email: document.getElementById('commentEmail').value,
        content: document.getElementById('commentContent').value,
        parentCommentId: null
    };

    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('commentForm').reset();
            loadComments();
        }
        alert(result.message);
    } catch (err) {
        console.error(err);
        alert('Error submitting comment');
    }
});

async function loadComments() {
    try {
        const articleId = document.getElementById('articleId').value;
        const res = await fetch(`/api/comments/${articleId}`);
        const comments = await res.json();

        const container = document.getElementById('commentsContainer');
        if (!comments.length) {
            container.innerHTML = '<p class="text-muted">No comments yet.</p>';
            return;
        }

        // Build hierarchical tree
        const commentMap = {};
        comments.forEach(c => (commentMap[c.CommentID] = { ...c, Replies: [] }));
        const rootComments = [];

        comments.forEach(c => {
            if (c.ParentCommentID) {
                commentMap[c.ParentCommentID]?.Replies.push(commentMap[c.CommentID]);
            } else {
                rootComments.push(commentMap[c.CommentID]);
            }
        });

        // Render recursively
        container.innerHTML = renderCommentsRecursive(rootComments);
    } catch (err) {
        console.error(err);
        document.getElementById('commentsContainer').innerHTML =
            '<p class="text-danger">Failed to load comments.</p>';
    }
}
function renderCommentsRecursive(comments) {
    return comments
        .map(c => `
      <div class="comment-card mb-3" id="comment-${c.CommentID}">
        <div class="comment-header d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(c.Name)}</strong>
            <small class="text-muted">• ${formatDateTime(c.CreatedOn)}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary reply-btn" data-commentid="${c.CommentID}">
            <i class="fa fa-reply"></i> Reply
          </button>
        </div>
        <div class="comment-body mt-2">
          <p>${escapeHtml(c.Content)}</p>
        </div>
        <div class="reply-box mt-2 p-2 bg-light rounded" id="replyBox-${c.CommentID}" style="display:none;">
          <input type="text" class="form-control mb-2" placeholder="Your Name" id="replyName-${c.CommentID}">
          <textarea class="form-control mb-2" rows="3" placeholder="Your Reply" id="replyContent-${c.CommentID}"></textarea>
          <button class="btn btn-sm btn-success send-reply-btn" data-parentid="${c.CommentID}">Post Reply</button>
        </div>
        ${c.Replies && c.Replies.length
                ? `<div class="replies ms-4 mt-3 border-start ps-3">
                ${renderCommentsRecursive(c.Replies)}
               </div>`
                : ''
            }
      </div>
    `)
        .join('');
}
// Escape HTML to prevent injection
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
// Reply button & submit reply
document.addEventListener('click', async e => {
    if (e.target.closest('.reply-btn')) {
        const id = e.target.closest('.reply-btn').dataset.commentid;
        const box = document.getElementById(`replyBox-${id}`);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    if (e.target.closest('.send-reply-btn')) {
        const btn = e.target.closest('.send-reply-btn');
        const parentId = btn.dataset.parentid;
        const articleId = document.getElementById('articleId').value;
        const name = document.getElementById(`replyName-${parentId}`).value.trim();
        const content = document.getElementById(`replyContent-${parentId}`).value.trim();
        if (!name || !content) return alert('Please fill both fields');

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleId,
                    name,
                    email: 'noreply@tobnews.com',
                    content,
                    parentCommentId: parentId
                })
            });
            const result = await res.json();
            alert(result.message);
            if (result.success) loadComments();
        } catch (err) {
            console.error(err);
            alert('Failed to submit reply');
        }
    }
});
// Like button
document.addEventListener('click', async e => {
    if (!e.target.closest('#likeBtn')) return;
    const userIdentifier = localStorage.getItem('tob_user') || (() => {
        const id = 'guest_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('tob_user', id);
        return id;
    })();

    try {
        const res = await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId, userIdentifier }) });
        const result = await res.json();
        if (result.success) loadLikes();
        else alert(result.message);
    } catch (err) {
        console.error(err);
    }
});
// Load likes count
async function loadLikes() {
    const likeEl = document.getElementById('likeCount');
    if (!likeEl) return; // Exit if element not found

    try {
        const res = await fetch(`/api/likes/${articleId}`);
        const data = await res.json();
        likeEl.textContent = `${data.LikeCount} Likes`;
    } catch (err) {
        console.error(err);
        likeEl.textContent = 'Error loading likes';
    }
}

async function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletterEmail');
    const msgEl = document.getElementById('newsletterMsg');
    const email = emailInput.value.trim();
    if (!email) return;

    msgEl.textContent = ''; // clear previous message

    try {
        const res = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await res.json();

        if (result.success) {
            msgEl.classList.remove('text-danger');
            msgEl.classList.add('text-success');
            msgEl.textContent = result.message;
            emailInput.value = '';
        } else {
            msgEl.classList.remove('text-success');
            msgEl.classList.add('text-danger');
            msgEl.textContent = result.message;
        }
    } catch (err) {
        console.error('Newsletter subscription error:', err);
        msgEl.classList.remove('text-success');
        msgEl.classList.add('text-danger');
        msgEl.textContent = 'Subscription failed. Please try again later.';
    }
}
// Initial load
loadComments();
loadLikes();
// Initialize
loadArticle();
//loadOtherNews();
loadFooterCategories();

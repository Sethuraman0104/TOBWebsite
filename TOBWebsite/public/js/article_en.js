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
async function loadArticle() {
    try {
        const res = await fetch(`/api/news/${articleId}`);
        const result = await res.json();

        const container = document.getElementById('articleContainer');

        if (result.success && result.data && result.data.IsActive && result.data.IsApproved) {
            const n = result.data;
            container.innerHTML = `
  <h1>${n.Title}</h1>
  <p class="text-muted">Published on ${formatDateTime(n.PublishedOn)}</p>
  ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}" class="img-fluid mb-3">` : ''}
  <div>${n.Content}</div>

  <div class="mt-4 d-flex align-items-center gap-3">
    <button id="likeBtn" class="btn btn-outline-danger"><i class="fa-solid fa-heart"></i> Like</button>
    <span id="likeCount" class="text-muted small">Loading likes...</span>
  </div>
`;
            loadLikes();
        } else {
            container.innerHTML = '<p class="text-muted">This article is not available.</p>';
        }
    } catch (err) {
        console.error(err);
        document.getElementById('articleContainer').innerHTML = '<p class="text-danger">Failed to load article.</p>';
    }
}

async function loadOtherNews() {
    const container = document.getElementById('otherNewsContainer');
    container.innerHTML = `
    <div class="news-spinner">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

    try {
        const res = await fetch('/api/news/admin');
        const news = await res.json();

        const otherNews = (Array.isArray(news) ? news : [])
            .filter(n => n.IsActive && n.IsApproved && n.ArticleID != articleId)
            .slice(0, 4);

        if (!otherNews.length) {
            container.innerHTML = '<p class="text-muted">No other news available.</p>';
            return;
        }

        container.innerHTML = otherNews.map(n => {
            const publishedDate = formatDateTime(n.PublishedOn);
            return `
        <div class="col-md-3">
          <div class="card news-card-custom animate-card">
            <div class="news-card-img-wrapper">
              <img src="${n.ImageURL || '/images/default-news.jpg'}" alt="${n.Title}">
            </div>
            <div class="news-card-body">
              <h5 class="card-title">${n.Title}</h5>
              <p class="news-card-text-truncate" style="padding-left:5px;">${n.Content}</p>
            </div>
            <div class="news-card-footer">
  <small class="text-muted">📅 ${publishedDate}</small>
  <a href="article_en.html?id=${n.ArticleID}" class="articlepg-read-btn">Read More</a>
</div>
          </div>
        </div>
      `;
        }).join('');

        // Fade-in animation
        const cards = container.querySelectorAll('.animate-card');
        cards.forEach((card, i) => {
            card.style.animationDelay = `${i * 0.15}s`;
            card.classList.add('fade-in-up-custom');
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-danger">Failed to load other news.</p>';
    }
}

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

// Submit comment
document.getElementById('commentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        articleId: document.getElementById('articleId').value,
        name: document.getElementById('commentName').value,
        email: document.getElementById('commentEmail').value,
        content: document.getElementById('commentContent').value
    };
    try {
        const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        alert(result.message);
        if (result.success) {
            document.getElementById('commentForm').reset();
            loadComments();
        }
    } catch (err) {
        console.error(err);
        alert('Error submitting comment');
    }
});

async function loadComments() {
    try {
        const res = await fetch(`/api/comments/${articleId}`);
        const comments = await res.json();
        const container = document.getElementById('commentsContainer');
        if (!comments.length) return container.innerHTML = '<p class="text-muted">No comments yet.</p>';

        container.innerHTML = comments.map(c => `
      <div class="comment-card mb-3" id="comment-${c.CommentID}">
        <div class="comment-header d-flex justify-content-between align-items-center">
          <div>
            <strong>${c.Name}</strong> <small class="text-muted">• ${new Date(c.CreatedOn).toLocaleString()}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary reply-btn" data-commentid="${c.CommentID}"><i class="fa fa-reply"></i> Reply</button>
        </div>
        <div class="comment-body mt-2">
          <p>${c.Content}</p>
        </div>
        <div class="reply-box mt-2 p-2 bg-light rounded" id="replyBox-${c.CommentID}" style="display:none;">
          <input type="text" class="form-control mb-2" placeholder="Your Name" id="replyName-${c.CommentID}">
          <textarea class="form-control mb-2" rows="3" placeholder="Your Reply" id="replyContent-${c.CommentID}"></textarea>
          <button class="btn btn-sm btn-success send-reply-btn" data-parentid="${c.CommentID}">Post Reply</button>
        </div>

        ${c.Replies && c.Replies.length ? `
          <div class="replies ms-4 mt-3">
            ${c.Replies.map(r => `
              <div class="reply-card p-2 mb-2 bg-white rounded shadow-sm">
                <strong>${r.Name}</strong> <small class="text-muted">• ${new Date(r.CreatedOn).toLocaleString()}</small>
                <p class="mb-0">${r.Content}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
    } catch (err) {
        console.error(err);
        document.getElementById('commentsContainer').innerHTML = '<p class="text-danger">Failed to load comments.</p>';
    }
}

// Reply button click
document.addEventListener('click', async e => {
    if (e.target.classList.contains('reply-btn')) {
        const id = e.target.dataset.commentid;
        const box = document.getElementById(`replyBox-${id}`);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    if (e.target.classList.contains('send-reply-btn')) {
        const parentId = e.target.dataset.parentid;
        const name = document.getElementById(`replyName-${parentId}`).value;
        const content = document.getElementById(`replyContent-${parentId}`).value;
        if (!name || !content) return alert('Please fill both fields');

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId, name, email: 'noreply@tobnews.com', content, parentCommentId: parentId })
            });
            const result = await res.json();
            alert(result.message);
            loadComments();
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

// Initial load
loadComments();
loadLikes();

// Initialize
loadArticle();
loadOtherNews();
loadFooterCategories();

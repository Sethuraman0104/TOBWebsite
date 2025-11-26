// Get trendId from URL query ?id=12
const urlParams = new URLSearchParams(window.location.search);
const trendId = urlParams.get('id');
document.getElementById('trendId').value = trendId;

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
    trendsContainer.innerHTML = `<div class="text-center text-danger py-4">Failed to load trending articles.</div>`;
    console.error(err);
  }
}
// Initialize
document.addEventListener('DOMContentLoaded', loadTrendsTicker);

// -----------------------------------------
// Load Other Trends
// -----------------------------------------
async function loadOtherTrends() {
  const container = document.getElementById("otherTrendsList");
  if (!container) {
    console.warn("❌ otherTrendsList container not found");
    return;
  }

  if (typeof trendId === "undefined" || !trendId) {
    console.warn("❌ trendId is undefined, cannot load other trends");
    container.innerHTML = `<div class="text-muted py-3 text-center">No other trends available.</div>`;
    return;
  }

  try {
    console.log("🔄 Loading other trends...");
    container.innerHTML = `<div class="text-center text-muted py-4">Loading other trending articles...</div>`;

    const res = await fetch(`/api/trends/other/${trendId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    });
    const json = await res.json();
    console.log("OTHER TRENDS RESULT:", json);

    if (!json.success || !Array.isArray(json.data)) {
      console.warn("⚠ Invalid other trends result");
      container.innerHTML = `<div class="text-center text-muted py-4">No other trends available.</div>`;
      return;
    }

    const trends = json.data;
    if (!trends.length) {
      container.innerHTML = `<div class="text-center text-muted py-4">No other trends found.</div>`;
      return;
    }

    renderOtherTrends(trends);

  } catch (err) {
    console.error("❌ Error loading other trends", err);
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load other trends.</div>`;
  }
}

// -----------------------------------------
// Render Other Trends Cards
// -----------------------------------------
function renderOtherTrends(trends) {
  const container = document.getElementById("otherTrendsList");
  if (!container) return;

  container.innerHTML = "";

  trends.forEach(t => {
    const img = t.ImageURL || "/images/default-trend.jpg";
    const likes = t.LikeCount || 0;
    const comments = t.CommentCount || 0;

    const card = document.createElement("div");
    card.className = "othertrends-card";

    card.innerHTML = `
      <img src="${img}" class="othertrends-image" alt="${escapeAttr(t.TrendTitle_EN)}" onerror="this.src='/images/default-trend.jpg';" />

      <div class="othertrends-body">
        <h5 class="othertrends-title">${escapeHtml(t.TrendTitle_EN)}</h5>
        <p class="othertrends-desc">${escapeHtml(t.TrendDescription_EN || "")}</p>
      </div>

      <div class="othertrends-footer">
        <div class="othertrends-stats">
          <span><i class="fa fa-heart"></i> ${likes}</span>
          <span><i class="fa fa-comment"></i> ${comments}</span>
        </div>
        <a href="trendsarticle_en.html?id=${t.TrendID}" class="othertrends-view-btn">
          <i class="fa fa-eye"></i> View
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

// -----------------------------------------
// Utility functions
// -----------------------------------------
function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(text = "") {
  return String(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeJSON(res) {
  return res.json().catch(() => null);
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return d.toLocaleString('en-US', options);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleString('en-US', options);
}

// -------------------------------------------------
// Unique user identifier (for likes)
// -------------------------------------------------
function getUserIdentifier() {
  let uid = localStorage.getItem("trendUserIdentifier");
  if (!uid) {
    uid = "user_" + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem("trendUserIdentifier", uid);
  }
  return uid;
}

// -----------------------------------------
// Load Trend Details (English Page Only) — Improved UI
// -----------------------------------------
async function loadTrend() {
  if (!trendId) return;

  const container = document.getElementById("trendContainer");
  if (!container) return;

  try {
    const res = await fetch(`/api/trends/gettrend/${trendId}`, { cache: "no-store" });
    const result = await safeJSON(res);

    if (!result || !result.success || !result.data) {
      container.innerHTML = `<p class="text-muted text-center py-5">Trend not found.</p>`;
      return;
    }

    const t = result.data;

    const displayDate =
      t.UpdatedOn && t.UpdatedOn !== ""
        ? formatDateTime(t.UpdatedOn)
        : t.CreatedOn
        ? formatDateTime(t.CreatedOn)
        : "—";

    container.innerHTML = `
  <div class="trend-detail-wrapper container my-5"">        
    <!-- Title Row -->
    <div class="trend-title-wrapper">
      <i class="fa-solid fa-bolt"></i>
      <h1 class="trend-title mb-0">
        ${escapeHtml(t.TrendTitle_EN)}
      </h1>
    </div>

    <!-- Date -->
    <div class="trend-date-badge">
      <i class="fa-solid fa-calendar-day"></i> Updated ${displayDate}
    </div>

    <!-- Image -->
    <div class="trend-image-box">
      <img 
        src="${t.ImageURL || "/images/default-trend.jpg"}"
        alt="${escapeAttr(t.TrendTitle_EN)}"
        class="trend-main-image"
        onerror="this.src='/images/default-trend.jpg';"
      />
    </div>

    <!-- Description Section -->
    <div class="trend-section mt-4">
      <h3><i class="fa-solid fa-align-left"></i> Description</h3>
      <div id="trendDescriptionEn" class="trend-description">
        ${t.TrendDescription_EN || ""}
      </div>
    </div>

    <!-- Like Section -->
    <div class="mt-4 d-flex align-items-center gap-3">
      <button id="likeTrendBtn" class="btn like-btn">
        <i class="fa-solid fa-heart"></i> Like
      </button>
      <span id="trendLikeCount" class="like-count-text">Loading likes...</span>
    </div>
  </div>
`;


    // Attach Like Event
    const likeBtn = document.getElementById("likeTrendBtn");
    if (likeBtn) likeBtn.addEventListener("click", postTrendLike);

    // Load Likes Count
    await loadTrendLikes();

  } catch (err) {
    console.error("loadTrend error:", err);
    container.innerHTML = `<p class="text-danger text-center py-4">Failed to load trend.</p>`;
  }
}

const icons = ["🔥", "⚡", "📢", "🚨", "🛑"];
async function loadBreakingNews() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    // Validate and filter
    const validNews = (Array.isArray(news) ? news : []).filter(
      n => n.IsActive && n.IsApproved && n.IsBreakingNews
    );

    const ticker = document.getElementById("breakingNewsInner");

    if (!validNews.length) {
      ticker.innerHTML = `<span class="text-light">No breaking news right now.</span>`;
      return;
    }

    // Sort by latest first
    const sorted = validNews.sort(
      (a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn)
    );

    // Build scrolling text line
    let html = "";
    sorted.forEach((n, i) => {
      const icon = icons[i % icons.length]; // rotate icons
      html += `
    <span class="breaking-item" onclick="openArticle(${n.ArticleID})">
      ${icon} ${n.Title}
    </span>
  `;
    });
    ticker.innerHTML = html + html;

  } catch (err) {
    console.error("loadBreakingNews error:", err);
    document.getElementById("breakingNewsInner").innerHTML =
      `<span class="text-light">Error loading breaking news...</span>`;
  }
}
loadBreakingNews();

async function loadAdvertisements() {
  try {
    const res = await fetch('/api/advertisements/list?active=1', { cache: 'no-store' });
    const json = await res.json();

    if (!json.success || !Array.isArray(json.data)) {
      console.error("Invalid advertisement response:", json);
      return;
    }

    const ads = json.data;
    if (!ads.length) return;

    const positions = {
      top: ['adTopBanner'],
      sidebar: ['adSidebar'],
      middle: ['adMiddleContent1', 'adMiddleContent2', 'adMiddleContent3'],
      footer: ['adFooter']
    };

    Object.values(positions).flat().forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
        if (el.carouselInterval) clearInterval(el.carouselInterval);
      }
    });

    Object.entries(positions).forEach(([posKey, containerIds]) => {
      containerIds.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const filteredAds = ads.filter(ad => ad.Position && ad.Position.toLowerCase() === posKey);
        if (!filteredAds.length) return;

        container.style.display = 'block';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.padding = '10px 0';

        // Determine wrapper height: largest ad in this set
        const maxHeight = filteredAds.reduce((max, ad) => {
          switch ((ad.Size || '').toLowerCase()) {
            case 'small': return Math.max(max, 150);
            case 'medium': return Math.max(max, 250);
            case 'large': return Math.max(max, 350);
            default: return Math.max(max, 250);
          }
        }, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'ad-carousel-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = `${maxHeight}px`;

        filteredAds.forEach((ad, index) => {
          const sizeClass = ad.Size ? `ad-${ad.Size.toLowerCase()}` : 'ad-medium';

          const adDiv = document.createElement('div');
          adDiv.className = `ad-card ${sizeClass}`;
          adDiv.style.position = 'absolute';
          adDiv.style.top = '0';
          adDiv.style.left = '0';
          adDiv.style.width = '100%';
          adDiv.style.height = '100%';  // now fills the wrapper fully
          adDiv.style.opacity = index === 0 ? '1' : '0';
          adDiv.style.transition = 'opacity 1s ease-in-out';

          const adLink = document.createElement('a');
          adLink.href = ad.LinkURL || '#';
          adLink.target = '_blank';
          adLink.rel = 'noopener noreferrer';

          const adImg = document.createElement('img');
          adImg.src = ad.ImageURL;
          adImg.alt = ad.Title;
          adImg.onerror = () => { adImg.src = '/images/default-ad.jpg'; };

          adLink.appendChild(adImg);
          adDiv.appendChild(adLink);
          wrapper.appendChild(adDiv);
        });

        container.appendChild(wrapper);

        // Auto-scroll carousel
        let currentIndex = 0;
        const total = filteredAds.length;
        container.carouselInterval = setInterval(() => {
          const adCards = wrapper.querySelectorAll('.ad-card');
          adCards.forEach((card, idx) => {
            card.style.opacity = idx === currentIndex ? '1' : '0';
          });
          currentIndex = (currentIndex + 1) % total;
        }, 4000);
      });
    });

  } catch (err) {
    console.error('❌ Error loading advertisements:', err);
  }
}
window.addEventListener('load', loadAdvertisements);

// -----------------------------------------
// Likes
// -----------------------------------------
async function loadTrendLikes() {
  if (!trendId) return;
  const container = document.getElementById("trendLikeCount");
  if (!container) return;

  try {
    const res = await fetch(`/api/trends/${trendId}/likes`, { cache: "no-store" });
    const data = await safeJSON(res);
    const count = data?.likeCount ?? 0;
    container.textContent = `${count} people liked this trend`;
  } catch (err) {
    console.error("loadTrendLikes error:", err);
    container.textContent = "Error loading likes";
  }
}

async function postTrendLike() {
  if (!trendId) return;
  const likeBtn = document.getElementById("likeTrendBtn");
  const UserIP = getUserIdentifier();
  if (likeBtn) likeBtn.disabled = true;

  try {
    const res = await fetch(`/api/trends/${trendId}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserIP })
    });
    const json = await safeJSON(res);
    if (!json?.success) return alert(json?.message || "Already liked");
    document.getElementById("trendLikeCount").textContent = `${json.likeCount} people liked this trend`;
  } catch (err) {
    console.error("postTrendLike error:", err);
    alert("Failed to register like. Try again.");
  } finally {
    if (likeBtn) likeBtn.disabled = false;
  }
}

// -----------------------------------------
// Load comments (hierarchical)
// -----------------------------------------
async function loadTrendComments() {
  if (!trendId) return;
  const container = document.getElementById("trendComments");
  if (!container) return;

  try {
    const res = await fetch(`/api/trends/${trendId}/comments`, { cache: "no-store" });
    const data = await safeJSON(res) || [];
    const commentsArr = Array.isArray(data) ? data : data?.data || [];

    const approved = commentsArr.filter(c => !!c.IsApproved);
    if (!approved.length) {
      container.innerHTML = "<p class='text-muted'>No comments yet.</p>";
      return;
    }

    const map = {};
    approved.forEach(c => map[c.CommentID] = { ...c, Replies: [] });
    const roots = [];
    approved.forEach(c => {
      if (c.ParentCommentID && map[c.ParentCommentID]) {
        map[c.ParentCommentID].Replies.push(map[c.CommentID]);
      } else {
        roots.push(map[c.CommentID]);
      }
    });

    container.innerHTML = renderCommentsRecursive(roots);
  } catch (err) {
    console.error("loadTrendComments error:", err);
    container.innerHTML = "<p class='text-danger'>Failed to load comments.</p>";
  }
}

function renderCommentsRecursive(comments) {
  return comments.map(c => `
      <div class="comment-card mb-3" id="comment-${c.CommentID}">
        <div class="comment-header d-flex justify-content-between align-items-start">
          <div>
            <strong>${escapeHtml(c.Name || 'Anonymous')}</strong>
            <small class="text-muted ms-2">• ${c.CreatedOn ? formatDateTime(c.CreatedOn) : ''}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary reply-btn" data-commentid="${c.CommentID}">
            <i class="fa fa-reply"></i> Reply
          </button>
        </div>
        <div class="comment-body mt-2">
          <p>${escapeHtml(c.Content || '')}</p>
        </div>
        <div class="reply-box mt-2 p-2 bg-light rounded" id="replyBox-${c.CommentID}" style="display:none;">
          <input type="text" class="form-control mb-2" placeholder="Your Name" id="replyName-${c.CommentID}">
          <textarea class="form-control mb-2" rows="3" placeholder="Your Reply" id="replyContent-${c.CommentID}"></textarea>
          <button class="btn btn-sm btn-success send-reply-btn" data-parentid="${c.CommentID}">Post Reply</button>
        </div>
        ${c.Replies?.length ? `<div class="replies ms-4 mt-3 border-start ps-3">${renderCommentsRecursive(c.Replies)}</div>` : ''}
      </div>
    `).join('');
}

document.addEventListener("click", async (ev) => {
  const replyBtn = ev.target.closest(".reply-btn");
  if (replyBtn) {
    const id = replyBtn.dataset.commentid;
    const box = document.getElementById("replyBox-" + id);
    if (box) box.style.display = box.style.display === "none" ? "block" : "none";
    return;
  }

  const sendReplyBtn = ev.target.closest(".send-reply-btn");
  if (sendReplyBtn) {
    const parentId = sendReplyBtn.dataset.parentid;
    const nameEl = document.getElementById(`replyName-${parentId}`);
    const contentEl = document.getElementById(`replyContent-${parentId}`);
    const name = nameEl?.value.trim();
    const content = contentEl?.value.trim();
    if (!name || !content) return alert("Please fill both fields");

    try {
      sendReplyBtn.disabled = true;
      const res = await fetch("/api/trends/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TrendID: trendId,
          Name: name,
          Email: "noreply@tobnews.com",
          Content: content,
          ParentCommentID: parentId
        })
      });
      const json = await safeJSON(res);
      alert(json?.message || "Reply submitted for approval.");
      if (json?.success) {
        if (nameEl) nameEl.value = "";
        if (contentEl) contentEl.value = "";
        await loadTrendComments();
      }
    } catch (err) {
      console.error("send-reply error:", err);
      alert("Failed to submit reply");
    } finally {
      sendReplyBtn.disabled = false;
    }
  }
});

// -----------------------------------------
// Submit root comment
// -----------------------------------------
const trendCommentForm = document.getElementById("trendCommentForm");
if (trendCommentForm) {
  trendCommentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (document.getElementById("commentName")?.value || "").trim();
    const email = (document.getElementById("commentEmail")?.value || "").trim();
    const content = (document.getElementById("commentContent")?.value || "").trim();
    if (!name || !content) return alert("Please fill both fields");

    try {
      const submitBtn = trendCommentForm.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;
      const res = await fetch("/api/trends/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TrendID: trendId, Name: name, Email: email, Content: content, ParentCommentID: null })
      });
      const json = await safeJSON(res);
      alert(json?.message || "Comment submitted for approval.");
      if (json?.success) {
        trendCommentForm.reset();
        await loadTrendComments();
      }
    } catch (err) {
      console.error("submit comment error:", err);
      alert("Failed to submit comment");
    } finally {
      const submitBtn = trendCommentForm.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = false;
    }
  });
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
    <a href="#${safeId}" class="footer-category-link-item">
      <i class="fa-solid fa-angle-right me-1"></i>${cat.CategoryName}
    </a>`;
      container.appendChild(li);
    });

  } catch {
    container.innerHTML = '<li>Error loading</li>';
  }
}
document.getElementById('year').textContent = new Date().getFullYear();
loadFooterCategories();

// -----------------------------------------
// Kickoff
// -----------------------------------------
loadTrend();
loadTrendComments();
loadOtherTrends();
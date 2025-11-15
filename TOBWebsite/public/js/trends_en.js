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
  const trendsContainer = document.getElementById('otherTrendsContainer');

  tickerInner.innerHTML = 'Loading trends...';
  trendsContainer.innerHTML = `<div class="text-center text-muted py-4">Loading trending articles...</div>`;

  try {
    const res = await fetch('/api/trends', { cache: 'no-store' });
    const data = await res.json();
    const trends = Array.isArray(data) ? data : (data.success ? data.data : []);

    if (!trends.length) {
      tickerInner.innerHTML = 'No active trends';
      trendsContainer.innerHTML = `<div class="text-center text-muted py-4">No active trending articles</div>`;
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

    // ----------------------
    // 2️⃣ Trending Cards Section
    // ----------------------
    trendsContainer.innerHTML = trends.map(t => {
      const img = t.ImageURL || '/images/default-trend.jpg';
      const title = t.TrendTitle_EN || 'Untitled Trend';
      const content = t.TrendDescription_EN || 'No description available.';
      const date = t.PublishedOn
        ? new Date(t.PublishedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const link = t.TrendLink || '#';

      return `
        <div class="col-md-6 col-lg-4 col-xl-3" data-aos="fade-up" data-aos-duration="800">
          <div class="trend-card h-100">
            <img src="${img}" alt="${title}" onerror="this.src='/images/default-trend.jpg';" />
            <div class="trend-card-body">
              <div>
                <h5 class="trend-card-title">${title}</h5>
                <p class="trend-card-text">${content}</p>
              </div>
              <div class="trend-card-footer">
                <span class="trend-date">${date}</span>
                <button class="btn read-more-btn" onclick="openTrendArticle(${t.TrendID})">Read More</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    tickerInner.innerHTML = 'Error loading trends';
    trendsContainer.innerHTML = `<div class="text-center text-danger py-4">Failed to load trending articles.</div>`;
    console.error(err);
  }
}
// Initialize
document.addEventListener('DOMContentLoaded', loadTrendsTicker);

 // -----------------------------------------
  // Utilities
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
  // Load Trend Details
  // -----------------------------------------
  async function loadTrend() {
    if (!trendId) return;
    const container = document.getElementById("trendContainer");
    if (!container) return;

    try {
      const res = await fetch(`/api/trends/gettrend/${trendId}`, { cache: "no-store" });
      const result = await safeJSON(res);

      if (!result || !result.success || !result.data) {
        container.innerHTML = `<p class="text-muted">Trend not found.</p>`;
        return;
      }

      const t = result.data;

      container.innerHTML = `
        <h1>${escapeHtml(t.TrendTitle_EN)}</h1>
        <p class="text-muted">Updated ${t.UpdatedOn ? new Date(t.UpdatedOn).toLocaleString() : "—"}</p>

        <div class="text-center my-3">
          <img src="${t.ImageURL || "/images/default-trend.jpg"}"
               alt="${escapeAttr(t.TrendTitle_EN)}"
               style="width:500px;height:500px;object-fit:cover;border-radius:8px;max-width:100%;" />
        </div>

        <div class="row">
          <div class="col-md-6">
            <h4>English</h4>
            <div id="trendDescriptionEn">${t.TrendDescription_EN || ""}</div>
          </div>
          <div class="col-md-6" dir="rtl" style="text-align:right;">
            <h4>العربية</h4>
            <div id="trendDescriptionAr">${t.TrendDescription_AR || ""}</div>
          </div>
        </div>

        <div class="mt-4 d-flex align-items-center gap-3">
          <button id="likeTrendBtn" class="btn btn-outline-danger">
            <i class="fa-solid fa-heart"></i> Like
          </button>
          <span id="trendLikeCount" class="text-muted small">Loading likes...</span>
        </div>
      `;

      const likeBtn = document.getElementById("likeTrendBtn");
      if (likeBtn) likeBtn.addEventListener("click", postTrendLike);

      await loadTrendLikes();
    } catch (err) {
      console.error("loadTrend error:", err);
      container.innerHTML = `<p class="text-danger">Failed to load trend.</p>`;
    }
  }

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
      const count = data?.LikeCount ?? 0;
      container.textContent = `${count} people liked this trend`;
    } catch (err) {
      console.error("loadTrendLikes error:", err);
      container.textContent = "Error loading likes";
    }
  }

  async function postTrendLike() {
  if (!trendId) return;
  const likeBtn = document.getElementById("likeTrendBtn");
  const userIdentifier = getUserIdentifier();
  if (likeBtn) likeBtn.disabled = true;

  try {
    const res = await fetch(`/api/trends/${trendId}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIdentifier })
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
            <small class="text-muted ms-2">• ${c.CreatedOn ? new Date(c.CreatedOn).toLocaleString() : ''}</small>
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

  // -----------------------------------------
  // Kickoff
  // -----------------------------------------
  loadTrend();
  loadTrendComments();
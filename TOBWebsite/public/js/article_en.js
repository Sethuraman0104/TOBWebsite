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

            // Collect all images: MainSlideImage first, then ImageURL, then Attachments
            let images = [];

            if (n.MainSlideImage && n.MainSlideImage.trim() !== '') images.push(n.MainSlideImage);
            if (n.ImageURL && n.ImageURL.trim() !== '') images.push(n.ImageURL);

            if (Array.isArray(n.Attachments)) {
                n.Attachments.forEach(a => {
                    // Try both "url" or direct string if attachments are simple
                    if (typeof a === 'string' && a.trim() !== '') images.push(a);
                    else if (a.url && a.url.trim() !== '') images.push(a.url);
                });
            }

            // Remove duplicate images
            images = [...new Set(images)];

            const carouselHTML = images.length > 0 ? `
                <div class="article-carousel">
                    <div class="carousel-track" id="carouselTrack">
                        ${images.map(img => `
                            <div class="carousel-slide">
                                <img src="${img}" onerror="this.src='/images/default-news.png'">
                            </div>
                        `).join('')}
                    </div>

                    <!-- Navigation -->
                    <button class="carousel-btn prev" onclick="prevSlide()">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="carousel-btn next" onclick="nextSlide()">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>

                    <!-- Dots -->
                    <div class="carousel-dots">
                        ${images.map((_, i) => `<span class="dot" onclick="goToSlide(${i})"></span>`).join('')}
                    </div>
                </div>
            ` : "";

            container.innerHTML = `
  <div class="article-detail-wrapper container my-5" style="animation: fadeIn 0.6s ease;">
    <!-- ARTICLE HEADER -->
    <div class="article-header">
      <div class="article-title-wrapper">
        <i class="fa-solid fa-newspaper article-icon"></i>
        <h1 class="article-title mb-0">
          ${n.Title}
        </h1>
      </div>
      <p class="trend-date-badge">
        <i class="fa-regular fa-calendar"></i>
        ${formatDateTime(n.PublishedOn)}
      </p>
    </div>

    <!-- CAROUSEL IMAGES -->
    ${carouselHTML}

    <!-- DESCRIPTION -->
    <div class="trend-section mt-4">
      <h3><i class="fa-solid fa-align-left"></i> Description</h3>
      <div id="articleContent" class="trend-description">
        ${n.Content}
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="mt-4 d-flex align-items-center gap-3">
      <button id="likeBtn" class="like-btn">
        <i class="fa-solid fa-heart"></i> Like
      </button>
      <span id="likeCount" class="like-count">Loading likes...</span>
    </div>
  </div>
`;


            initCarousel();
            loadLikes();

        } else {
            container.innerHTML = `<p class="text-muted">This article is not available.</p>`;
        }

    } catch (err) {
        console.error(err);
        document.getElementById('articleContainer').innerHTML =
            '<p class="text-danger">Failed to load article.</p>';
    }
}

let currentIndex = 0;
let autoScrollInterval = null;

function initCarousel() {
    const dots = document.querySelectorAll(".dot");
    if (dots.length) dots[0].classList.add("active");

    const carousel = document.querySelector(".article-carousel");

    // Pause on hover
    if (carousel) {
        carousel.addEventListener("mouseenter", stopAutoScroll);
        carousel.addEventListener("mouseleave", startAutoScroll);
    }

    startAutoScroll();
}

function updateCarousel() {
    const track = document.getElementById("carouselTrack");
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");

    if (!track || slides.length === 0) return;

    const width = slides[0].clientWidth;

    track.style.transform = `translateX(-${currentIndex * width}px)`;

    dots.forEach(d => d.classList.remove("active"));
    if (dots[currentIndex]) dots[currentIndex].classList.add("active");
}

function nextSlide() {
    const slides = document.querySelectorAll(".carousel-slide");
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel();
}

function prevSlide() {
    const slides = document.querySelectorAll(".carousel-slide");
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateCarousel();
}

function goToSlide(i) {
    currentIndex = i;
    updateCarousel();
}

function startAutoScroll() {
    stopAutoScroll();  
    autoScrollInterval = setInterval(nextSlide, 4000);
}

function stopAutoScroll() {
    if (autoScrollInterval) clearInterval(autoScrollInterval);
}

let otherNewsPage = 0;
const pageSize = 8;
let isLoadingNews = false;
let allNewsLoaded = false;
const loadedArticleIds = new Set();
const carouselIntervals = new Map(); // store intervals per carousel

const container = document.querySelector('#otherNewsContainer');
container.innerHTML = '';

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

        otherNews.forEach(n => {
            loadedArticleIds.add(n.ArticleID);

            // Collect all images
            let images = [];
            if (n.MainSlideImage) images.push(n.MainSlideImage);
            if (n.ImageURL) images.push(n.ImageURL);
            if (Array.isArray(n.Attachments)) {
                n.Attachments.forEach(a => {
                    if (a?.url) images.push(a.url);
                    else if (typeof a === 'string') images.push(a);
                });
            }
            if (images.length === 0) images.push('/images/default-news.png');

            // Carousel HTML
            const carouselHTML = `
                <div class="other-carousel">
                    <div class="carousel-track" data-index="0">
                        ${images.map(img => `
                            <div class="carousel-slide">
                                <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.png'">
                            </div>
                        `).join('')}
                    </div>
                    <button class="carousel-btn prev" onclick="prevSlideOther(this)">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="carousel-btn next" onclick="nextSlideOther(this)">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                    <div class="carousel-dots">
                        ${images.map((_, i) => `<span class="dot" onclick="goToSlideOther(this, ${i})"></span>`).join('')}
                    </div>
                </div>
            `;

            const item = document.createElement('div');
            item.className = 'other-news-item';
            item.innerHTML = `
                <div class="other-news-card">
                    ${carouselHTML}
                    <div class="other-news-info">
                        <div class="title">${n.Title}</div>
                        <div class="meta">
                            <span>📅 ${formatDateTime(n.PublishedOn)}</span>
                            <span><i class="fa-solid fa-eye"></i> ${n.ViewCount || 0}</span>
                        </div>
                        <a href="article_en.html?id=${n.ArticleID}" class="btn-read">
                            Read More <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
            fragment.appendChild(item);
        });

        container.appendChild(fragment);

        // Animate cards
        container.querySelectorAll('.other-news-item:not(.show)').forEach((el, i) => {
            setTimeout(() => el.classList.add('show'), i * 100);
        });

        // Initialize auto-slides
        container.querySelectorAll('.other-carousel').forEach(carousel => {
            const track = carousel.querySelector('.carousel-track');
            let index = parseInt(track.dataset.index || 0);

            if (carouselIntervals.has(track)) clearInterval(carouselIntervals.get(track));

            const interval = setInterval(() => {
                const slides = track.querySelectorAll('.carousel-slide');
                index = (index + 1) % slides.length;
                track.dataset.index = index;
                updateCarouselOther(track, index);
            }, 4000);

            carouselIntervals.set(track, interval);

            // Dots
            const dots = carousel.querySelectorAll('.dot');
            if (dots.length) dots[0].classList.add('active');
        });

        otherNewsPage++;
    } catch (err) {
        console.error(err);
    } finally {
        isLoadingNews = false;
        document.getElementById('newsLoader').style.display = 'none';
    }
}
// Carousel Controls
function prevSlideOther(btn) {
    const carousel = btn.closest('.other-carousel');
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    let index = parseInt(track.dataset.index || 0);
    index = (index - 1 + slides.length) % slides.length;
    track.dataset.index = index;
    updateCarouselOther(track, index);
}
function nextSlideOther(btn) {
    const carousel = btn.closest('.other-carousel');
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    let index = parseInt(track.dataset.index || 0);
    index = (index + 1) % slides.length;
    track.dataset.index = index;
    updateCarouselOther(track, index);
}
function goToSlideOther(dot, i) {
    const carousel = dot.closest('.other-carousel');
    const track = carousel.querySelector('.carousel-track');
    track.dataset.index = i;
    updateCarouselOther(track, i);
}
function updateCarouselOther(track, index) {
    const slides = track.querySelectorAll('.carousel-slide');
    const dots = track.parentElement.querySelectorAll('.dot');
    const width = slides[0].clientWidth;
    track.style.transform = `translateX(-${index * width}px)`;
    dots.forEach(d => d.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');
}
// Infinite scroll
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 300)) {
        loadOtherNewsGrid();
    }
});
// Initial load
loadOtherNewsGrid();

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
loadArticle();
loadFooterCategories();

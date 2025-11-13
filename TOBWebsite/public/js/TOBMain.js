(function ($) {
  "use strict";

  // ---------- SPINNER ----------
  var spinner = function () {
    setTimeout(function () {
      if ($('#spinner').length > 0) {
        $('#spinner').removeClass('show');
      }
    }, 1);
  };
  spinner(0);

  // ---------- FIXED NAVBAR ----------
  $(window).scroll(function () {
    if ($(this).scrollTop() > 300) {
      $('.sticky-top').addClass('shadow-sm').css('top', '0px');
    } else {
      $('.sticky-top').removeClass('shadow-sm').css('top', '-200px');
    }
  });

  // ---------- BACK TO TOP ----------
  $(window).scroll(function () {
    if ($(this).scrollTop() > 300) {
      $('.back-to-top').fadeIn('slow');
    } else {
      $('.back-to-top').fadeOut('slow');
    }
  });
  $('.back-to-top').click(function () {
    $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
    return false;
  });

  // ---------- OWL CAROUSELS ----------
  $(".latest-news-carousel").owlCarousel({
    autoplay: true,
    smartSpeed: 2000,
    dots: true,
    loop: true,
    margin: 25,
    nav: true,
    navText: [
      '<i class="bi bi-arrow-left"></i>',
      '<i class="bi bi-arrow-right"></i>'
    ],
    responsive: {
      0: { items: 1 },
      768: { items: 2 },
      1200: { items: 4 }
    }
  });

  $(".whats-carousel").owlCarousel({
    autoplay: true,
    smartSpeed: 2000,
    dots: true,
    loop: true,
    margin: 25,
    nav: true,
    navText: [
      '<i class="bi bi-arrow-left"></i>',
      '<i class="bi bi-arrow-right"></i>'
    ],
    responsive: {
      0: { items: 1 },
      768: { items: 2 }
    }
  });

})(jQuery);

// ===================================================================
// ========== MAIN TOB LOGIC (news, trends, etc.) ===================
// ===================================================================

// ---------- GLOBAL CONFIG ----------
AOS.init({ once: true });

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
  const trendsContainer = document.getElementById('trendsSection');

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
                <a href="${link}" class="trend-readmore">Read More →</a>
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

async function loadTopStories() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    // ✅ Only Active, Approved, and Top Stories
    const activeNews = (Array.isArray(news) ? news : []).filter(
      n => n.IsActive && n.IsApproved && (n.IsTopStory == 1)
    );

    if (!activeNews.length) return;

    // --- 📰 LEFT CAROUSEL: show all top stories ---
    const carousel = document.getElementById('topStoriesCarousel');
    carousel.innerHTML = '';

    activeNews.forEach(n => {
      const img = n.ImageURL || '/images/default-news.jpg';
      carousel.innerHTML += `
        <div class="item">
          <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.jpg'">
          <div class="carousel-overlay">
            <div class="carousel-date">📅 ${formatDateTime(n.PublishedOn)}</div>
            <h3>${n.Title}</h3>
            <p>${n.Summary || ''}</p>
            <button class="btn read-more-btn" onclick="openArticle(${n.ArticleID})">Read More</button>
          </div>
        </div>
      `;
    });

    // Re-init Owl Carousel safely
    try { $('#topStoriesCarousel').owlCarousel('destroy'); } catch (e) { }
    $('#topStoriesCarousel').owlCarousel({
      items: 1,
      loop: true,
      autoplay: true,
      autoplayTimeout: 5000,
      smartSpeed: 1200,
      dots: true,
      nav: false,
      animateIn: 'fadeIn',
      animateOut: 'fadeOut',
      onInitialized: adjustSideStoriesHeight,
      onResized: adjustSideStoriesHeight
    });

    // --- 🗞️ RIGHT SIDE STORIES: Always two cards ---
    const sideStories = activeNews.slice(0, 2); // take first two top stories
    const containerIds = ['sideTopStory1', 'sideTopStory2'];

    containerIds.forEach((id, idx) => {
      const s = sideStories[idx];
      const container = document.getElementById(id);

      if (!s) {
        // 🧩 Dummy placeholder if no story
        container.innerHTML = `
          <div class="side-story-dummy d-flex flex-column justify-content-center text-center p-3">
            <i class="fa-regular fa-newspaper text-muted fs-2 mb-2"></i>
            <h5 class="text-muted mb-1">No Story Available</h5>
            <p class="small text-secondary">Stay tuned for upcoming highlights.</p>
            <button class="btn btn-secondary btn-sm mt-auto" disabled>Read More</button>
          </div>
        `;
        return;
      }

      const img = s.ImageURL || '/images/default-news.jpg';
      const formattedDate = formatDateTime(s.PublishedOn);

      container.innerHTML = `
        <img src="${img}" alt="${s.Title}" onerror="this.src='/images/default-news.jpg'">
        <div class="side-story-body">
          <div class="side-story-title">${s.Title}</div>
          <div class="side-story-content text-truncate-3">${s.Content || s.Content || ''}</div>
          <div class="side-story-footer">
            <span>📅 ${formattedDate}</span>
            <button class="btn side-read-btn" onclick="openArticle(${s.ArticleID})">Read More</button>
          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error('loadTopStories error:', err);
  }
}
// 🧭 Adjust height dynamically
function adjustSideStoriesHeight() {
  const carousel = document.getElementById('topStoriesCarousel');
  const sideContainer = document.querySelector('.side-stories-container');
  if (!carousel || !sideContainer) return;

  const carouselHeight = carousel.offsetHeight || 400;
  sideContainer.style.height = carouselHeight + 'px';

  const stories = sideContainer.querySelectorAll('.side-story');
  stories.forEach(s => s.style.height = (carouselHeight / stories.length - 6) + 'px');
}
window.addEventListener('load', loadTopStories);
window.addEventListener('resize', adjustSideStoriesHeight);

async function loadHighlightsFeatured() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    const featuredNews = (Array.isArray(news) ? news : []).filter(
      n => n.IsActive && n.IsApproved && n.IsFeatured == 1
    );

    const container = document.getElementById('featuredHighlights');
    container.innerHTML = '';

    if (!featuredNews.length) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
          <i class="fa-regular fa-newspaper fs-2"></i>
          <p class="mt-2">No Featured Highlights available right now.</p>
        </div>`;
      return;
    }

    featuredNews.forEach((n, index) => {
      const img = n.ImageURL || '/images/default-news.jpg';
      const date = formatDateTime(n.PublishedOn);;
      const delay = 150 * index; // animation delay

      const card = `
  <div class="featured-item" data-aos="zoom-in" data-aos-delay="${delay}">
    <div class="featured-card flex-fill">
      <div class="featured-tag">FEATURED</div>
      <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.jpg'">
      <div class="card-overlay"></div>
      <div class="featured-body">
        <div class="featured-title">${n.Title}</div>
        <div class="featured-content">${n.Content || ''}</div>
        <div class="featured-footer">
          <span>📅 ${date}</span>
          <button class="featured-read-btn" onclick="openArticle(${n.ArticleID})">Read More</button>
        </div>
      </div>
    </div>
  </div>`;

      container.insertAdjacentHTML('beforeend', card);
    });

  } catch (err) {
    console.error('loadHighlightsFeatured error:', err);
  }
}
loadHighlightsFeatured();

// 🔝 Scroll to Top Button Logic
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollTopBtn.classList.add("show");
  } else {
    scrollTopBtn.classList.remove("show");
  }
});

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

document.getElementById('newsletterForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = e.target.querySelector('input').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast(data.message || 'Subscription successful! 🎉', 'success');
      e.target.reset();
    } else {
      showToast(data.message || 'Subscription failed, please try again.', 'error');
    }
  } catch (err) {
    console.error('❌ Newsletter subscribe error:', err);
    showToast('Something went wrong. Please try again later.', 'error');
  }
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    background: type === 'success' ? '#28a745' :
      type === 'warning' ? '#ffc107' :
        type === 'error' ? '#dc3545' : '#17a2b8',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1050,
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = '1'), 100);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

async function loadNewsArticles() {
  const container = document.getElementById('newsCategoriesSection');
  container.innerHTML = '<p>Loading news...</p>';

  try {
    const res = await fetch('/api/news/categories/admin', { cache: 'no-store' });
    const categories = await res.json();

    if (!categories.length) {
      container.innerHTML = '<p>No news available</p>';
      return;
    }

    container.innerHTML = '';

    categories.forEach(cat => {
      if (!cat.Articles || cat.Articles.length === 0) return;

      // Category Section Wrapper
      const safeId = encodeURIComponent(cat.CategoryName);
      const catDiv = document.createElement('div');
      catDiv.className = 'mb-5';
      catDiv.innerHTML = `
  <h3 class="category-header mb-3" id="${safeId}">${cat.CategoryName}</h3>
  <div class="news-grid"></div>
`;

      const gridDiv = catDiv.querySelector('.news-grid');

      // Article Cards
      cat.Articles.forEach(article => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'news-item';
        cardDiv.innerHTML = `
          <div class="card news-card h-100 shadow-sm border-0" data-aos="fade-up">
            <div class="card-img-container">
              <img src="${article.ImageURL}" class="card-img-top" alt="${article.Title}" onerror="this.src='/images/default-news.jpg';">
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title fw-bold mb-2">${article.Title}</h5>
              <p class="card-text text-truncate mb-3">${article.Content}</p>
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <small class="text-muted">${formatDateTime(article.PublishedOn)}</small>
                <div>
                  <i class="fa-solid fa-heart text-danger me-1"></i> ${article.LikesCount}
                  <i class="fa-solid fa-comment text-secondary ms-3 me-1"></i> ${article.CommentsCount}
                </div>
              </div>
            </div>
          </div>
        `;
        gridDiv.appendChild(cardDiv);
      });

      container.appendChild(catDiv);
    });

  } catch (err) {
    container.innerHTML = '<p>Error loading news</p>';
    console.error(err);
  }
}
loadNewsArticles();

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

async function loadMostReadNews() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    const validNews = (Array.isArray(news) ? news : []).filter(
      n => n.IsActive && n.IsApproved
    );

    const mostRead = validNews
      .sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0))
      .slice(0, 6);

    const container = document.getElementById('mostReadList');
    container.innerHTML = '';

    if (!mostRead.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="fa-regular fa-eye-slash fs-2"></i>
          <p class="mt-2">No Most Read News available right now.</p>
        </div>`;
      return;
    }

    mostRead.forEach((n, i) => {
      const img = n.ImageURL || '/images/default-news.jpg';
      const date = formatDateTime(n.PublishedOn);
      const delay = 100 * i;

      const snippet = (n.Content || '').length > 160
        ? n.Content.substring(0, 160) + '...'
        : n.Content || '';

      const card = `
        <div class="most-read-item" data-aos="fade-right" data-aos-delay="${delay}">
          <div class="timeline-dot"></div>
          <img src="${img}" alt="${n.Title}" class="most-read-img" onerror="this.src='/images/default-news.jpg'">
          <div class="most-read-content">
            <div>
              <div class="most-read-title">${n.Title}</div>
              <div class="most-read-snippet">${snippet}</div>
            </div>
            <div class="most-read-footer">
              <span><i class="fa-solid fa-eye"></i> ${n.ViewCount || 0} views</span>
              <span><i class="fa-regular fa-calendar"></i> ${date}</span>
              <button class="most-read-btn" onclick="openArticle(${n.ArticleID})">Read More</button>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', card);
    });
  } catch (err) {
    console.error('loadMostReadNews error:', err);
  }
}
loadMostReadNews();

function openArticle(articleId) {
  // Redirect to article.html with the articleId as a query parameter
  window.location.href = `article_en.html?id=${articleId}`;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return d.toLocaleString('en-US', options);
}

async function loadComments(articleId) {
  const listEl = document.getElementById('commentsList');
  listEl.innerHTML = '<div class="muted-small">Loading comments...</div>';
  try {
    const r = await fetch(`/api/news/${articleId}/comments`); // ✅ corrected endpoint
    const j = await r.json();
    const comments = j.success ? j.data : [];

    listEl.innerHTML = comments.length
      ? comments.map(c =>
        `<div class="comment mb-2">
          <strong>${c.Name || 'Guest'}</strong> 
          <small>${new Date(c.CreatedOn).toLocaleString()}</small>
          <div>${c.Text}</div>
        </div>`
      ).join('')
      : '<div class="muted-small">No comments yet</div>';
  } catch (err) {
    listEl.innerHTML = '<div class="text-danger">Cannot load comments</div>';
    console.error('loadComments error:', err);
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

async function loadSpotlightCollage() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    const validNews = (Array.isArray(news) ? news : []).filter(
      n => n.IsActive && n.IsApproved
    );

    const spotlight = validNews
      .sort((a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn))
      .slice(0, 12); // max 12 for collage

    const container = document.getElementById('spotlightCollage');
    container.innerHTML = '';

    if (!spotlight.length) {
      container.innerHTML = `<div class="text-center text-muted py-5">
        <i class="fa-regular fa-eye-slash fs-2"></i>
        <p class="mt-2">No Spotlight News available right now.</p>
      </div>`;
      return;
    }

    spotlight.forEach(n => {
      const img = n.ImageURL || '/images/default-news.jpg';
      const date = new Date(n.PublishedOn).toLocaleDateString();
      const card = `
        <div class="spotlight-collage-item" onclick="openArticle(${n.ArticleID})">
          <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.jpg'">
          <div class="spotlight-collage-overlay">
            <div class="spotlight-collage-title">${n.Title}</div>
            <div class="spotlight-collage-footer">
              <span>${date}</span>
              <button class="spotlight-collage-btn">Read More</button>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', card);
    });
  } catch (err) {
    console.error('loadSpotlightCollage error:', err);
  }
}

loadSpotlightCollage();

// ---------- INIT ----------
document.getElementById('siteLogo').addEventListener('error', () => { document.getElementById('siteLogo').src = SITE.logoPath; });



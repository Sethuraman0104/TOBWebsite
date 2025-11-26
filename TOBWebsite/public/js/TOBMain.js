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

// ---------------- Live Weather ----------------
async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.22&longitude=50.58&current_weather=true');
    const data = await res.json();
    const temp = data?.current_weather?.temperature ?? '--';
    const code = data?.current_weather?.weathercode ?? 0;
    const weatherCodes = {
      0: 'Clear ☀️', 1: 'Mainly Clear 🌤️', 2: 'Partly Cloudy ⛅', 3: 'Cloudy ☁️', 45: 'Fog 🌫️', 61: 'Light Rain 🌦️', 63: 'Moderate Rain 🌧️', 80: 'Showers 🌦️'
    };
    document.getElementById('weatherTemp').textContent = `${temp}°C`;
    document.getElementById('weatherText').textContent = weatherCodes[code] || 'Clear';
    // change icon dynamically
    const iconEl = document.getElementById('weatherIcon');
    if (code === 0) { iconEl.innerHTML = '<i class="fa-solid fa-sun text-warning fs-4"></i>'; }
    else if (code === 1) { iconEl.innerHTML = '<i class="fa-solid fa-cloud-sun text-warning fs-4"></i>'; }
    else if (code === 2) { iconEl.innerHTML = '<i class="fa-solid fa-cloud-sun text-secondary fs-4"></i>'; }
    else if (code === 3) { iconEl.innerHTML = '<i class="fa-solid fa-cloud text-secondary fs-4"></i>'; }
    else if (code === 45) { iconEl.innerHTML = '<i class="fa-solid fa-smog text-secondary fs-4"></i>'; }
    else if ([61, 63, 80].includes(code)) { iconEl.innerHTML = '<i class="fa-solid fa-cloud-rain text-primary fs-4"></i>'; }
  } catch {
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

// Load Trends + Ticker
async function loadTrendsTicker() {
  const tickerInner = document.getElementById('trendsTickerInner');
  const trendsContainer = document.getElementById('trendsSection');

  tickerInner.innerHTML = 'Loading trends...';
  trendsContainer.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading trending articles...
        </div>
    `;

  try {
    const res = await fetch('/api/trends', { cache: 'no-store' });
    const data = await res.json();
    const trends = Array.isArray(data) ? data : (data.success ? data.data : []);

    if (!trends.length) {
      tickerInner.innerHTML = `<span>No active trends</span>`;
      trendsContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fa-regular fa-circle-xmark"></i> No active trending articles.
                </div>`;
      return;
    }

    // 🟦 ----------------------
    // 1️⃣ Ticker Section
    // 🟦 ----------------------
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
                <img src="${img}" alt="${title}"
                     onerror="this.src='/images/default-trend.jpg';" />
                <div class="trend-label">
                    <i class="fa-solid fa-bolt"></i>
                    <small>${title}</small>
                </div>
            `;
      tickerFragment.appendChild(a);
    });

    // Duplicate for seamless scrolling
    tickerInner.appendChild(tickerFragment);
    tickerInner.appendChild(tickerFragment.cloneNode(true));

    // Restart the animation to avoid flicker / ensure seamless loop
    tickerInner.style.animation = 'none';
    void tickerInner.offsetWidth; // Force reflow
    tickerInner.style.animation = ''; // Reapply CSS animation

    // 🟥 ----------------------
    // 2️⃣ Trending Cards Section
    // 🟥 ----------------------
    // 2️⃣ Trending Cards Section (revamped)
    trendsContainer.innerHTML = `<div class="TOBTrends-selectable-grid">` +
      trends.map(t => {
        const img = t.ImageURL || '/images/default-trend.jpg';
        const title = t.TrendTitle_EN || 'Untitled Trend';
        const content = t.TrendDescription_EN || 'No description available.';
        const date = t.CreatedOn ? formatDate(t.CreatedOn) : '';

        return `
      <div class="TOBTrends-selectable-banner" data-aos="fade-up" data-aos-duration="900">
        <img src="${img}" alt="${title}" onerror="this.src='/images/default-trend.jpg';" />
        <div class="TOBTrends-selectable-body">
          <h5 class="TOBTrends-selectable-title">${title}</h5>
          <p class="TOBTrends-selectable-text">${content}</p>
          <div class="TOBTrends-selectable-footer">
            <span class="trend-date">📅 ${date}</span>
            <button class="read-more-btn" onclick="openTrendArticle(${t.TrendID})">
              <i class="fa-solid fa-book-open"></i> Read More
            </button>
          </div>
        </div>
      </div>
    `;
      }).join('') +
      `</div>`;
  } catch (err) {
    console.error(err);
    tickerInner.innerHTML = 'Error loading trends';
    trendsContainer.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="fa-solid fa-triangle-exclamation"></i> Failed to load trending articles.
            </div>`;
  }
}
// Initialize
document.addEventListener('DOMContentLoaded', loadTrendsTicker);
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

    // Reset all containers
    Object.values(positions).flat().forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
        if (el.carouselInterval) clearInterval(el.carouselInterval);
      }
    });

    // Populate ads
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

        // Determine wrapper height based on largest ad
        const maxHeight = filteredAds.reduce((max, ad) => {
          switch ((ad.Size || '').toLowerCase()) {
            case 'small': return Math.max(max, 150);
            case 'medium': return Math.max(max, 250);
            case 'large': return Math.max(max, 400);
            default: return Math.max(max, 250);
          }
        }, 0);

        // Create carousel wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'ad-carousel-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = `${maxHeight}px`;

        // Add Advertisement Label
        const adLabel = document.createElement('div');
        adLabel.className = 'ad-label';
        adLabel.innerText = 'ADVERTISEMENT';
        wrapper.appendChild(adLabel);

        // Add each ad
        filteredAds.forEach((ad, index) => {
          const sizeClass = ad.Size ? `ad-${ad.Size.toLowerCase()}` : 'ad-medium';

          const adDiv = document.createElement('div');
          adDiv.className = `ad-card ${sizeClass}`;
          adDiv.style.opacity = index === 0 ? '1' : '0';

          // Click overlay (optional)
          const clickOverlay = document.createElement('div');
          clickOverlay.style.position = 'absolute';
          clickOverlay.style.top = '0';
          clickOverlay.style.left = '0';
          clickOverlay.style.width = '100%';
          clickOverlay.style.height = '100%';
          clickOverlay.style.cursor = 'pointer';
          clickOverlay.style.zIndex = '5';
          clickOverlay.title = 'Click to view';

          clickOverlay.addEventListener('click', () => {
            window.open(ad.LinkURL || '#', '_blank');
          });

          const adImg = document.createElement('img');
          adImg.src = ad.ImageURL;
          adImg.alt = ad.Title;
          adImg.onerror = () => { adImg.src = '/images/default-ad.jpg'; };

          adDiv.appendChild(adImg);
          adDiv.appendChild(clickOverlay);
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


async function loadTopStories() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();
    const allNews = Array.isArray(news) ? news : [];

    // Filter only active & approved
    const activeNews = allNews
      .filter(n => n.IsActive && n.IsApproved)
      .sort((a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn)); // Descending by date

    if (!activeNews.length) return;

    // --- Top Stories (IsTopStory = 1) ---
    const topStories = activeNews.filter(n => n.IsTopStory == 1);
    const carousel = document.getElementById('topStoriesCarousel');
    carousel.innerHTML = '';

    topStories.forEach(n => {
      let images = Array.isArray(n.ImagesURLs) ? n.ImagesURLs : [];
      if (n.MainSlideImage && !images.includes(n.MainSlideImage)) images.unshift(n.MainSlideImage);
      images = images.filter(Boolean).slice(0, 5);

      // Grid layout based on number of images
      let gridTemplate;
      switch (images.length) {
        case 1: gridTemplate = 'grid-template-columns:1fr; grid-template-rows:1fr;'; break;
        case 2: gridTemplate = 'grid-template-columns:1fr 1fr; grid-template-rows:1fr;'; break;
        case 3: gridTemplate = 'grid-template-columns:2fr 1fr; grid-template-rows:1fr 1fr;'; break;
        case 4: gridTemplate = 'grid-template-columns:2fr 1fr; grid-template-rows:1fr 1fr;'; break;
        default: gridTemplate = 'grid-template-columns:2fr 1fr 1fr; grid-template-rows:2fr 1fr;'; break;
      }

      let collageHtml = `<div class="collage-grid" style="${gridTemplate}">`;
      images.forEach((img, index) => {
        collageHtml += `<div class="collage-item collage-item-${index + 1}">
                          <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.png'">
                        </div>`;
      });
      collageHtml += `</div>`;

      const category = n.CategoryName || 'General';
      const published = formatDateTime(n.PublishedOn);

      carousel.innerHTML += `
        <div class="item">
          ${collageHtml}
          <div class="carousel-category">${category}</div>
          <div class="carousel-overlay">
            <div class="carousel-date">📅 ${published}</div>
            <h3 class="carousel-title">${n.Title}</h3>
            <p>${n.Summary || ''}</p>
            <button class="btn read-more-btn" onclick="openArticle(${n.ArticleID})">
              <i class="fa-solid fa-book-open"></i> Read More
            </button>
          </div>
        </div>
      `;
    });

    try { $('#topStoriesCarousel').owlCarousel('destroy'); } catch (e) { }
    $('#topStoriesCarousel').owlCarousel({
      items: 1,
      loop: true,
      autoplay: true,
      autoplayTimeout: 5000,
      smartSpeed: 800,
      dots: true,
      nav: false
    });

    adjustCarouselHeight();

    // --- Latest News (all active & approved, descending) ---
    loadLatestNews(activeNews);

  } catch (err) {
    console.error('Error loading top stories:', err);
  }
}

function loadLatestNews(news) {
  const latestContainer = document.getElementById('latestNewsCards');
  latestContainer.innerHTML = '<div class="scroll-wrapper"></div>';
  const wrapper = latestContainer.querySelector('.scroll-wrapper');

  news.forEach(n => {
    const img = n.MainSlideImage || '/images/default-news.png';
    wrapper.innerHTML += `
      <div class="side-news-card">
        <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.png'">
        <div class="side-news-card-body">
          <h5>${n.Title}</h5>
          <p>${n.Summary || ''}</p>
          <div class="card-footer">
            <small>📅 ${formatDateTime(n.PublishedOn)}</small>
            <button class="read-more-btn" onclick="openArticle(${n.ArticleID})">
              Read More <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>`;
  });

  if (news.length > 3) wrapper.innerHTML += wrapper.innerHTML; // Duplicate for smooth scroll
}

function adjustCarouselHeight() {
  const carousel = document.getElementById('topStoriesCarousel');
  const latest = document.querySelector('.latest-news-container');
  if (!carousel || !latest) return;
  const latestHeight = latest.offsetHeight;
  carousel.querySelectorAll('.item').forEach(item => {
    item.style.height = latestHeight + 'px';
  });
  carousel.style.height = latestHeight + 'px';
}

window.addEventListener('load', () => {
  loadTopStories();
  setTimeout(adjustCarouselHeight, 500);
});
window.addEventListener('resize', adjustCarouselHeight);

async function loadHighlightsFeatured() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    // Filter active, approved, and featured news
    const featuredNews = (Array.isArray(news) ? news : [])
      .filter(n => n.IsActive && n.IsApproved && n.IsFeatured == 1)
      .sort((a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn)); // Descending by date

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
      // Use MainSlideImage if available, fallback to default
      const img = n.MainSlideImage || n.ImageURL || '/images/default-news.png';
      const date = formatDateTime(n.PublishedOn);
      const delay = 150 * index; // animation delay

      const card = `
        <div class="featured-item" data-aos="zoom-in" data-aos-delay="${delay}">
          <div class="featured-card flex-fill">
            <div class="featured-tag">FEATURED</div>
            <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.png'">
            <div class="card-overlay"></div>
            <div class="featured-body">
              <div class="featured-title">${n.Title}</div>
              <div class="featured-content">${n.Content || ''}</div>
              <div class="featured-footer">
                <span>📅 ${date}</span>
                <button class="featured-read-btn" onclick="openArticle(${n.ArticleID})">
                  <i class="fa-solid fa-book-open"></i> Read More
                </button>
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
// Initialize
window.addEventListener('load', loadHighlightsFeatured);

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

// ------------------
// Category → Icon Map
// ------------------
const CATEGORY_ICONS = {
  "Home": "fa-home",
  "Breaking News": "fa-bolt",

  "Local News": "fa-location-dot",
  "Bahrain": "fa-flag",
  "GCC": "fa-globe",
  "Saudi Arabia": "fa-kaaba",
  "UAE": "fa-building-columns",
  "Oman": "fa-water",
  "Kuwait": "fa-oil-can",
  "Qatar": "fa-wind",

  "World News": "fa-earth-americas",

  "Culture": "fa-landmark",
  "Business": "fa-briefcase",
  "Health": "fa-heart-pulse",
  "Education": "fa-book",
  "Others": "fa-layer-group",

  "Political": "fa-gavel",
  "Entertainment": "fa-film",
  "Lifestyle": "fa-masks-theater",
  "Technology": "fa-microchip",
  "Travel": "fa-plane",
  "Society & People": "fa-users",
  "Fitness": "fa-dumbbell",
  "Covid-19": "fa-virus-covid",

  "TOB Reporter": "fa-user-pen",
  "TOB Investigation": "fa-search",
  "TOB Life Story": "fa-book-open",
  "TOB Social": "fa-comments",
  "TOB Weekend": "fa-sun",

  "India": "fa-landmark-flag",
  "Kerala": "fa-umbrella-beach",
  "New Delhi": "fa-building",

  "Bangladesh": "fa-water",

  "Sports": "fa-football",
  "Cricket": "fa-baseball-bat-ball",
  "Football": "fa-futbol",
  "Basketball": "fa-basketball",
  "Handball": "fa-hand-fist",
  "Volleyball": "fa-volleyball",
  "Hockey": "fa-hockey-stick-puck",
  "Tennis": "fa-table-tennis-paddle-ball",
  "Athletics": "fa-person-running",
  "Gymnastics": "fa-child-reaching",
  "Boxing": "fa-hand-fist",
  "Wrestling": "fa-people-arrows",
  "Golf": "fa-golf-ball-tee",
  "Badminton": "fa-shuttlecock",

  "Default": "fa-newspaper"
};


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

      const safeId = encodeURIComponent(cat.CategoryName);
      const icon = CATEGORY_ICONS[cat.CategoryName] || CATEGORY_ICONS["Default"];

      // Breaking if any article is flagged as Breaking
      const hasBreaking = cat.Articles.some(a => a.IsBreakingNews === true);

      // left big + right small
      const [bigStory, ...smallStories] = cat.Articles;

      const html = `
        <div class="category-block mb-5">

          <h3 class="category-header" id="${safeId}">
            <i class="fa-solid ${icon}"></i>
            ${cat.CategoryName}

            ${hasBreaking ? `<span class="breaking-ribbon">BREAKING</span>` : ""}
          </h3>

          <div class="category-grid">

            <!-- LEFT BIG STORY -->
            <div class="category-big-box" onclick="openArticle(${bigStory.ArticleID})">
              <img src="${bigStory.MainSlideImage || bigStory.ImageURL || "/images/default-news.png"}">

              <div class="category-big-overlay">
                <div class="d-flex align-items-center mb-1">
                  ${bigStory.IsLive ? `<span class="live-badge">LIVE</span>` : ""}
                  <span class="category-big-title">${bigStory.Title}</span>
                </div>
                <div class="category-big-meta">📅 ${formatDateTime(bigStory.PublishedOn)}</div>
              </div>
            </div>

            <!-- RIGHT SMALL STORIES -->
            <div class="category-list-box">
              ${smallStories.slice(0, 5).map(a => `
                <div class="category-list-item" onclick="openArticle(${a.ArticleID})">
                  <img class="category-list-thumb" src="${a.MainSlideImage || a.ImageURL || '/images/default-news.png'}">
                  <div>
                    <div class="category-list-title">
                      ${a.IsLive ? `<span class="live-badge">LIVE</span>` : ""} 
                      ${a.Title}
                    </div>
                    <div style="font-size: 0.85rem; color: #777">📅 ${formatDateTime(a.PublishedOn)}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', html);
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
      n => n.IsActive && n.IsApproved && (n.ViewCount || 0) > 0   // 🔥 Remove ViewCount = 0
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
      // 🔥 Priority: MainSlideImage > ImageURL > default
      const img =
        n.MainSlideImage && n.MainSlideImage.trim() !== ""
          ? n.MainSlideImage
          : n.ImageURL && n.ImageURL.trim() !== ""
            ? n.ImageURL
            : '/images/default-news.png';

      const date = formatDateTime(n.PublishedOn);
      const delay = 100 * i;

      const snippet =
        (n.Content || '').length > 160
          ? n.Content.substring(0, 160) + '...'
          : n.Content || '';

      const card = `
        <div class="most-read-item" data-aos="fade-right" data-aos-delay="${delay}">
          <div class="timeline-dot"></div>
          <img src="${img}" alt="${n.Title}" class="most-read-img"
               onerror="this.src='/images/default-news.png'">

          <div class="most-read-content">
            <div>
              <div class="most-read-title">${n.Title}</div>
              <div class="most-read-snippet">${snippet}</div>
            </div>

            <div class="most-read-footer">
              <span><i class="fa-solid fa-eye"></i> ${n.ViewCount}</span>
              <span>📅 ${date}</span>
              <button class="most-read-btn" onclick="openArticle(${n.ArticleID})">
                <i class="fa-solid fa-book-open"></i> Read More
              </button>
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

function openArticle(articleId) {
  // Redirect to article.html with the articleId as a query parameter
  window.location.href = `article_en.html?id=${articleId}`;
}

function openTrendArticle(trendId) {
  // Redirect to article.html with the articleId as a query parameter
  window.location.href = `trendsarticle_en.html?id=${trendId}`;
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

    // Filter active, approved, and featured news
    const validNews = (Array.isArray(news) ? news : [])
      .filter(n => n.IsActive && n.IsApproved && n.IsSpotlightNews == 1)
      .sort((a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn)); // Descending by date

    // Sort newest first and pick top 12
    const spotlight = validNews
      .sort((a, b) => new Date(b.PublishedOn) - new Date(a.PublishedOn))
      .slice(0, 12);

    const container = document.getElementById('spotlightCollage');
    container.innerHTML = '';

    if (!spotlight.length) {
      container.innerHTML = `
        <div class="spotlight-empty">
          <i class="fa-regular fa-eye-slash"></i>
          <p>No Spotlight News available right now.</p>
        </div>`;
      return;
    }

    spotlight.forEach((n, index) => {
      // Use MainSlideImage first, fallback to ImageURL or default
      const img = n.MainSlideImage || n.ImageURL || '/images/default-news.png';
      const date = formatDate(n.PublishedOn);
      const category = n.CategoryName || "General";

      container.insertAdjacentHTML(
        'beforeend',
        `
        <div class="spotlight-item ${index === 0 ? 'spotlight-item-large' : ''}" 
             onclick="openArticle(${n.ArticleID})">

          <!-- Image -->
          <img src="${img}" alt="${n.Title}" 
               onerror="this.src='/images/default-news.png'">

          <!-- Category Tag -->
          <div class="spotlight-category">${category}</div>

          <!-- Overlay -->
          <div class="spotlight-overlay">
            <div class="spotlight-title">${n.Title}</div>

            <div class="spotlight-footer">
              <span>📅 ${date}</span>
              <div class="spotlight-read-btn">
                <i class="fa-solid fa-book-open"></i> Read
              </div>
            </div>
          </div>
        </div>
      `
      );
    });
  } catch (err) {
    console.error('Spotlight error:', err);
  }
}
window.addEventListener('load', loadSpotlightCollage);

// ---------- INIT ----------
document.getElementById('siteLogo').addEventListener('error', () => { document.getElementById('siteLogo').src = SITE.logoPath; });



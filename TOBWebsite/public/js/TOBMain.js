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

// ---------- DATE & TIME ----------
function updateDateTime() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  document.getElementById('currentDateTime').innerText = now.toLocaleDateString('en-US', opts);
  document.getElementById('currentTimeSmall').innerText = now.toLocaleTimeString('en-US');
  document.getElementById('copyYear').innerText = now.getFullYear();
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ---------- MAP ----------
const map = L.map('map', { scrollWheelZoom: false }).setView([SITE.mapLat, SITE.mapLng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
L.marker([SITE.mapLat, SITE.mapLng]).addTo(map).bindPopup('Our Office').openPopup();

// ---------- WEATHER ----------
async function loadWeather() {
  try {
    const apiKey = 'YOUR_OPENWEATHER_API_KEY';
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${SITE.mapLat}&lon=${SITE.mapLng}&units=metric&appid=${apiKey}`);
    const j = await r.json();
    document.getElementById('weatherText').innerText = j.weather?.[0]?.description || '';
    document.getElementById('weatherTemp').innerText = j.main ? `${Math.round(j.main.temp)}°C` : '';
  } catch (e) {
    console.warn('weather load failed', e);
  }
}
loadWeather();

document.addEventListener("DOMContentLoaded", () => {

  // Animate trending strip
  const trendsStrip = document.getElementById("trendsStrip");
  let scrollPos = 0;
  function scrollTrends() {
    if(trendsStrip.scrollWidth > trendsStrip.clientWidth){
      scrollPos += 1;
      if(scrollPos > trendsStrip.scrollWidth - trendsStrip.clientWidth) scrollPos = 0;
      trendsStrip.scrollTo({ left: scrollPos, behavior:'smooth' });
    }
    requestAnimationFrame(scrollTrends);
  }
  scrollTrends();
});

async function loadTrends() {
  const strip = document.getElementById('trendsStrip');
  strip.innerHTML = '<div class="muted-small">Loading trends...</div>';

  try {
    const res = await fetch(`/api/trends`, { cache: 'no-store' });
    const data = await res.json();
    const trends = Array.isArray(data) ? data : (data.success ? data.data : []);

    if (!trends.length) {
      strip.innerHTML = '<div class="muted-small">No active trends found</div>';
      return;
    }

    strip.innerHTML = '';
    trends.slice(0, 10).forEach(t => {
      const img = t.ImageURL || '/images/default-trend.jpg';
      const title = t.TrendTitle_EN || "Trend";
      const link = t.TrendLink || '#';
      const a = document.createElement('a');
      a.className = 'trend-item text-decoration-none text-reset';
      a.href = link;
      a.innerHTML = `<img src="${img}" alt="${title}" onerror="this.src='/images/default-trend.jpg';" />
                     <div><small>${title}</small></div>`;
      strip.appendChild(a);
    });

  } catch (err) {
    strip.innerHTML = '<div class="text-danger">⚠️ Error loading trends</div>';
    console.error('loadTrends error:', err);
  }
}

// ---------- LOAD NEWS ----------
async function loadNews() {
  const container = document.getElementById('newsContainer');
  const featured = document.getElementById('featuredCarousel');
  container.innerHTML = '<div class="muted-small">Loading news...</div>';

  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();
    const filteredNews = (Array.isArray(news) ? news : []).filter(n => n.IsActive && n.IsApproved);

    if (!filteredNews.length) {
      container.innerHTML = '<div class="muted-small">No published news found</div>';
      featured.innerHTML = '';
      return;
    }

    // 2x2 Grid (fixed height cards)
    container.innerHTML = `<div class="news-grid-2x2">${filteredNews.slice(0,4).map(n => `
      <div class="news-card-2x2">
        <div class="news-img-wrapper">
          <img src="${n.ImageURL || '/images/default-news.jpg'}" alt="${n.Title}" onerror="this.src='/images/default-news.jpg';" />
        </div>
        <div class="news-body">
          <h3>${n.Title || "Article"}</h3>
          <p>${(n.Content || '').substring(0, 120)}...</p>
          <div class="info">
            <span>📅 ${formatDateTime(n.PublishedOn)}</span>
            <span>👍 ${n.LikesCount || 0}</span>
            <span>💬 ${n.CommentsCount || 0}</span>
          </div>
          <div class="news-actions">
            <button class="btn action-btn read-btn" onclick="openArticle(${n.ArticleID})">
              <i class="fa-solid fa-book-open"></i> Read
            </button>
          </div>
        </div>
      </div>`).join('')}</div>`;

    // Featured Carousel Section (modern overlay design)
featured.innerHTML = '';
filteredNews.slice(0, 6).forEach(n => {
  const img = n.ImageURL || '/images/default-news.jpg';
  const item = document.createElement('div');
  item.className = 'featured-slide';
  item.innerHTML = `
    <div class="featured-card">
      <img src="${img}" alt="${n.Title}" onerror="this.src='/images/default-news.jpg';" />
      <div class="featured-overlay">
        <div class="featured-info">
          <h3>${n.Title}</h3>
          <p class="featured-meta">📅 ${formatDateTime(n.PublishedOn || n.CreatedOn)}</p>
          <button class="btn btn-gradient" onclick="openArticle(${n.ArticleID})">
            <i class="fa-solid fa-book-open"></i> Read More
          </button>
        </div>
      </div>
    </div>`;
  featured.appendChild(item);
});

try { $('.latest-news-carousel').owlCarousel('destroy'); } catch (e) {}

$('.latest-news-carousel').owlCarousel({
  autoplay: true,
  loop: true,
  nav: true,
  dots: true,
  items: 1,
  autoplayTimeout: 5000,
  smartSpeed: 1000,
  animateOut: 'fadeOut',
  animateIn: 'fadeIn',
});


  } catch (err) {
    container.innerHTML = '<div class="text-danger">Error loading news</div>';
    console.error('loadNews error:', err);
  }
}


function formatDateTime(dt) {
  if (!dt) return '—';
  const date = new Date(dt);
  if (isNaN(date)) return dt;
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function openArticle(articleID) {
  try {
    // 1️⃣ Get all admin news
    const res = await fetch('/api/news/admin');
    const news = await res.json();
    
    // 2️⃣ Filter by ArticleID
    const article = news.find(n => n.ArticleID === articleID);
    if (!article) return alert('Article not found');

    const a = article;
    const title = SITE.lang === 'ar' ? (a.Title_Ar || a.Title) : (a.Title || a.Title_Ar);
    const content = SITE.lang === 'ar' ? (a.Content_Ar || a.Content) : (a.Content || a.Content_Ar);
    const image = a.ImageURL || 'images/default-news.jpg';
    const author = a.AuthorName || 'Admin';
    const published = a.PublishedOn || a.CreatedOn
      ? new Date(a.PublishedOn || a.CreatedOn).toLocaleString()
      : '—';

    document.getElementById('articleTitle').innerText = title;
    document.getElementById('articleImage').src = image;
    document.getElementById('articleMeta').innerText = `By ${author} • ${published}`;
    document.getElementById('articleContent').innerHTML = content;

    loadComments(articleID);

    new bootstrap.Modal(document.getElementById('articleModal')).show();

  } catch (err) {
    console.error('openArticle error:', err);
    alert('Failed to open article');
  }
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


// ---------- INIT ----------
loadTrends();
loadNews();
document.getElementById('siteLogo').addEventListener('error', () => { document.getElementById('siteLogo').src = SITE.logoPath; });

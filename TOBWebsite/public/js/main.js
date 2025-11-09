let currentLang = 'en';

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langToggle').textContent = currentLang === 'ar' ? 'English' : 'العربية';
  document.getElementById('pageTitle').textContent = currentLang === 'ar' ? 'أخبار البحرين' : 'News Times of Bahrain';
  loadNews();
});

async function loadNews() {
  try {
    const response = await fetch(`/api/news?lang=${currentLang}`, { cache: 'no-store' });
    const news = await response.json();

    // Filter only active and approved news
    const filteredNews = news.filter(n => n.IsActive && n.IsApproved);

    const container = document.getElementById('newsContainer');
    if (filteredNews.length) {
      container.innerHTML = filteredNews.map(n => `
        <div class="news-card">
          ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}"/>` : ''}
          <h2>${n.Title}</h2>
          <p>${n.Content.substring(0, 250)}...</p>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-muted">No news available.</p>';
    }

  } catch (error) {
    console.error('Error loading news:', error);
    document.getElementById('newsContainer').innerHTML = '<p class="text-danger">Failed to load news.</p>';
  }
}

loadNews();

let currentLang = 'en';

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langToggle').textContent = currentLang === 'ar' ? 'English' : 'العربية';
  document.getElementById('pageTitle').textContent = currentLang === 'ar' ? 'أخبار البحرين' : 'News Times of Bahrain';
  loadNews();
});

async function loadNews(articleId = 12) { // default to ID 12
  try {
    const response = await fetch(`/api/news/${articleId}`, { cache: 'no-store' });
    const result = await response.json();

    const container = document.getElementById('newsContainer');

    if (result.success && result.data) {
      const n = result.data;

      // Only show if active and approved
      if (n.IsActive && n.IsApproved) {
        container.innerHTML = `
          <div class="news-card">
            ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}"/>` : ''}
            <h2>${n.Title}</h2>
            <p>${n.Content.substring(0, 250)}...</p>
          </div>
        `;
      } else {
        container.innerHTML = '<p class="text-muted">This article is not available.</p>';
      }

    } else {
      container.innerHTML = '<p class="text-muted">Article not found.</p>';
    }

  } catch (error) {
    console.error('Error loading article:', error);
    document.getElementById('newsContainer').innerHTML = '<p class="text-danger">Failed to load article.</p>';
  }
}

// Call the function
loadNews(12);


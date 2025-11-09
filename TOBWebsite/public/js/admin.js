const postNewsForm = document.getElementById('postNewsForm');
const postNewsMsg = document.getElementById('postNewsMsg');
const pendingNewsContainer = document.getElementById('pendingNewsContainer');
const allNewsEngagementContainer = document.getElementById('allNewsEngagement');
const filterMonthInput = document.getElementById('filterMonth');
const applyFilterBtn = document.getElementById('applyFilter');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editNewsForm');
const closeModal = editModal.querySelector('.close');
const inactiveNewsContainer = document.getElementById('inactiveNewsContainer');
const newsSearchInput = document.getElementById('newsSearch');
const logoutBtn = document.getElementById('logoutBtn');

newsSearchInput.addEventListener('input', () => {
  const query = newsSearchInput.value.trim().toLowerCase();
  filterNews(query);
});

logoutBtn.addEventListener('click', async () => {
  // Ask for confirmation
  const confirmLogout = window.confirm("Are you sure you want to logout?");
  if (!confirmLogout) return; // Do nothing if user clicks "Cancel"

  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.success) {
      // Redirect to login page
      window.location.href = '/login';
    } else {
      alert('Logout failed: ' + data.message);
    }
  } catch (err) {
    console.error('Logout error:', err);
    alert('An error occurred while logging out.');
  }
});

function filterNews(query) {
  // Pending / Unpublished News
  const pendingCards = pendingNewsContainer.querySelectorAll('.news-card');
  pendingCards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const content = card.querySelector('p')?.textContent.toLowerCase() || '';
    card.style.display = title.includes(query) || content.includes(query) ? '' : 'none';
  });

  // Published News
  const publishedCards = allNewsEngagementContainer.querySelectorAll('.news-card');
  publishedCards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const content = card.querySelector('p')?.textContent.toLowerCase() || '';
    card.style.display = title.includes(query) || content.includes(query) ? '' : 'none';
  });

  // Deactivated News
  const inactiveCards = inactiveNewsContainer.querySelectorAll('.news-card');
  inactiveCards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const content = card.querySelector('p')?.textContent.toLowerCase() || '';
    card.style.display = title.includes(query) || content.includes(query) ? '' : 'none';
  });
}

// --------------------
// Sidebar nav
// --------------------
const menuItems = document.querySelectorAll('.sidebar .menu li');
const sections = document.querySelectorAll('.section');
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    // Remove active classes from menu items and sections
    menuItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    // Set clicked item as active
    item.classList.add('active');
    document.getElementById(item.dataset.section).classList.add('active');

    // Clear search input
    newsSearchInput.value = '';
    filterNews('');

    // Show search only for Unpublished, Published, and Deactivated News
    if (['pending', 'allnews', 'inactive'].includes(item.dataset.section)) {
      newsSearchInput.style.display = 'inline-block';
    } else {
      newsSearchInput.style.display = 'none';
    }
  });
});

// --------------------
// Post News
// --------------------
postNewsForm.onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(postNewsForm);
  try {
    const res = await fetch('/api/news/create', { method: 'POST', body: formData });
    const data = await res.json();
    postNewsMsg.textContent = data.message || 'News posted!';
    postNewsForm.reset();
    await loadPendingNews();
    await loadAllNewsEngagement(filterMonthInput.value || moment().format('YYYY-MM'));
    await loadInactiveNews();
  } catch (err) {
    postNewsMsg.textContent = 'Error: ' + err.message;
  }
};

// --------------------
// Load Pending News
// --------------------
async function loadPendingNews() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    news.forEach(n => n.IsActive = !!n.IsActive);
    const pending = news.filter(n => !n.IsApproved && n.IsActive);

    if (pending.length) {
      pendingNewsContainer.innerHTML = `
        <div class="news-grid">
          ${pending.map(n => `
            <div class="news-card">
              ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}" class="news-img"/>` 
                           : `<div class="news-img placeholder"></div>`}
              <div class="news-body">
                <h3>${n.Title}</h3>
                <p>${n.Content.substring(0, 200)}...</p>
                <div class="info">
                  <span>👍 ${n.LikesCount || 0}</span>
                  <span>💬 ${n.CommentsCount || 0}</span>
                </div>
                <div class="news-actions">
                  <button class="btn action-btn approve-btn" onclick="approveNews(${n.ArticleID})">
                    <i class="fa-solid fa-check"></i> Approve
                  </button>
                  <button class="btn action-btn edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="btn action-btn delete-btn" onclick="deleteNews(${n.ArticleID})">
                    <i class="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>`;
    } else {
      pendingNewsContainer.innerHTML = '<p class="text-muted">No pending news awaiting approval.</p>';
    }
  } catch (err) {
    console.error('Error loading pending news:', err);
    pendingNewsContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Load All Active News (Published)
// --------------------
async function loadAllNewsEngagement(filterMonthValue = null) {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    news.forEach(n => n.IsActive = !!n.IsActive);
    let filteredNews = news.filter(n => n.IsApproved && n.IsActive);

    // Apply month filter if provided
    if (filterMonthValue) {
      filteredNews = filteredNews.filter(n => {
        const date = new Date(n.PublishedOn);
        const [year, month] = filterMonthValue.split('-');
        return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
      });
    }

    if (filteredNews.length) {
      allNewsEngagementContainer.innerHTML = `
        <div class="news-grid">
          ${filteredNews.map(n => `
            <div class="news-card">
              ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}" class="news-img"/>` 
                           : `<div class="news-img placeholder"></div>`}
              <div class="news-body">
                <h3>${n.Title}</h3>
                <p>${n.Content.substring(0, 220)}...</p>
                <div class="info">
                  <span>📅 ${n.PublishedOn ? formatDateTime(n.PublishedOn) : '—'}</span>
                  <span>👍 ${n.LikesCount || 0}</span>
                  <span>💬 ${n.CommentsCount || 0}</span>
                </div>
                <div class="news-actions">
                  <button class="btn action-btn edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="btn action-btn deactivate-btn" onclick="deactivateNews(${n.ArticleID})">
                    <i class="fa-solid fa-ban"></i> Deactivate
                  </button>
                  <button class="btn action-btn delete-btn" onclick="deleteNews(${n.ArticleID})">
                    <i class="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>`;
    } else {
      allNewsEngagementContainer.innerHTML = '<p class="text-muted">No published news found.</p>';
    }
  } catch (err) {
    console.error('Error loading all active news:', err);
    allNewsEngagementContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Load Inactive News (Deactivated)
// --------------------
async function loadInactiveNews() {
  try {
    const res = await fetch('/api/news/admin', { cache: 'no-store' });
    const news = await res.json();

    news.forEach(n => n.IsActive = !!n.IsActive);
    const inactive = news.filter(n => !n.IsActive);

    if (inactive.length) {
      inactiveNewsContainer.innerHTML = `
        <div class="news-grid">
          ${inactive.map(n => `
            <div class="news-card inactive">
              ${n.ImageURL ? `<img src="${n.ImageURL}" alt="${n.Title}" class="news-img"/>` 
                           : `<div class="news-img placeholder"></div>`}
              <div class="news-body">
                <h3>${n.Title}</h3>
                <p>${n.Content.substring(0, 220)}...</p>
                <div class="info">
                  <span>🕒 ${n.UpdatedOn ? formatDateTime(n.UpdatedOn) : '—'}</span>
                  <span>👍 ${n.LikesCount || 0}</span>
                  <span>💬 ${n.CommentsCount || 0}</span>
                </div>
                <div class="news-actions">
                  <button class="btn action-btn reactivate-btn" onclick="reactivateNews(${n.ArticleID})">
                    <i class="fa-solid fa-toggle-on"></i> Reactivate
                  </button>
                  <button class="btn action-btn edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="btn action-btn delete-btn" onclick="deleteNews(${n.ArticleID})">
                    <i class="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>`;
    } else {
      inactiveNewsContainer.innerHTML = '<p class="text-muted">No deactivated news found.</p>';
    }
  } catch (err) {
    console.error('Error loading inactive news:', err);
    inactiveNewsContainer.textContent = 'Error: ' + err.message;
  }
}

// --------------------
// Load Categories
// --------------------
async function loadCategories() {
  try {
    const res = await fetch('/api/news/categories');
    const categories = await res.json();

    const createSelect = document.getElementById('createCategorySelect');
    const editSelect = document.getElementById('editCategorySelect');

    createSelect.innerHTML = '<option value="">-- Select Category --</option>';
    editSelect.innerHTML = '<option value="">-- Select Category --</option>';

    categories.forEach(cat => {
      const option = `<option value="${cat.CategoryID}">${cat.CategoryName}</option>`;
      const optionAr = `<option value="${cat.CategoryID}">${cat.CategoryName_Ar}</option>`;
      createSelect.insertAdjacentHTML('beforeend', option);
      editSelect.insertAdjacentHTML('beforeend', option);
    });
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

// --------------------
// Deactivate News
// --------------------
async function deactivateNews(articleID) {
  if (!confirm('Are you sure you want to deactivate this news?')) return;
  try {
    const res = await fetch(`/api/news/deactivate/${articleID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);

    // Reload all sections
    await Promise.all([
      loadPendingNews(),
      loadAllNewsEngagement(filterMonthInput.value),
      loadInactiveNews()
    ]);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --------------------
// Reactivate News
// --------------------
async function reactivateNews(articleID) {
  try {
    const res = await fetch(`/api/news/reactivate/${articleID}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);

    // Reload all sections
    await Promise.all([
      loadPendingNews(),
      loadAllNewsEngagement(filterMonthInput.value),
      loadInactiveNews()
    ]);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // convert to 12-hour format

  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}


// --------------------
// Month filter
// --------------------
filterMonthInput.value = moment().format('YYYY-MM');
applyFilterBtn.addEventListener('click', async () => {
  await loadAllNewsEngagement(filterMonthInput.value);
  await loadInactiveNews();
});

// --------------------
// Delete / Approve
// --------------------
async function deleteNews(articleID) {
  if (!confirm('Are you sure?')) return;
  const res = await fetch(`/api/news/${articleID}`, { method: 'DELETE' });
  const data = await res.json();
  alert(data.message);
  await loadPendingNews();
  await loadAllNewsEngagement(filterMonthInput.value);
  await loadInactiveNews();
}

async function approveNews(articleID) {
  const res = await fetch(`/api/news/approve/${articleID}`, { method: 'POST' });
  const data = await res.json();
  alert(data.success ? 'Approved!' : 'Error');
  await loadPendingNews();
  await loadAllNewsEngagement(filterMonthInput.value);
  await loadInactiveNews();
}

// --------------------
// Edit Modal
// --------------------
window.openEditModal = async (articleID) => {
  const res = await fetch('/api/news/admin');
  const news = await res.json();
  const article = news.find(n => n.ArticleID === articleID);
  if (!article) return alert('Article not found');

  document.getElementById('editArticleID').value = article.ArticleID;
  document.getElementById('editTitle').value = article.Title;
  document.getElementById('editTitle_Ar').value = article.Title_Ar || '';
  document.getElementById('editContent').value = article.Content;
  document.getElementById('editContent_Ar').value = article.Content_Ar || '';
  // document.getElementById('editCategoryID').value = article.CategoryID || 1;
  document.getElementById('editCategorySelect').value = article.CategoryID || '';
  editModal.style.display = 'block';
};

closeModal.onclick = () => editModal.style.display = 'none';
window.onclick = (e) => { if (e.target == editModal) editModal.style.display = 'none'; };

// Edit form submit
editForm.onsubmit = async (e) => {
  e.preventDefault();
  const articleID = document.getElementById('editArticleID').value;
  const formData = new FormData(editForm);
  const res = await fetch(`/api/news/update/${articleID}`, { method: 'POST', body: formData });
  const data = await res.json();
  alert(data.message);
  editModal.style.display = 'none';
  await loadPendingNews();
  await loadAllNewsEngagement(filterMonthInput.value);
  await loadInactiveNews();
};

// --------------------
// Initial Load
// --------------------
loadCategories();
loadPendingNews();
loadAllNewsEngagement();
loadInactiveNews();

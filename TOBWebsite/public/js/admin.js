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
const profileForm = document.getElementById('profileForm');
const profileMsg = document.getElementById('profileMsg');
const openChangePasswordBtn = document.getElementById('openChangePasswordBtn');
const changePasswordModal = document.getElementById('changePasswordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const changePasswordForm = document.getElementById('changePasswordForm');
const changePasswordMsg = document.getElementById('changePasswordMsg');
// --------------------
// Trending Cards Management
// --------------------
const trendModal = document.getElementById('trendModal');
const closeTrendModal = document.getElementById('closeTrendModal');
const addTrendBtn = document.getElementById('addTrendBtn');
const trendForm = document.getElementById('trendForm');
const trendsContainer = document.getElementById('trendsContainer');
const trendModalTitle = document.getElementById('trendModalTitle');
const filterTrendStatus = document.getElementById('filterTrendStatus');
const applyTrendFilter = document.getElementById('applyTrendFilter');
const filterTrendMonth = document.getElementById('filterTrendMonth');

// --------------------
// Modal Open/Close
// --------------------
addTrendBtn.onclick = () => openTrendModal();
closeTrendModal.onclick = () => trendModal.style.display = 'none';
window.onclick = (e) => { if (e.target === trendModal) trendModal.style.display = 'none'; };

// --------------------
// Load trends with optional filters (month/year/status)
// --------------------
async function loadTrends(status = 'all', month = '', year = '') {
  try {
    const query = new URLSearchParams({ status, month, year }).toString();
    const res = await fetch(`/api/trends?${query}`, { cache: 'no-store' });
    const data = await res.json();

    const trends = data.success ? data.data : [];

    if (!trends.length) {
      trendsContainer.innerHTML = '<p class="text-muted">No trends found.</p>';
      return;
    }

    trendsContainer.innerHTML = `
      <div class="news-grid">
        ${trends.map(t => `
          <div class="news-card ${t.IsActive ? '' : 'inactive'}">
            ${t.ImageURL
        ? `<img src="${t.ImageURL}" alt="${t.TrendTitle_EN}" class="news-img"/>`
        : `<div class="news-img placeholder"></div>`}
            <div class="news-body">
              <h3>${t.TrendTitle_EN}</h3>
              <p>${t.TrendDescription_EN?.substring(0, 220) || ''}...</p>
              <div class="info">
                <span>📅 ${formatDateTime(t.FromDate)} → ${t.ToDate ? formatDateTime(t.ToDate) : '∞'}</span>
              </div>
              <div class="news-actions">
                <button class="edit-btn" onclick="openTrendModal(${t.TrendID})">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                ${t.IsActive
        ? `<button class="deactivate-btn" onclick="toggleTrendStatus(${t.TrendID}, false)">
                       <i class="fa-solid fa-ban"></i> Deactivate
                     </button>`
        : `<button class="reactivate-btn" onclick="toggleTrendStatus(${t.TrendID}, true)">
                       <i class="fa-solid fa-toggle-on"></i> Activate
                     </button>`}
                <button class="delete-btn" onclick="deleteTrend(${t.TrendID})">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error loading trends:', err);
    trendsContainer.textContent = 'Error loading trends: ' + err.message;
  }
}

// --------------------
// Apply filters
// --------------------
applyTrendFilter.onclick = () => {
  const filter = filterTrendMonth.value; // expected format: YYYY-MM
  let month = '', year = '';
  if (filter) [year, month] = filter.split('-'); // correct order: year = '2025', month = '11'

  const status = filterTrendStatus.value || 'all'; // default to 'all'
  loadTrends(status, month, year);
};

// --------------------
// Open modal for add/edit
// --------------------
async function openTrendModal(trendID = null) {
  trendForm.reset();
  document.getElementById('TrendID').value = '';
  trendModalTitle.textContent = trendID ? 'Edit Trend' : 'Add Trend';

  if (trendID) {
    try {
      const res = await fetch(`/api/trends/${trendID}`);
      const t = await res.json();

      document.getElementById('TrendID').value = t.TrendID;
      document.getElementById('TrendTitle_EN').value = t.TrendTitle_EN;
      document.getElementById('TrendTitle_AR').value = t.TrendTitle_AR || '';
      document.getElementById('TrendDescription_EN').value = t.TrendDescription_EN || '';
      document.getElementById('TrendDescription_AR').value = t.TrendDescription_AR || '';
      document.getElementById('FromDate').value = t.FromDate.split('T')[0];
      if (t.ToDate) document.getElementById('ToDate').value = t.ToDate.split('T')[0];
      document.getElementById('IsActive').checked = t.IsActive;
    } catch (err) {
      alert('Error loading trend: ' + err.message);
      return;
    }
  }

  trendModal.style.display = 'block';
}

// --------------------
// Submit trend form
// --------------------
trendForm.onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(trendForm);

  const url = formData.get('TrendID') ? '/api/trends/update' : '/api/trends/create';
  try {
    const res = await fetch(url, { method: 'POST', body: formData });
    const data = await res.json();

    alert(data.message);
    trendModal.style.display = 'none';
    applyTrendFilter.click();
  } catch (err) {
    alert('Error saving trend: ' + err.message);
  }
};

// --------------------
// Activate/Deactivate trend
// --------------------
async function toggleTrendStatus(id, activate) {
  try {
    const res = await fetch(`/api/trends/${activate ? 'activate' : 'deactivate'}/${id}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    applyTrendFilter.click();
  } catch (err) {
    alert('Error updating trend status: ' + err.message);
  }
}

// --------------------
// Delete trend
// --------------------
async function deleteTrend(id) {
  if (!confirm('Are you sure you want to delete this trend?')) return;

  try {
    const res = await fetch(`/api/trends/delete/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      alert('Trend deleted successfully');
      applyTrendFilter.click();
    } else {
      alert('Error deleting trend: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting trend: ' + err.message);
  }
}

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

document.addEventListener('DOMContentLoaded', async () => {
  filterTrendStatus.value = 'all';
  filterTrendMonth.value = '';
  loadTrends(); // load all trends by default

  const welcomeElement = document.getElementById('welcomeUser');
  const lastLoginElement = document.getElementById('lastLoginDisplay');
  const dateTimeDiv = document.getElementById('currentDateTime');

  try {
    const response = await fetch('/api/auth/currentUser', {
      method: 'GET',
      credentials: 'include' // Important for keeping session cookies
    });

    if (!response.ok) {
      // Not logged in
      window.location.href = '/login';
      return;
    }

    // Your backend returns the user object directly, not wrapped in { success: true, user: {...} }
    const user = await response.json();

    // ✅ Truncate name if long
    const displayName =
      user.FullName?.length > 14
        ? user.FullName.substring(0, 14) + '...'
        : user.FullName || 'User';

    if (welcomeElement) {
      welcomeElement.textContent = `Welcome, ${displayName}`;
    }

    // ✅ Format last login date/time
    if (lastLoginElement) {
      if (user.LastLogin) {
        const formatted = moment(user.LastLogin, 'YYYY-MM-DD HH:mm:ss.SSS')
          .format('DD MMM YYYY hh:mm:ss A');
        lastLoginElement.textContent = `Last logged in: ${formatted}`;
      } else {
        lastLoginElement.textContent = 'Last logged in: –';
      }
    }

  } catch (err) {
    console.warn('⚠️ Unable to fetch current user info:', err.message);
    if (welcomeElement) welcomeElement.textContent = 'Welcome, Guest';
  }

  // ✅ Real-time clock
  if (dateTimeDiv) {
    setInterval(() => {
      const now = moment().format('DD MMM YYYY hh:mm:ss A');
      dateTimeDiv.textContent = now;
    }, 1000);
  }
});

// --------------------
// Sidebar Navigation
// --------------------
const menuItems = document.querySelectorAll('.sidebar .menu li');
const sections = document.querySelectorAll('.section');
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;
    menuItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(sectionId).classList.add('active');

    newsSearchInput.value = '';
    filterNews('');
    newsSearchInput.style.display = ['pending', 'allnews', 'inactive'].includes(sectionId) ? 'inline-block' : 'none';

    if (sectionId === 'profile') loadProfile();
  });
});

// --------------------
// Load Profile
// --------------------
async function loadProfile() {
  try {
    const res = await fetch('/api/auth/currentUser', { credentials: 'include' });
    if (!res.ok) return alert('Failed to load profile');

    const user = await res.json();
    document.getElementById('profileFullName').value = user.FullName || '';
    document.getElementById('profileEmail').value = user.Email || '';
    profileMsg.textContent = '';
  } catch (err) {
    console.error(err);
    profileMsg.textContent = 'Error loading profile.';
  }
}

profileForm.onsubmit = async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('profileFullName').value.trim();
  const email = document.getElementById('profileEmail').value.trim();

  // ✅ Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    profileMsg.textContent = 'Invalid email format!';
    return;
  }

  try {
    const res = await fetch('/api/auth/updateProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ FullName: fullName, Email: email })
    });

    const data = await res.json();
    profileMsg.textContent = data.message || 'Profile updated successfully!';
    if (data.success) {
      document.getElementById('welcomeUser').textContent = `Welcome, ${fullName}`;
    }
  } catch (err) {
    console.error(err);
    profileMsg.textContent = 'Error: ' + err.message;
  }
};

// --------------------
// Change Password Modal
// --------------------
// Open/close modal
openChangePasswordBtn.onclick = () => {
  changePasswordForm.reset(); // ✅ Clear all textboxes
  changePasswordMsg.textContent = ''; // ✅ Clear any previous message
  changePasswordModal.style.display = 'block';
};
// Close modal
closePasswordModal.onclick = () => changePasswordModal.style.display = 'none';
// Close when clicking outside
window.onclick = (e) => {
  if (e.target === changePasswordModal) changePasswordModal.style.display = 'none';
};

// Change Password Form Submit
changePasswordForm.onsubmit = async (e) => {
  e.preventDefault();

  const oldPassword = document.getElementById('CurrentPassword').value.trim();
  const newPassword = document.getElementById('NewPassword').value.trim();
  const confirmPassword = document.getElementById('ConfirmPassword').value.trim();

  if (newPassword !== confirmPassword) {
    changePasswordMsg.textContent = 'Passwords do not match!';
    changePasswordMsg.style.color = 'red';
    return;
  }

  try {
    const res = await fetch('/api/auth/changePassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();

    if (data.success) {
      changePasswordMsg.textContent = data.message;
      changePasswordMsg.style.color = 'green';
      changePasswordForm.reset();
      setTimeout(() => changePasswordModal.style.display = 'none', 1500);
    } else {
      changePasswordMsg.textContent = data.message || 'Error updating password';
      changePasswordMsg.style.color = 'red';
    }

  } catch (err) {
    console.error('Change Password Error:', err);
    changePasswordMsg.textContent = 'Server error. Try again.';
    changePasswordMsg.style.color = 'red';
  }
};


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
                  <button class="approve-btn" onclick="approveNews(${n.ArticleID})">
                    <i class="fa-solid fa-check"></i> Approve
                  </button>
                  <button class="edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="delete-btn" onclick="deleteNews(${n.ArticleID})">
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
                  <button class="edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="deactivate-btn" onclick="deactivateNews(${n.ArticleID})">
                    <i class="fa-solid fa-ban"></i> Deactivate
                  </button>
                  <button class="delete-btn" onclick="deleteNews(${n.ArticleID})">
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
                  <button class="reactivate-btn" onclick="reactivateNews(${n.ArticleID})">
                    <i class="fa-solid fa-toggle-on"></i> Reactivate
                  </button>
                  <button class="edit-btn" onclick="openEditModal(${n.ArticleID})">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button class="delete-btn" onclick="deleteNews(${n.ArticleID})">
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
  document.getElementById('editCategorySelect').value = article.CategoryID || '';

  document.getElementById('editIsTopStory').checked = article.IsTopStory;
  document.getElementById('editIsFeatured').checked = article.IsFeatured;

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


let categories = [];
let currentPage = 1;
const pageSize = 5;
let filteredCategories = [];

// Load categories from API
async function loadCategoriesList() {
  try {
    const res = await fetch('/api/news/Allcategories');
    categories = await res.json();
    filteredCategories = [...categories];
    currentPage = 1;
    renderCategoriesTable();
    renderPagination();
  } catch (err) {
    console.error('Error loading categories list:', err);
  }
}

// Render categories in table
function renderCategoriesTable() {
  const tbody = document.querySelector('#categoriesTable tbody');
  tbody.innerHTML = '';

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredCategories.slice(start, end);

  pageItems.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat.CategoryID}</td>
      <td>${cat.CategoryName}</td>
      <td>${cat.CategoryName_Ar || ''}</td>
      <td>${cat.Description || ''}</td>
      <td>${cat.Description_Ar || ''}</td>
      <td>${cat.IsActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td>
      <td>
        <button class="btn btn-sm btn-warning edit-cat" data-id="${cat.CategoryID}">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-cat" data-id="${cat.CategoryID}">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind buttons
  document.querySelectorAll('.edit-cat').forEach(btn => btn.addEventListener('click', openEditCategoryModal));
  document.querySelectorAll('.delete-cat').forEach(btn => btn.addEventListener('click', deleteCategory));
}

// Pagination
function renderPagination() {
  const pagination = document.getElementById('categoryPagination');
  pagination.innerHTML = '';
  const pageCount = Math.ceil(filteredCategories.length / pageSize);

  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', e => {
      e.preventDefault();
      currentPage = i;
      renderCategoriesTable();
      renderPagination();
    });
    pagination.appendChild(li);
  }
}

// Search filter
document.getElementById('categorySearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  filteredCategories = categories.filter(cat =>
    cat.CategoryName.toLowerCase().includes(query) ||
    (cat.CategoryName_Ar && cat.CategoryName_Ar.toLowerCase().includes(query)) ||
    (cat.Description && cat.Description.toLowerCase().includes(query)) ||
    (cat.Description_Ar && cat.Description_Ar.toLowerCase().includes(query))
  );
  currentPage = 1;
  renderCategoriesTable();
  renderPagination();
});

// Add/Edit Category Modal (Bootstrap 5)
const categoryModalEl = document.getElementById('categoryModal');
const categoryModal = new bootstrap.Modal(categoryModalEl);

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('categoryForm').reset();
  document.getElementById('CategoryID').value = '';
  categoryModal.show();
});

// document.getElementById('closeCategoryModal').addEventListener('click', () => categoryModal.hide());
document.getElementById('closeCategoryModalFooter').addEventListener('click', () => categoryModal.hide());

// Edit Category
async function openEditCategoryModal(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const res = await fetch(`/api/news/category/${id}`);
    const cat = await res.json();

    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('CategoryID').value = cat.CategoryID;
    document.getElementById('CategoryName').value = cat.CategoryName || '';
    document.getElementById('CategoryName_Ar').value = cat.CategoryName_Ar || '';
    document.getElementById('Description').value = cat.Description || '';
    document.getElementById('Description_Ar').value = cat.Description_Ar || '';
    document.getElementById('IsActive').checked = cat.IsActive;
    categoryModal.show();
  } catch (err) {
    console.error('Failed to open edit modal:', err);
  }
}

// Save (Add or Update)
document.getElementById('categoryForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('CategoryID').value;
  const payload = {
    CategoryName: document.getElementById('CategoryName').value.trim(),
    CategoryName_Ar: document.getElementById('CategoryName_Ar').value.trim(),
    Description: document.getElementById('Description').value.trim(),
    Description_Ar: document.getElementById('Description_Ar').value.trim(),
    IsActive: document.getElementById('IsActive').checked
  };
  if (!payload.CategoryName) return alert('Please enter a category name.');

  const url = id ? `/api/news/category/update/${id}` : '/api/news/category/add';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await res.json();
    if (!result.success) return alert(result.message || 'Operation failed.');
    alert(result.message);
    categoryModal.hide();
    loadCategoriesList();
  } catch (err) {
    console.error('Save Category Error:', err);
    alert('Something went wrong while saving category.');
  }
});

// Delete Category
async function deleteCategory(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Are you sure you want to delete this category?')) return;

  try {
    const res = await fetch(`/api/news/category/delete/${id}`, { method: 'DELETE' });
    const result = await res.json();
    alert(result.message);
    if (result.success) loadCategoriesList();
  } catch (err) {
    console.error('Delete Category Error:', err);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadCategoriesList);



// --------------------
// Initial Load
// --------------------
loadCategories();
loadPendingNews();
loadAllNewsEngagement();
loadInactiveNews();

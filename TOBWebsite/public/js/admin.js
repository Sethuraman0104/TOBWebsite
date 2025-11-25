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

            <!-- Eye Icon -->
            <span class="view-icon" onclick="openTrendPreview(${t.TrendID})">
              <i class="fa-solid fa-eye"></i>
            </span>

            <!-- Image -->
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

async function openTrendPreview(id) {
  try {
    const res = await fetch(`/api/trends/gettrend/${id}`, { cache: "no-store" });
    const result = await res.json();

    if (!result.success || !result.data) {
      console.error("Trend not found or API error");
      return;
    }

    const t = result.data;

    // Apply data to modal
    document.getElementById("trendsmdl-title-en").textContent = t.TrendTitle_EN || "";
    document.getElementById("trendsmdl-desc-en").innerHTML = t.TrendDescription_EN || "";
    document.getElementById("trendsmdl-desc-ar").innerHTML = t.TrendDescription_AR || "";

    const img = document.getElementById("trendsmdl-image");
    img.src = t.ImageURL || "images/default-trend.jpg";

    // Show modal
    document.getElementById("trendsmdl-modal").style.display = "flex";

  } catch (err) {
    console.error("Trend Preview Error:", err);
  }
}

// Close buttons
document.getElementById("trendsmdl-close-top").onclick =
  document.getElementById("trendsmdl-close-bottom").onclick = () => {
    document.getElementById("trendsmdl-modal").style.display = "none";
  };

// Close when clicking outside
window.addEventListener("click", e => {
  const modal = document.getElementById("trendsmdl-modal");
  if (e.target === modal) modal.style.display = "none";
});

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

// async function openTrendModal(trendID = null) {
//   trendForm.reset();
//   document.getElementById('TrendID').value = '';
//   trendModalTitle.textContent = trendID ? 'Edit Trend' : 'Add Trend';

//   if (trendID) {
//     try {
//       const res = await fetch(`/api/trends/gettrend/${trendID}`);
//       const result = await res.json();

//       // Check if your API returns { success: true, data: {...} }
//       if (!result.success || !result.data) {
//         alert('Trend not found!');
//         return;
//       }

//       const t = result.data; // extract the trend data

//       document.getElementById('TrendID').value = t.TrendID || '';
//       document.getElementById('TrendTitle_EN').value = t.TrendTitle_EN || '';
//       document.getElementById('TrendTitle_AR').value = t.TrendTitle_AR || '';
//       document.getElementById('TrendDescription_EN').value = t.TrendDescription_EN || '';
//       document.getElementById('TrendDescription_AR').value = t.TrendDescription_AR || '';

//       // Safely handle undefined dates
//       document.getElementById('FromDate').value = t.FromDate ? t.FromDate.split('T')[0] : '';
//       document.getElementById('ToDate').value = t.ToDate ? t.ToDate.split('T')[0] : '';

//       document.getElementById('IsActive').checked = !!t.IsActive;
//     } catch (err) {
//       alert('Error loading trend: ' + err.message);
//       return;
//     }
//   }

//   trendModal.style.display = 'block';
// }
// --------------------
// Open Trend Modal (Add/Edit)
// --------------------
async function openTrendModal(trendID = null) {
  // Reset form and preview
  trendForm.reset();
  document.getElementById('TrendID').value = '';
  document.getElementById('trendImagePreview').innerHTML = '';
  document.getElementById('ExistingImageURL').value = '';
  trendModalTitle.textContent = trendID ? 'Edit Trend' : 'Add Trend';

  if (trendID) {
    try {
      const res = await fetch(`/api/trends/gettrend/${trendID}`);
      const result = await res.json();

      if (!result.success || !result.data) {
        alert('Trend not found!');
        return;
      }

      const t = result.data;

      // Populate form fields
      document.getElementById('TrendID').value = t.TrendID || '';
      document.getElementById('TrendTitle_EN').value = t.TrendTitle_EN || '';
      document.getElementById('TrendTitle_AR').value = t.TrendTitle_AR || '';
      document.getElementById('TrendDescription_EN').value = t.TrendDescription_EN || '';
      document.getElementById('TrendDescription_AR').value = t.TrendDescription_AR || '';
      document.getElementById('FromDate').value = t.FromDate ? t.FromDate.split('T')[0] : '';
      document.getElementById('ToDate').value = t.ToDate ? t.ToDate.split('T')[0] : '';
      document.getElementById('IsActive').checked = !!t.IsActive;

      // Load existing image preview
      if (t.ImageURL) {
        document.getElementById('trendImagePreview').innerHTML = `
          <img src="${t.ImageURL}" alt="${t.TrendTitle_EN}" 
               style="max-width:150px; max-height:150px; border-radius:8px;"/>
        `;
        document.getElementById('ExistingImageURL').value = t.ImageURL; // store existing image
      }
    } catch (err) {
      alert('Error loading trend: ' + err.message);
      return;
    }
  }

  // Show modal
  trendModal.style.display = 'block';
}

// --------------------
// Show image preview when user selects a new file
// --------------------
document.getElementById('TrendImage').addEventListener('change', function () {
  const previewDiv = document.getElementById('trendImagePreview');
  previewDiv.innerHTML = '';
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      previewDiv.innerHTML = `<img src="${e.target.result}" 
                                style="max-width:150px; max-height:150px; border-radius:8px;">`;
    };
    reader.readAsDataURL(file);
  }
});

// --------------------
// Submit trend form (Add or Update)
// --------------------
// --------------------
// Submit trend form (Add or Update)
// --------------------
trendForm.onsubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData(trendForm);

  // Only append a new file if selected
  if (!formData.get('Image')?.size) {
    formData.delete('Image'); // remove empty file input
    // ExistingImageURL is already a hidden field, no need to append anything extra
  }

  const url = formData.get('TrendID') ? '/api/trends/update' : '/api/trends/create';

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    alert(data.message);
    trendModal.style.display = 'none';
    applyTrendFilter.click(); // reload trend list
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
  query = query.toLowerCase();

  // Helper: matches ANY content inside the card + inside .news-body
  function matches(card) {
    const fullText =
      card.textContent.toLowerCase() +
      (card.querySelector('.news-body')?.textContent.toLowerCase() || '');

    return fullText.includes(query);
  }

  // Pending / Unpublished News
  const pendingCards = pendingNewsContainer.querySelectorAll('.news-card');
  pendingCards.forEach(card => {
    card.style.display = matches(card) ? '' : 'none';
  });

  // Published News
  const publishedCards = allNewsEngagementContainer.querySelectorAll('.news-card');
  publishedCards.forEach(card => {
    card.style.display = matches(card) ? '' : 'none';
  });

  // Deactivated News
  const inactiveCards = inactiveNewsContainer.querySelectorAll('.news-card');
  inactiveCards.forEach(card => {
    card.style.display = matches(card) ? '' : 'none';
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

// Hide all sections initially
sections.forEach(s => s.style.display = 'none');

// Show the first section by default
const firstMenuItem = menuItems[0];
const firstSectionId = firstMenuItem.dataset.section;
document.getElementById(firstSectionId).style.display = 'block';
firstMenuItem.classList.add('active');

// Add click listeners to menu items
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;

    // Remove active from all menu items & hide all sections
    menuItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.style.display = 'none');

    // Add active to clicked menu item & show relevant section
    item.classList.add('active');
    document.getElementById(sectionId).style.display = 'block';

    // Only load subscribers when Subscribers tab is clicked
    if (sectionId === 'managesubscribers') {
      loadSubscribers();
    }

    if (sectionId === 'publish') {
      loadCategories();
    }    

    // Optional: handle other sections
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

// Change Password Modal
// Get elements
const changePasswordModal = document.getElementById('changePasswordModal');
const openChangePasswordBtn = document.getElementById('openChangePasswordBtn'); // button to open modal
const closePasswordModal = document.getElementById('closePasswordModal');
const changePasswordForm = document.getElementById('changePasswordForm');
const changePasswordMsg = document.getElementById('changePasswordMsg');

// --- Open modal ---
openChangePasswordBtn.onclick = () => {
  changePasswordForm.reset();         // Clear all inputs
  changePasswordMsg.textContent = ''; // Clear any previous message
  changePasswordModal.style.display = 'block';
};

// --- Close modal ---
closePasswordModal.onclick = () => {
  changePasswordModal.style.display = 'none';
};

// --- Close modal when clicking outside ---
window.addEventListener('click', (e) => {
  if (e.target === changePasswordModal) {
    changePasswordModal.style.display = 'none';
  }
});

// --- Submit change password form ---
changePasswordForm.onsubmit = async (e) => {
  e.preventDefault();

  const oldPassword = document.getElementById('CurrentPassword').value.trim();
  const newPassword = document.getElementById('NewPassword').value.trim();
  const confirmPassword = document.getElementById('ConfirmPassword').value.trim();

  // --- Validate passwords ---
  if (!oldPassword || !newPassword || !confirmPassword) {
    changePasswordMsg.textContent = 'Please fill in all fields.';
    changePasswordMsg.style.color = 'red';
    return;
  }

  if (newPassword !== confirmPassword) {
    changePasswordMsg.textContent = 'Passwords do not match!';
    changePasswordMsg.style.color = 'red';
    return;
  }

  // --- Send request to server ---
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
      setTimeout(() => {
        changePasswordModal.style.display = 'none';
        changePasswordMsg.textContent = '';
      }, 1500);
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


// JavaScript Part
const attachments = []; // Array to hold files
const attachmentInput = document.getElementById("singleAttachmentInput");
const addAttachmentBtn = document.getElementById("addAttachmentBtn");
const attachmentsTable = document.getElementById("attachmentsTable").querySelector("tbody");

addAttachmentBtn.addEventListener("click", () => {
  const file = attachmentInput.files[0];
  if (!file) return alert("Please select a file.");

  attachments.push(file);
  renderAttachmentsTable();
  attachmentInput.value = ""; // Clear input
});

// Render attachments table
function renderAttachmentsTable() {
  attachmentsTable.innerHTML = "";
  attachments.forEach((file, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${file.name}</td>
      <td><button type="button" data-index="${index}" class="removeAttachmentBtn">Remove</button></td>
    `;
    attachmentsTable.appendChild(row);
  });

  // Remove attachment from array and re-render
  document.querySelectorAll(".removeAttachmentBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      attachments.splice(idx, 1);
      renderAttachmentsTable();
    });
  });
}

// Form Submit
postNewsForm.onsubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();

  // Add all text fields
  const fields = [
    "Title", "Title_Ar", "Content", "Content_Ar",
    "CategoryID", "IsTopStory", "IsFeatured",
    "IsBreakingNews", "IsSpotlightNews"
  ];

  fields.forEach(f => {
    const el = postNewsForm.querySelector(`[name="${f}"]`);
    if (!el) return;

    if (el.type === "checkbox") {
      if (el.checked) formData.append(f, "true");
    } else {
      formData.append(f, el.value);
    }
  });

  // Main Image
  const mainImage = postNewsForm.querySelector('input[name="MainImage"]').files;
  if (mainImage.length > 0) {
    formData.append("MainImage", mainImage[0]);
  }

  // Append dynamically added attachments
  attachments.forEach(file => {
    formData.append("Attachments", file);
  });

  try {
    const res = await fetch("/api/news/create", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    postNewsMsg.textContent = data.message;
    postNewsForm.reset();
    await loadPendingNews();
    await loadAllNewsEngagement(filterMonthInput.value || moment().format('YYYY-MM'));
    await loadInactiveNews();
    attachments.length = 0; // Clear attachments array
    renderAttachmentsTable(); // Clear table
  } catch (err) {
    postNewsMsg.textContent = "Error: " + err.message;
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

              <!-- Eye Icon -->
              <span class="view-icon" onclick="openNewsPreview(${n.ArticleID})">
                <i class="fa-solid fa-eye"></i>
              </span>

              <!-- Image -->
              ${n.MainSlideImage
          ? `<img src="${n.MainSlideImage}" alt="${n.Title}" class="news-img"/>`
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

let carouselImages = [];
let currentIndex = 0;
let carouselTimer;

async function openNewsPreview(articleId) {
  try {
    const res = await fetch(`/api/newscheck/${articleId}`, { cache: "no-store" });
    if (!res.ok) return console.error("API error:", res.status);
    const reply = await res.json();
    if (!reply.success || !reply.data) return console.error("No data returned");

    const n = reply.data;

    // Collect all images (MainSlideImage + Attachments)
    carouselImages = [];
    if (n.MainSlideImage) carouselImages.push(n.MainSlideImage);
    if (n.Attachments) {
      const attachments = Array.isArray(n.Attachments) ? n.Attachments : JSON.parse(n.Attachments);
      carouselImages.push(...attachments);
    }

    currentIndex = 0;
    document.getElementById("carouselImage").src = carouselImages[currentIndex] || "";

    // Titles
    document.getElementById("previewTitleEnHeader").textContent = n.Title ?? "";
    document.getElementById("previewContentEn").innerHTML = n.Content ?? "";
    document.getElementById("previewContentAr").innerHTML = n.Content_Ar ?? "";

    document.getElementById("newsPreviewModal").style.display = "block";

    // Start auto carousel
    startCarousel();

  } catch (err) {
    console.error("Preview load error:", err);
  }
}

// Carousel navigation
document.getElementById("carouselPrev").onclick = () => {
  showCarousel(currentIndex - 1);
};
document.getElementById("carouselNext").onclick = () => {
  showCarousel(currentIndex + 1);
};

function showCarousel(index) {
  if (!carouselImages.length) return;
  currentIndex = (index + carouselImages.length) % carouselImages.length;
  document.getElementById("carouselImage").src = carouselImages[currentIndex];
}

// Auto slide every 3 seconds
function startCarousel() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    showCarousel(currentIndex + 1);
  }, 3000);
}

// Close modal
document.getElementById("closeNewsPreview").onclick =
document.getElementById("closeNewsPreviewFooter").onclick = () => {
  document.getElementById("newsPreviewModal").style.display = "none";
  clearInterval(carouselTimer);
};

window.onclick = (e) => {
  if (e.target.id === "newsPreviewModal") {
    document.getElementById("newsPreviewModal").style.display = "none";
    clearInterval(carouselTimer);
  }
};


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
      // Inside loadAllNewsEngagement function, update card HTML
      allNewsEngagementContainer.innerHTML = `
  <div class="news-grid">
    ${filteredNews.map(n => `
      <div class="news-card">

        <!-- Eye Icon to view full news -->
        <span class="view-icon" onclick="openNewsPreview(${n.ArticleID})">
          <i class="fa-solid fa-eye"></i>
        </span>

        <!-- Image -->
        ${n.MainSlideImage ? `<img src="${n.MainSlideImage}" alt="${n.Title}" class="news-img"/>`
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

              <!-- Eye Icon to view full news -->
              <span class="view-icon" onclick="openNewsPreview(${n.ArticleID})">
                <i class="fa-solid fa-eye"></i>
              </span>

              <!-- Image -->
              ${n.MainSlideImage ? `<img src="${n.MainSlideImage}" alt="${n.Title}" class="news-img"/>`
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


let editAttachments = []; // Array to hold new files (File objects)
let existingAttachments = []; // Array to hold URLs of existing attachments

const editattachmentInput = document.getElementById("editsingleAttachmentInput");
const editaddAttachmentBtn = document.getElementById("editaddAttachmentBtn");
const editattachmentsTable = document.getElementById("editattachmentsTable").querySelector("tbody");
const editExistingAttachmentsInput = document.getElementById("editExistingAttachments"); // hidden input

// Add new attachment to array and render table
editaddAttachmentBtn.addEventListener("click", () => {
  const file = editattachmentInput.files[0];
  if (!file) return alert("Please select a file.");
  editAttachments.push(file);
  editrenderAttachmentsTable();
  editattachmentInput.value = "";
});

// Render attachments table
function editrenderAttachmentsTable() {
  editattachmentsTable.innerHTML = "";

  const allFiles = [...existingAttachments, ...editAttachments];

  allFiles.forEach((file, index) => {
    const isFileObject = file instanceof File;
    const src = isFileObject ? URL.createObjectURL(file) : `${window.location.origin}${file}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><img src="${src}" style="height:50px;"></td>
      <td>${isFileObject ? file.name : file.split("/").pop()}</td>
      <td><button type="button" data-index="${index}" class="removeAttachmentBtn">Remove</button></td>
    `;
    editattachmentsTable.appendChild(row);
  });

  // Remove listeners
  document.querySelectorAll(".removeAttachmentBtn").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.target.dataset.index);
      if (idx < existingAttachments.length) {
        existingAttachments.splice(idx, 1);
      } else {
        editAttachments.splice(idx - existingAttachments.length, 1);
      }
      editrenderAttachmentsTable();
    });
  });

  editExistingAttachmentsInput.value = JSON.stringify(existingAttachments);
}

// Open edit modal and populate data
window.openEditModal = async (articleID) => {
  const res = await fetch("/api/news/admin");
  const news = await res.json();
  const article = news.find(n => n.ArticleID === articleID);
  if (!article) return alert("Article not found");

  document.getElementById("editArticleID").value = article.ArticleID;
  document.getElementById("editTitle").value = article.Title;
  document.getElementById("editTitle_Ar").value = article.Title_Ar || "";
  document.getElementById("editContent").value = article.Content;
  document.getElementById("editContent_Ar").value = article.Content_Ar || "";
  document.getElementById("editCategorySelect").value = article.CategoryID || "";

  document.getElementById("editIsTopStory").checked = article.IsTopStory;
  document.getElementById("editIsFeatured").checked = article.IsFeatured;
  document.getElementById("editIsBreakingNews").checked = article.IsBreakingNews;
  document.getElementById("editIsSpotlightNews").checked = article.IsSpotlightNews;

  const currentImagePreview = document.getElementById("currentImagePreview");
  currentImagePreview.innerHTML = article.MainSlideImage
    ? `<img src="${article.MainSlideImage}" style="height:80px;">`
    : "";

  // Load existing attachments
  existingAttachments = article.Attachments || [];
  editAttachments = []; // clear any old new files
  editrenderAttachmentsTable();

  editModal.style.display = "block";
};

editForm.onsubmit = async (e) => {
  e.preventDefault();

  const articleID = document.getElementById("editArticleID").value;
  const formData = new FormData(editForm);

  // Force checkbox values
  formData.set("IsTopStory", document.getElementById("editIsTopStory").checked ? "true" : "false");
  formData.set("IsFeatured", document.getElementById("editIsFeatured").checked ? "true" : "false");
  formData.set("IsBreakingNews", document.getElementById("editIsBreakingNews").checked ? "true" : "false");
  formData.set("IsSpotlightNews", document.getElementById("editIsSpotlightNews").checked ? "true" : "false");

  // Add new files
  editAttachments.forEach(f => {
    if (f instanceof File) formData.append("Attachments", f);
  });

  const res = await fetch(`/api/news/update/${articleID}`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  alert(data.message);
  editModal.style.display = "none";

  await loadPendingNews();
  await loadAllNewsEngagement(filterMonthInput.value);
  await loadInactiveNews();
};

document.querySelector("#editModal .close").onclick = () => {
  editModal.style.display = "none";
};

window.onclick = (e) => {
  if (e.target === editModal) editModal.style.display = "none";
};

let categories = [];
let currentPage = 1;
const pageSize = 5;
let filteredCategories = [];

// --------------------
// Load categories from API
// --------------------
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

// --------------------
// Render categories table
// --------------------
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

  // Bind edit/delete buttons
  document.querySelectorAll('.edit-cat').forEach(btn => btn.addEventListener('click', openEditCategoryModal));
  document.querySelectorAll('.delete-cat').forEach(btn => btn.addEventListener('click', deleteCategory));
}

// --------------------
// Pagination
// --------------------
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

// --------------------
// Search filter
// --------------------
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

// --------------------
// Custom modal handling
// --------------------
const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('categoryForm');
const categoryModalTitle = document.getElementById('categoryModalTitle');

function openCategoryModal() {
  categoryModal.style.display = 'block';
}

function closeCategoryModal() {
  categoryModal.style.display = 'none';
}

// Open Add Category
document.getElementById('addCategoryBtn').addEventListener('click', () => {
  categoryForm.reset();
  document.getElementById('CategoryID').value = '';
  document.getElementById('categoryIsActive').checked = true;
  categoryModalTitle.textContent = 'Add Category';
  openCategoryModal();
});

// Open Edit Category
async function openEditCategoryModal(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const res = await fetch(`/api/news/category/${id}`);
    const cat = await res.json();

    categoryForm.reset();
    categoryModalTitle.textContent = 'Edit Category';
    document.getElementById('CategoryID').value = cat.CategoryID || '';
    document.getElementById('CategoryName').value = cat.CategoryName || '';
    document.getElementById('CategoryName_Ar').value = cat.CategoryName_Ar || '';
    document.getElementById('Description').value = cat.Description || '';
    document.getElementById('Description_Ar').value = cat.Description_Ar || '';
    document.getElementById('categoryIsActive').checked = !!cat.IsActive;

    openCategoryModal();
  } catch (err) {
    console.error('Failed to open edit modal:', err);
    alert('Failed to load category details.');
  }
}

// Close modal events
document.getElementById('closeCategoryModal').onclick = closeCategoryModal;
document.getElementById('closeCategoryModalFooter').onclick = closeCategoryModal;

// Close when clicking outside
window.onclick = (e) => {
  if (e.target === categoryModal) closeCategoryModal();
}

// --------------------
// Save category (Add/Update)
// --------------------
categoryForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id = document.getElementById('CategoryID').value;
  const payload = {
    CategoryName: document.getElementById('CategoryName').value.trim(),
    CategoryName_Ar: document.getElementById('CategoryName_Ar').value.trim(),
    Description: document.getElementById('Description').value.trim(),
    Description_Ar: document.getElementById('Description_Ar').value.trim(),
    IsActive: document.getElementById('categoryIsActive').checked
  };

  if (!payload.CategoryName) return alert('Please enter a category name.');

  const url = id ? `/api/news/category/update/${id}` : '/api/news/category/add';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) return alert(result.message || 'Operation failed.');
    alert(result.message);
    closeCategoryModal();
    loadCategoriesList();
  } catch (err) {
    console.error('Save Category Error:', err);
    alert('Something went wrong while saving category.');
  }
});

// --------------------
// Delete category
// --------------------
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
    alert('Something went wrong while deleting category.');
  }
}

// --------------------
// Initialize
// --------------------
document.addEventListener('DOMContentLoaded', loadCategoriesList);

// =============================
// Admin Comments Management
// =============================
let pendingComments = [], approvedComments = [], rejectedComments = [];
let currentPendingPage = 1, currentApprovedPage = 1, currentRejectedPage = 1;
const commentsPageSize = 5;
let filteredPending = [], filteredApproved = [], filteredRejected = [];

// ---------------------------------
// Load articles with comment stats
// ---------------------------------
// async function loadArticlesWithComments() {
//   try {
//     const res = await fetch('/api/articles/with-comments');
//     const data = await res.json();
//     if (!data.success) throw new Error();

//     const container = document.getElementById('articlesWithComments');
//     container.innerHTML = '';

//     if (!data.data.length) {
//       container.innerHTML = '<p>No articles with comments found.</p>';
//       return;
//     }

//     data.data.forEach(article => {
//       // Use MainSlideImage if available, otherwise fallback to ImageURL
//       const mainImage = article.MainSlideImage || article.ImageURL || 'images/default.jpg';

//       const card = document.createElement('div');
//       card.className = 'article-card';
//       card.innerHTML = `
//         <img src="${mainImage}" alt="${article.Title}" class="article-main-image">
//         <div class="article-info mt-2">
//           <h5>${article.Title}</h5>
//           <p class="text-muted mb-1">Published: ${moment(article.PublishedOn).format('LL')}</p>
//           <p class="text-muted mb-1">Views: ${article.ViewCount || 0}</p>
//           <div class="comment-stats text-start mt-2">
//             <p class="mb-0 text-warning"><i class="fa-solid fa-hourglass-half"></i> Pending: ${article.PendingComments || 0}</p>
//             <p class="mb-0 text-success"><i class="fa-solid fa-check-circle"></i> Approved: ${article.ApprovedComments || 0}</p>
//           </div>
//           <button class="btn btn-primary btn-sm mt-3" onclick="viewComments(${article.ArticleID}, '${article.Title.replace(/'/g, "\\'")}')">
//             <i class="fa-solid fa-comments"></i> View Comments
//           </button>
//         </div>
//       `;
//       container.appendChild(card);
//     });
//   } catch (err) {
//     console.error('❌ Error loading articles:', err);
//   }
// }

async function loadArticlesWithComments() {
    try {
        const res = await fetch('/api/articles/with-comments');
        const data = await res.json();
        if (!data.success) throw new Error();

        const container = document.getElementById('articlesWithComments');
        container.innerHTML = '';
        container.className = 'artComments-grid'; // responsive grid

        if (!data.data.length) {
            container.innerHTML = '<p>No articles with comments found.</p>';
            return;
        }

        data.data
            .filter(article => (article.PendingComments > 0 || article.ApprovedComments > 0))
            .forEach(article => {
                const mainImage = article.MainSlideImage || article.ImageURL || 'images/default.jpg';

                const card = document.createElement('div');
                card.className = 'artComments-card';
                card.innerHTML = `
                    <img src="${mainImage}" alt="${article.Title}" class="artComments-mainImage">
                    <div class="artComments-info">
                        <h5>${article.Title}</h5>
                        <div class="artComments-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${moment(article.PublishedOn).format('LL')}</span>
                            <span><i class="fa-solid fa-eye"></i> ${article.ViewCount || 0}</span>
                        </div>
                        <div class="artComments-comments">
                            <p class="text-warning"><i class="fa-solid fa-hourglass-half"></i> Pending: ${article.PendingComments || 0}</p>
                            <p class="text-success"><i class="fa-solid fa-check-circle"></i> Approved: ${article.ApprovedComments || 0}</p>
                        </div>
                        <button class="artComments-btn" onclick="viewComments(${article.ArticleID}, '${article.Title.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-comments"></i> View Comments
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

    } catch (err) {
        console.error('❌ Error loading articles:', err);
    }
}

// ---------------------------------
// View comments modal
// ---------------------------------
async function viewComments(articleId, articleTitle) {
  try {
    const res = await fetch(`/api/admincomments/${articleId}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load comments');

    document.getElementById('modalArticleTitle').textContent = articleTitle;

    pendingComments = data.pending || [];
    approvedComments = data.approved || [];
    rejectedComments = data.rejected || [];

    filteredPending = [...pendingComments];
    filteredApproved = [...approvedComments];
    filteredRejected = [...rejectedComments];

    currentPendingPage = currentApprovedPage = currentRejectedPage = 1;

    renderCommentsTable(filteredPending, 'pendingCommentsTable', 'pending', currentPendingPage, articleTitle, 'pendingPagination');
    renderCommentsTable(filteredApproved, 'approvedCommentsTable', 'approved', currentApprovedPage, articleTitle, 'approvedPagination');
    renderCommentsTable(filteredRejected, 'rejectedCommentsTable', 'rejected', currentRejectedPage, articleTitle, 'rejectedPagination');

    document.getElementById('commentsModalCustom').style.display = 'block';
  } catch (err) {
    console.error('❌ Error loading comments:', err);
  }
}

// ---------------------------------
// Render comments table with pagination
// ---------------------------------
function renderCommentsTable(list, tableId, type, currentPage, articleTitle, paginationId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  const start = (currentPage - 1) * commentsPageSize;
  const pageItems = list.slice(start, start + commentsPageSize);

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="${type !== 'rejected' ? 6 : 5}" class="text-center text-muted">No comments.</td></tr>`;
  } else {
    pageItems.forEach((c, idx) => {
      const escapedTitle = articleTitle.replace(/'/g, "\\'");
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${start + idx + 1}</td>
        <td>${c.Name}</td>
        <td>${c.Email}</td>
        <td>${c.Content}</td>
        <td>${moment(c.CreatedOn).fromNow()}</td>
        ${type !== 'rejected' ? `<td>
          ${type === 'pending' ? `<button class="approve btn-sm" onclick="updateCommentStatus(${c.CommentID},'approve',${c.ArticleID},'${escapedTitle}')">Approve</button>
          <button class="reject btn-sm" onclick="updateCommentStatus(${c.CommentID},'reject',${c.ArticleID},'${escapedTitle}')">Reject</button>` :
            type === 'approved' ? `<button class="reject btn-sm" onclick="updateCommentStatus(${c.CommentID},'reject',${c.ArticleID},'${escapedTitle}')">Reject</button>` : '' }
        </td>`: ''}
      `;
      tbody.appendChild(tr);
    });
  }

  // Pagination
  const pagination = document.getElementById(paginationId);
  pagination.innerHTML = '';
  const pageCount = Math.ceil(list.length / commentsPageSize);
  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', e => {
      e.preventDefault();
      if (type === 'pending') currentPendingPage = i;
      else if (type === 'approved') currentApprovedPage = i;
      else currentRejectedPage = i;
      renderCommentsTable(list, tableId, type, i, articleTitle, paginationId);
    });
    pagination.appendChild(li);
  }
}

async function updateCommentStatus(commentId, status, articleId, articleTitle) {
  try {
    const res = await fetch(`/api/comments/${commentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      // Refresh modal comments
      await viewComments(articleId, articleTitle);
      // Refresh back page list
      await loadArticlesWithComments();
    } else {
      alert(data.message || 'Failed to update comment status.');
    }
  } catch (err) {
    console.error('❌ Error updating comment status:', err);
    alert('Error updating comment status. Try again.');
  }
}

// ---------------------------------
// Modal close
// ---------------------------------
document.getElementById('closeCommentsModal').onclick = () => {
  document.getElementById('commentsModalCustom').style.display = 'none';
};
window.onclick = e => {
  if (e.target == document.getElementById('commentsModalCustom'))
    document.getElementById('commentsModalCustom').style.display = 'none';
};

// ---------------------------------
// Tabs
// ---------------------------------
document.querySelectorAll('.tablink').forEach(tab => {
  tab.addEventListener('click', function () {
    const target = this.dataset.tab;
    document.querySelectorAll('.tablink').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ---------------------------------
// Search/filter
// ---------------------------------
document.getElementById('commentSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const activeTab = document.querySelector('.tablink.active').dataset.tab;

  if (activeTab === 'pendingTab') {
    filteredPending = pendingComments.filter(c =>
      c.Name.toLowerCase().includes(q) ||
      c.Email.toLowerCase().includes(q) ||
      c.Content.toLowerCase().includes(q)
    );
    currentPendingPage = 1;
    renderCommentsTable(filteredPending, 'pendingCommentsTable', 'pending', currentPendingPage, document.getElementById('modalArticleTitle').textContent, 'pendingPagination');
  } else if (activeTab === 'approvedTab') {
    filteredApproved = approvedComments.filter(c =>
      c.Name.toLowerCase().includes(q) ||
      c.Email.toLowerCase().includes(q) ||
      c.Content.toLowerCase().includes(q)
    );
    currentApprovedPage = 1;
    renderCommentsTable(filteredApproved, 'approvedCommentsTable', 'approved', currentApprovedPage, document.getElementById('modalArticleTitle').textContent, 'approvedPagination');
  } else if (activeTab === 'rejectedTab') {
    filteredRejected = rejectedComments.filter(c =>
      c.Name.toLowerCase().includes(q) ||
      c.Email.toLowerCase().includes(q) ||
      c.Content.toLowerCase().includes(q)
    );
    currentRejectedPage = 1;
    renderCommentsTable(filteredRejected, 'rejectedCommentsTable', 'rejected', currentRejectedPage, document.getElementById('modalArticleTitle').textContent, 'rejectedPagination');
  }
});

// ---------------------------------
// Init
// ---------------------------------
document.addEventListener('DOMContentLoaded', loadArticlesWithComments);

// ==============================
// Trends Comments Management
// ==============================
let pendingTrendComments = [], approvedTrendComments = [], rejectedTrendComments = [];
let currentPendingTrendPage = 1, currentApprovedTrendPage = 1, currentRejectedTrendPage = 1;
const trendCommentsPageSize = 5;
let filteredPendingTrendComments = [], filteredApprovedTrendComments = [], filteredRejectedTrendComments = [];

// ---------------------------------
// Load trends with comment stats
// ---------------------------------
async function loadTrendsWithComments() {
  try {
    const res = await fetch('/api/trends/with-comments', { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load trends');

    const container = document.getElementById('trendsWithComments');
    container.innerHTML = '';
    container.className = 'trdComments-grid'; // apply new grid

    if (!data.data.length) {
      container.innerHTML = '<p>No trends with comments found.</p>';
      return;
    }

    data.data.forEach(trend => {
      const mainImage = trend.ImageURL || 'images/default-trend.jpg';

      const card = document.createElement('div');
      card.className = 'trdComments-card';

      card.innerHTML = `
        <img src="${mainImage}" alt="${trend.TrendTitle_EN}" class="trdComments-mainImage">

        <div class="trdComments-info">

          <h5>${trend.TrendTitle_EN}</h5>

          <div class="trdComments-meta">
            <span><i class="fa-regular fa-calendar"></i> ${moment(trend.CreatedOn).format('LL')}</span>
          </div>

          <div class="trdComments-comments">
            <p class="text-warning">
              <i class="fa-solid fa-hourglass-half"></i> Pending: ${trend.PendingCount}
            </p>
            <p class="text-success">
              <i class="fa-solid fa-check-circle"></i> Approved: ${trend.ApprovedCount}
            </p>
          </div>

          <button class="trdComments-btn" onclick="viewTrendComments(${trend.TrendID}, '${trend.TrendTitle_EN.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-comments"></i> View Comments
          </button>

        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error('❌ Error loading trends:', err);
  }
}


// ---------------------------------
// View comments modal for trend
// ---------------------------------
async function viewTrendComments(trendId, trendTitle) {
  try {
    const res = await fetch(`/api/admintrendcomments/${trendId}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load trend comments');

    document.getElementById('modalTrendTitle').textContent = trendTitle;

    // Store comments
    pendingTrendComments = data.pending || [];
    approvedTrendComments = data.approved || [];
    rejectedTrendComments = data.rejected || [];

    filteredPendingTrendComments = [...pendingTrendComments];
    filteredApprovedTrendComments = [...approvedTrendComments];
    filteredRejectedTrendComments = [...rejectedTrendComments];

    currentPendingTrendPage = currentApprovedTrendPage = currentRejectedTrendPage = 1;

    renderTrendCommentsTable(filteredPendingTrendComments, 'trendsPendingCommentsTable', 'pending', currentPendingTrendPage, trendTitle, 'trendsPendingPagination');
    renderTrendCommentsTable(filteredApprovedTrendComments, 'trendsApprovedCommentsTable', 'approved', currentApprovedTrendPage, trendTitle, 'trendsApprovedPagination');
    renderTrendCommentsTable(filteredRejectedTrendComments, 'trendsRejectedCommentsTable', 'rejected', currentRejectedTrendPage, trendTitle, 'trendsRejectedPagination');

    document.getElementById('trendsCommentsModalCustom').style.display = 'block';
  } catch (err) {
    console.error('❌ Error loading trend comments:', err);
  }
}

// ---------------------------------
// Render comments table with pagination
// ---------------------------------
function renderTrendCommentsTable(list, tableId, type, currentPage, trendTitle, paginationId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  const start = (currentPage - 1) * trendCommentsPageSize;
  const pageItems = list.slice(start, start + trendCommentsPageSize);

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="${type !== 'rejected' ? 6 : 5}" class="text-center text-muted">No comments.</td></tr>`;
    return;
  }

  pageItems.forEach((c, idx) => {
    const tr = document.createElement('tr');

    const tdActions = document.createElement('td');
    if (type !== 'rejected') {
      if (type === 'pending') {
        const approveBtn = document.createElement('button');
        approveBtn.className = 'approve';
        approveBtn.textContent = 'Approve';
        approveBtn.addEventListener('click', () => updateTrendCommentStatus(c.CommentID, 'approve', c.TrendID, trendTitle));

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => updateTrendCommentStatus(c.CommentID, 'reject', c.TrendID, trendTitle));

        tdActions.appendChild(approveBtn);
        tdActions.appendChild(rejectBtn);
      } else if (type === 'approved') {
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => updateTrendCommentStatus(c.CommentID, 'reject', c.TrendID, trendTitle));
        tdActions.appendChild(rejectBtn);
      }
    }

    tr.innerHTML = `
      <td>${start + idx + 1}</td>
      <td>${c.Name}</td>
      <td>${c.Email}</td>
      <td>${c.Content}</td>
      <td>${moment(c.CreatedOn).fromNow()}</td>
    `;
    if (type !== 'rejected') tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });

  // Pagination
  const pagination = document.getElementById(paginationId);
  pagination.innerHTML = '';
  const pageCount = Math.ceil(list.length / trendCommentsPageSize);
  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = i;
    a.addEventListener('click', e => {
      e.preventDefault();
      if (type === 'pending') currentPendingTrendPage = i;
      else if (type === 'approved') currentApprovedTrendPage = i;
      else currentRejectedTrendPage = i;
      renderTrendCommentsTable(list, tableId, type, i, trendTitle, paginationId);
    });
    li.appendChild(a);
    pagination.appendChild(li);
  }
}

async function updateTrendCommentStatus(commentId, status, trendId, trendTitle) {
  try {
    const res = await fetch(`/api/trendcomments/${commentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      // Refresh modal comments
      await viewTrendComments(trendId, trendTitle);
      await refreshTrendComments(trendId, trendTitle);
      // Refresh trends list to update counts
      await loadTrendsWithComments();
    } else {
      alert(data.message || 'Failed to update comment status.');
    }
  } catch (err) {
    console.error('❌ Error updating trend comment status:', err);
    alert('Error updating comment status. Try again.');
  }
}

async function refreshTrendComments(trendId, trendTitle) {
  const res = await fetch(`/api/admintrendcomments/${trendId}?t=${Date.now()}`);
  const data = await res.json();

  // Replace ALL global arrays with fresh DB data
  pendingTrendComments  = data.pending || [];
  approvedTrendComments = data.approved || [];
  rejectedTrendComments = data.rejected || [];

  // Reset filters
  filteredPendingTrendComments  = [...pendingTrendComments];
  filteredApprovedTrendComments = [...approvedTrendComments];
  filteredRejectedTrendComments = [...rejectedTrendComments];

  currentPendingTrendPage = currentApprovedTrendPage = currentRejectedTrendPage = 1;

  // Re-render all tables
  renderTrendCommentsTable(filteredPendingTrendComments, 'trendsPendingCommentsTable', 'pending', 1, trendTitle, 'trendsPendingPagination');
  renderTrendCommentsTable(filteredApprovedTrendComments, 'trendsApprovedCommentsTable', 'approved', 1, trendTitle, 'trendsApprovedPagination');
  renderTrendCommentsTable(filteredRejectedTrendComments, 'trendsRejectedCommentsTable', 'rejected', 1, trendTitle, 'trendsRejectedPagination');
}

// ---------------------------------
// Modal close
// ---------------------------------
document.getElementById('closeTrendsCommentsModal').onclick = () => {
  document.getElementById('trendsCommentsModalCustom').style.display = 'none';
};
window.onclick = e => {
  if (e.target === document.getElementById('trendsCommentsModalCustom'))
    document.getElementById('trendsCommentsModalCustom').style.display = 'none';
};

// ---------------------------------
// Tabs
// ---------------------------------
document.querySelectorAll('#trendsCommentsModalCustom .tablink').forEach(tab => {
  tab.addEventListener('click', function () {
    const target = this.dataset.tab;
    document.querySelectorAll('#trendsCommentsModalCustom .tablink').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#trendsCommentsModalCustom .tab-pane').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ---------------------------------
// Search
// ---------------------------------
document.getElementById('trendsCommentSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const activeTab = document.querySelector('#trendsCommentsModalCustom .tablink.active').dataset.tab;

  if (activeTab === 'trendsPendingTab') {
    filteredPendingTrendComments = pendingTrendComments.filter(c =>
      c.Name.toLowerCase().includes(q) || c.Email.toLowerCase().includes(q) || c.Content.toLowerCase().includes(q)
    );
    currentPendingTrendPage = 1;
    renderTrendCommentsTable(filteredPendingTrendComments, 'trendsPendingCommentsTable', 'pending', currentPendingTrendPage, document.getElementById('modalTrendTitle').textContent, 'trendsPendingPagination');
  } else if (activeTab === 'trendsApprovedTab') {
    filteredApprovedTrendComments = approvedTrendComments.filter(c =>
      c.Name.toLowerCase().includes(q) || c.Email.toLowerCase().includes(q) || c.Content.toLowerCase().includes(q)
    );
    currentApprovedTrendPage = 1;
    renderTrendCommentsTable(filteredApprovedTrendComments, 'trendsApprovedCommentsTable', 'approved', currentApprovedTrendPage, document.getElementById('modalTrendTitle').textContent, 'trendsApprovedPagination');
  } else if (activeTab === 'trendsRejectedTab') {
    filteredRejectedTrendComments = rejectedTrendComments.filter(c =>
      c.Name.toLowerCase().includes(q) || c.Email.toLowerCase().includes(q) || c.Content.toLowerCase().includes(q)
    );
    currentRejectedTrendPage = 1;
    renderTrendCommentsTable(filteredRejectedTrendComments, 'trendsRejectedCommentsTable', 'rejected', currentRejectedTrendPage, document.getElementById('modalTrendTitle').textContent, 'trendsRejectedPagination');
  }
});
document.addEventListener('DOMContentLoaded', loadTrendsWithComments);

async function loadSubscribers() {
  try {
    const res = await fetch('/api/newsletter/list');
    const data = await res.json();

    if (!data.success) return;
    const tbody = document.querySelector("#subscribersTable tbody");
    tbody.innerHTML = "";

    data.data.forEach(sub => {
      tbody.innerHTML += `
        <tr>
          <td>${sub.SubscriberID}</td>
          <td>${sub.Email}</td>
          <td>${sub.SubscribedOn ? new Date(sub.SubscribedOn).toLocaleString() : '-'}</td>
          <td>${sub.IsConfirmed ? "✔️ Yes" : "❌ No"}</td>
          <td>${sub.IsActive ? "🟢 Active" : "🔴 Inactive"}</td>
          <td>${sub.UnsubscribedOn ? new Date(sub.UnsubscribedOn).toLocaleString() : '-'}</td>
          <td>
            ${
              sub.IsActive
              ? `<button class="btn btn-danger btn-sm" onclick="unsubscribeUser(${sub.SubscriberID})">Unsubscribe</button>`
              : `<button class="btn btn-success btn-sm" onclick="reactivateUser(${sub.SubscriberID})">Activate</button>`
            }
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error loading subscribers:", err);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadSubscribers(); // then load data
});

async function unsubscribeUser(id) {
  if (!confirm("Are you sure you want to unsubscribe this user?")) return;

  const res = await fetch('/api/newsletter/admin/unsubscribe', {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriberId: id })
  });

  const data = await res.json();
  alert(data.message);
  loadSubscribers();
}

async function reactivateUser(id) {
  const res = await fetch('/api/newsletter/admin/reactivate', {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriberId: id })
  });

  const data = await res.json();
  alert(data.message);
  loadSubscribers();
}

document.querySelector("#subscriberSearch").addEventListener("input", function () {
  const search = this.value.toLowerCase();
  document.querySelectorAll("#subscribersTable tbody tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(search) ? "" : "none";
  });
});

// --------------------
// Initial Load
// --------------------
loadCategories();
loadPendingNews();
loadAllNewsEngagement();
loadInactiveNews();

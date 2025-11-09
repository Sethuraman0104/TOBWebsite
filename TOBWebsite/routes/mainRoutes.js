const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Temporary admin middleware
const isAdmin = (req, res, next) => {
  req.user = { UserID: 1, Role: 'Admin' };
  next();
};

// -------------------------
// 1️⃣ Get all news (with optional lang)
// -------------------------
router.get('/news', async (req, res) => {
  const lang = req.query.lang || 'en';
  try {
    await sql.connect(sqlConfig);
    const result = await new sql.Request()
      .input('lang', sql.NVarChar, lang)
      .query(`
        SELECT ArticleID,
               CASE WHEN @lang='ar' AND Title_Ar IS NOT NULL THEN Title_Ar ELSE Title END AS Title,
               CASE WHEN @lang='ar' AND Content_Ar IS NOT NULL THEN Content_Ar ELSE Content END AS Content,
               ImageURL,
               CategoryID,
               CreatedOn,
               PublishedOn,
               IsApproved,
               IsActive
        FROM NewsArticles
        ORDER BY PublishedOn DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('GET NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 2️⃣ Create News
// -------------------------
router.post('/news/create', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { Title, Content, Title_Ar, Content_Ar, CategoryID } = req.body;
    if (!Title || !Content || !CategoryID)
      return res.status(400).json({ success: false, message: 'Title, Content, and CategoryID required' });

    const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    await pool.request()
      .input('Title', sql.NVarChar(255), Title)
      .input('Content', sql.NText, Content)
      .input('Title_Ar', sql.NVarChar(255), Title_Ar || null)
      .input('Content_Ar', sql.NText, Content_Ar || null)
      .input('CategoryID', sql.Int, parseInt(CategoryID))
      .input('AuthorID', sql.Int, req.user.UserID)
      .input('ImageURL', sql.NVarChar(255), ImageURL)
      .query(`
        INSERT INTO NewsArticles (Title, Content, Title_Ar, Content_Ar, CategoryID, AuthorID, ImageURL, IsApproved, IsActive, CreatedOn)
        VALUES (@Title, @Content, @Title_Ar, @Content_Ar, @CategoryID, @AuthorID, @ImageURL, 0, 1, GETDATE())
      `);

    res.json({ success: true, message: 'News created successfully and awaiting approval.' });
  } catch (err) {
    console.error('CREATE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 3️⃣ Update News
// -------------------------
router.post('/news/update/:id', isAdmin, upload.single('image'), async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    const { Title, Content, Title_Ar, Content_Ar, CategoryID } = req.body;
    if (!Title || !Content || !CategoryID)
      return res.status(400).json({ success: false, message: 'Title, Content, and CategoryID required' });

    const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    const request = pool.request();
    request.input('ArticleID', sql.Int, ArticleID)
           .input('Title', sql.NVarChar(255), Title)
           .input('Content', sql.NText, Content)
           .input('Title_Ar', sql.NVarChar(255), Title_Ar || null)
           .input('Content_Ar', sql.NText, Content_Ar || null)
           .input('CategoryID', sql.Int, parseInt(CategoryID));
    if (ImageURL) request.input('ImageURL', sql.NVarChar(255), ImageURL);

    await request.query(`
      UPDATE NewsArticles
      SET Title=@Title,
          Content=@Content,
          Title_Ar=@Title_Ar,
          Content_Ar=@Content_Ar,
          CategoryID=@CategoryID
          ${ImageURL ? ', ImageURL=@ImageURL' : ''},
          UpdatedOn=GETDATE()
      WHERE ArticleID=@ArticleID
    `);

    res.json({ success: true, message: 'News updated successfully.' });
  } catch (err) {
    console.error('UPDATE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 4️⃣ Delete News
// -------------------------
const fs = require('fs');
router.delete('/news/:id', isAdmin, async (req, res) => {
  const ArticleID = parseInt(req.params.id);

  try {
    await sql.connect(sqlConfig);

    // 1️⃣ First, get the ImageURL of this article
    const result = await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query('SELECT ImageURL FROM NewsArticles WHERE ArticleID = @ArticleID');

    if (result.recordset.length) {
      const imageURL = result.recordset[0].ImageURL;

      // 2️⃣ If image exists, delete from uploads folder
      if (imageURL) {
        const imagePath = path.join(__dirname, '..', 'public', imageURL.replace(/^\/+/, ''));
        fs.unlink(imagePath, (err) => {
          if (err) console.warn('Could not delete image:', err.message);
        });
      }
    }

    // 3️⃣ Delete the article from DB
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query('DELETE FROM NewsArticles WHERE ArticleID=@ArticleID');

    res.json({ success: true, message: 'News deleted successfully.' });
  } catch (err) {
    console.error('DELETE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 5️⃣ Approve News
// -------------------------
router.post('/news/approve/:id', isAdmin, async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query(`UPDATE NewsArticles SET IsApproved=1, PublishedOn=GETDATE() WHERE ArticleID=@ArticleID`);
    res.json({ success: true });
  } catch (err) {
    console.error('APPROVE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 6️⃣ Admin: Get all news with likes/comments
// -------------------------
router.get('/news/admin', isAdmin, async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query(`
      SELECT n.ArticleID, n.Title, n.Title_Ar, n.Content, n.Content_Ar,
             n.ImageURL, n.IsApproved, n.IsActive, n.CreatedOn, n.PublishedOn, n.CategoryID,
             n.UpdatedOn,
             (SELECT COUNT(*) FROM Likes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
             (SELECT COUNT(*) FROM Comments c WHERE c.ArticleID = n.ArticleID) AS CommentsCount
      FROM NewsArticles n
      ORDER BY n.CreatedOn DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('ADMIN NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 7️⃣ Deactivate News
// -------------------------
router.post('/news/deactivate/:id', isAdmin, async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query(`UPDATE NewsArticles SET IsActive=0 WHERE ArticleID=@ArticleID`);
    res.json({ success: true, message: 'News deactivated successfully.' });
  } catch (err) {
    console.error('DEACTIVATE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 8️⃣ Reactivate News
// -------------------------
router.post('/news/reactivate/:id', isAdmin, async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query(`UPDATE NewsArticles SET IsActive=1 WHERE ArticleID=@ArticleID`);
    res.json({ success: true, message: 'News reactivated successfully.' });
  } catch (err) {
    console.error('REACTIVATE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// 9️⃣ Get All Active News Categories
// -------------------------
router.get('/news/categories', async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await new sql.Request()
      .query(`
        SELECT CategoryID, 
               CategoryName, 
               CategoryName_Ar
        FROM NewsCategories
        WHERE IsActive = 1
        ORDER BY CategoryName
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('GET NEWS CATEGORIES ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------
// Login
// -------------------------
router.post('/login', async (req, res) => {
  const { Email, Password } = req.body;
  if (!Email || !Password) return res.status(400).json({ success: false, message: 'Email & password required' });

  try {
    await sql.connect(sqlConfig);
    const result = await new sql.Request()
      .input('Email', sql.NVarChar, Email)
      .query('SELECT * FROM Users WHERE Email=@Email AND IsActive=1');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(Password, user.PasswordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Save user info in session
    req.session.user = { 
      UserID: user.UserID, 
      Email: user.Email, 
      Role: user.Role, 
      FullName: user.FullName 
    };
    res.json({ success: true, message: 'Login successful', user: req.session.user });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -------------------------
// Logout
// -------------------------
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// -------------------------
// Middleware to protect routes
// -------------------------
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ success: false, message: 'Login required' });
}
module.exports.requireLogin = requireLogin;



// -------------------------
// 404 fallback for API
// -------------------------
router.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

module.exports = router;

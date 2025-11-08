const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const multer = require('multer');
const path = require('path');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Temporary Admin Middleware
const isAdmin = (req, res, next) => {
  req.user = { UserID: 1, Role: 'Admin' }; // temporary admin
  next();
};

// 1️⃣ Get all approved news (bilingual)
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
               CreatedOn,
               PublishedOn,
               IsApproved
        FROM NewsArticles
        WHERE IsApproved = 1
        ORDER BY PublishedOn DESC
      `);
    res.json(result.recordset); // ✅ return recordset array
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2️⃣ Create news (Admin)
router.post('/news/create', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const Title = req.body.Title?.trim();
    const Content = req.body.Content?.trim();
    const Title_Ar = req.body.Title_Ar?.trim() || null;
    const Content_Ar = req.body.Content_Ar?.trim() || null;
    const CategoryID = parseInt(req.body.CategoryID);

    if (!Title || !Content || isNaN(CategoryID)) {
      return res.status(400).json({ success: false, message: 'Title, Content, and CategoryID are required.' });
    }

    const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    const request = pool.request();
    request.input('Title', sql.NVarChar(255), Title);
    request.input('Content', sql.NText, Content);
    request.input('Title_Ar', sql.NVarChar(255), Title_Ar);
    request.input('Content_Ar', sql.NText, Content_Ar);
    request.input('CategoryID', sql.Int, CategoryID);
    request.input('AuthorID', sql.Int, req.user.UserID);
    request.input('ImageURL', sql.NVarChar(255), ImageURL);

    await request.query(`
      INSERT INTO NewsArticles 
      (Title, Content, Title_Ar, Content_Ar, CategoryID, AuthorID, ImageURL, IsApproved, CreatedOn)
      VALUES (@Title, @Content, @Title_Ar, @Content_Ar, @CategoryID, @AuthorID, @ImageURL, 0, GETDATE())
    `);

    res.json({ success: true, message: 'News created successfully and awaiting approval.' });
    await pool.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3️⃣ Approve news
router.post('/news/approve/:id', isAdmin, async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .query(`UPDATE NewsArticles SET IsApproved=1, PublishedOn=GETDATE() WHERE ArticleID=@ArticleID`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Add comment
router.post('/news/:id/comment', async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  const { UserID, CommentText } = req.body;
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('ArticleID', sql.Int, ArticleID)
      .input('UserID', sql.Int, UserID)
      .input('CommentText', sql.NVarChar(sql.MAX), CommentText)
      .query(`INSERT INTO Comments (ArticleID, UserID, CommentText) VALUES (@ArticleID, @UserID, @CommentText)`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 5️⃣ Approve comment
router.post('/comments/approve/:id', isAdmin, async (req, res) => {
  const CommentID = parseInt(req.params.id);
  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('CommentID', sql.Int, CommentID)
      .query(`UPDATE Comments SET IsApproved=1 WHERE CommentID=@CommentID`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6️⃣ Like article
router.post('/news/:id/like', async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  const { UserID } = req.body;
  try {
    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input('ArticleID', sql.Int, ArticleID);
    request.input('UserID', sql.Int, UserID);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM Likes WHERE ArticleID=@ArticleID AND UserID=@UserID)
      INSERT INTO Likes (ArticleID, UserID) VALUES (@ArticleID, @UserID)
    `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7️⃣ Get pending comments
router.get('/comments/pending', isAdmin, async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query(`
      SELECT CommentID, ArticleID, UserID, CommentText
      FROM Comments
      WHERE IsApproved=0
      ORDER BY CreatedOn DESC
    `);
    res.json(result.recordset); // ✅ return array
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8️⃣ Get all news with likes & comments count (Admin)
router.get('/news/admin', isAdmin, async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query(`
      SELECT n.ArticleID,
             n.Title, n.Title_Ar, n.Content, n.Content_Ar,
             n.ImageURL, n.IsApproved, n.CreatedOn, n.PublishedOn,
             (SELECT COUNT(*) FROM Likes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
             (SELECT COUNT(*) FROM Comments c WHERE c.ArticleID = n.ArticleID) AS CommentsCount
      FROM NewsArticles n
      ORDER BY n.CreatedOn DESC
    `);
    res.json(result.recordset); // ✅ must return array
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

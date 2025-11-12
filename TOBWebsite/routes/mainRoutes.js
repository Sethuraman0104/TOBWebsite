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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(sqlConfig);

    // Increment view count
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE NewsArticles SET ViewCount = ISNULL(ViewCount,0) + 1 WHERE ArticleID = @id`);

    // Get the article
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT * FROM NewsArticles WHERE ArticleID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: result.recordset[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching article' });
  }
});

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
               IsActive,IsTopStory,IsFeatured,HighlightOrder
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
// Create News
// -------------------------
router.post('/news/create', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { Title, Content, Title_Ar, Content_Ar, CategoryID, IsTopStory, IsFeatured } = req.body;
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
      .input('IsTopStory', sql.Bit, IsTopStory === 'true' ? 1 : 0)
      .input('IsFeatured', sql.Bit, IsFeatured === 'true' ? 1 : 0)
      .query(`
        INSERT INTO NewsArticles (Title, Content, Title_Ar, Content_Ar, CategoryID, AuthorID, ImageURL, IsApproved, IsActive, CreatedOn, IsTopStory, IsFeatured)
        VALUES (@Title, @Content, @Title_Ar, @Content_Ar, @CategoryID, @AuthorID, @ImageURL, 0, 1, GETDATE(), @IsTopStory, @IsFeatured)
      `);

    res.json({ success: true, message: 'News created successfully and awaiting approval.' });
  } catch (err) {
    console.error('CREATE NEWS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/news/update/:id', isAdmin, upload.single('image'), async (req, res) => {
  const ArticleID = parseInt(req.params.id);
  try {
    const { Title, Content, Title_Ar, Content_Ar, CategoryID, IsTopStory, IsFeatured } = req.body;

    const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    const request = pool.request();
    request.input('ArticleID', sql.Int, ArticleID)
      .input('Title', sql.NVarChar(255), Title)
      .input('Content', sql.NText, Content)
      .input('Title_Ar', sql.NVarChar(255), Title_Ar || null)
      .input('Content_Ar', sql.NText, Content_Ar || null)
      .input('CategoryID', sql.Int, parseInt(CategoryID))
      .input('IsTopStory', sql.Bit, IsTopStory === 'true' ? 1 : 0)
      .input('IsFeatured', sql.Bit, IsFeatured === 'true' ? 1 : 0);

    if (ImageURL) request.input('ImageURL', sql.NVarChar(255), ImageURL);

    await request.query(`
      UPDATE NewsArticles
      SET Title=@Title,
          Content=@Content,
          Title_Ar=@Title_Ar,
          Content_Ar=@Content_Ar,
          CategoryID=@CategoryID,
          IsTopStory=@IsTopStory,
          IsFeatured=@IsFeatured
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
             n.UpdatedOn,n.IsTopStory,n.IsFeatured,n.HighlightOrder, n.ViewCount,
             (SELECT COUNT(*) FROM NewsLikes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
             (SELECT COUNT(*) FROM NewsComments c WHERE c.ArticleID = n.ArticleID and c.IsApproved=1) AS CommentsCount
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
// 6️⃣ Admin: Get active & approved news grouped by category
// -------------------------
router.get('/news/categories/admin', isAdmin, async (req, res) => {
  try {
    await sql.connect(sqlConfig);

    const result = await sql.query(`
      SELECT 
          c.CategoryID, 
          c.CategoryName, 
          c.CategoryName_Ar,
          n.ArticleID, 
          n.Title, 
          n.Title_Ar, 
          n.Content, 
          n.Content_Ar,
          n.ImageURL, 
          n.CreatedOn, 
          n.PublishedOn, 
          n.IsTopStory,
          n.IsFeatured,
          n.HighlightOrder,
          (SELECT COUNT(*) FROM NewsLikes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
          (SELECT COUNT(*) FROM NewsComments c WHERE c.ArticleID = n.ArticleID and c.IsApproved=1) AS CommentsCount
      FROM NewsCategories c
      LEFT JOIN NewsArticles n 
          ON n.CategoryID = c.CategoryID
          AND n.IsActive = 1
          AND n.IsApproved = 1
      WHERE c.IsActive = 1
      ORDER BY c.CategoryName, n.HighlightOrder ASC, n.PublishedOn DESC
    `);

    // Optional: group articles by category for easier front-end consumption
    const categories = {};
    result.recordset.forEach(row => {
      const catId = row.CategoryID;
      if (!categories[catId]) {
        categories[catId] = {
          CategoryID: catId,
          CategoryName: row.CategoryName,
          CategoryName_Ar: row.CategoryName_Ar,
          Articles: []
        };
      }
      if (row.ArticleID) {
        categories[catId].Articles.push({
          ArticleID: row.ArticleID,
          Title: row.Title,
          Title_Ar: row.Title_Ar,
          Content: row.Content,
          Content_Ar: row.Content_Ar,
          ImageURL: row.ImageURL || '/images/default-news.jpg',
          CreatedOn: row.CreatedOn,
          PublishedOn: row.PublishedOn,
          IsTopStory: row.IsTopStory,
          IsFeatured: row.IsFeatured,
          HighlightOrder: row.HighlightOrder,
          LikesCount: row.LikesCount,
          CommentsCount: row.CommentsCount
        });
      }
    });

    res.json(Object.values(categories));

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
               CategoryName_Ar,Description,Description_Ar,IsActive
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
// 9️⃣ Get All Active News Categories
// -------------------------
router.get('/news/Allcategories', async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await new sql.Request()
      .query(`
        SELECT *
        FROM NewsCategories
        ORDER BY CategoryName
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('GET NEWS CATEGORIES ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get article by ID
router.get('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(sqlConfig);

    // Increment view count
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE NewsArticles SET ViewCount = ISNULL(ViewCount,0) + 1 WHERE ArticleID = @id`);

    // Get article with author name
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT n.*, u.FullName AS AuthorName
        FROM NewsArticles n
        LEFT JOIN Users u ON n.AuthorID = u.UserID
        WHERE n.ArticleID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: result.recordset[0] });

  } catch (err) {
    console.error('GET ARTICLE ERROR:', err);
    res.status(500).json({ success: false, message: 'Error fetching article' });
  }
});

// --------------------
// Add new category
// --------------------
router.post('/news/category/add', isAdmin, async (req, res) => {
  const { CategoryName, CategoryName_Ar, Description, Description_Ar, IsActive } = req.body;

  if (!CategoryName) return res.json({ success: false, message: 'Category name (English) is required.' });

  try {
    const pool = await sql.connect(sqlConfig);

    // Check for duplicate
    const duplicateCheck = await pool.request()
      .input('CategoryName', sql.NVarChar, CategoryName)
      .input('CategoryName_Ar', sql.NVarChar, CategoryName_Ar || '')
      .query(`
        SELECT 1 FROM NewsCategories
        WHERE CategoryName = @CategoryName OR CategoryName_Ar = @CategoryName_Ar
      `);

    if (duplicateCheck.recordset.length > 0) {
      return res.json({ success: false, message: 'Category name already exists (English or Arabic).' });
    }

    // Insert new category
    await pool.request()
      .input('CategoryName', sql.NVarChar, CategoryName)
      .input('CategoryName_Ar', sql.NVarChar, CategoryName_Ar || '')
      .input('Description', sql.NVarChar, Description || '')
      .input('Description_Ar', sql.NVarChar, Description_Ar || '')
      .input('IsActive', sql.Bit, IsActive ? 1 : 0)
      .query(`
        INSERT INTO NewsCategories 
          (CategoryName, CategoryName_Ar, Description, Description_Ar, IsActive)
        VALUES 
          (@CategoryName, @CategoryName_Ar, @Description, @Description_Ar, @IsActive)
      `);

    res.json({ success: true, message: 'Category added successfully.' });

  } catch (err) {
    console.error('Add Category Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add category.' });
  }
});

// --------------------
// Update category
// --------------------
router.put('/news/category/update/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { CategoryName, CategoryName_Ar, Description, Description_Ar, IsActive } = req.body;

  if (!CategoryName) return res.json({ success: false, message: 'Category name (English) is required.' });

  try {
    const pool = await sql.connect(sqlConfig);

    // Check for duplicate excluding current
    const duplicateCheck = await pool.request()
      .input('CategoryID', sql.Int, id)
      .input('CategoryName', sql.NVarChar, CategoryName)
      .input('CategoryName_Ar', sql.NVarChar, CategoryName_Ar || '')
      .query(`
        SELECT 1 FROM NewsCategories
        WHERE (CategoryName = @CategoryName OR CategoryName_Ar = @CategoryName_Ar)
          AND CategoryID <> @CategoryID
      `);

    if (duplicateCheck.recordset.length > 0) {
      return res.json({ success: false, message: 'Another category with same name exists.' });
    }

    // Update
    await pool.request()
      .input('CategoryID', sql.Int, id)
      .input('CategoryName', sql.NVarChar, CategoryName)
      .input('CategoryName_Ar', sql.NVarChar, CategoryName_Ar || '')
      .input('Description', sql.NVarChar, Description || '')
      .input('Description_Ar', sql.NVarChar, Description_Ar || '')
      .input('IsActive', sql.Bit, IsActive ? 1 : 0)
      .query(`
        UPDATE NewsCategories
        SET CategoryName = @CategoryName,
            CategoryName_Ar = @CategoryName_Ar,
            Description = @Description,
            Description_Ar = @Description_Ar,
            IsActive = @IsActive
        WHERE CategoryID = @CategoryID
      `);

    res.json({ success: true, message: 'Category updated successfully.' });

  } catch (err) {
    console.error('Update Category Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// --------------------
// Delete category (only if no linked articles)
// --------------------
router.delete('/news/category/delete/:id', isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(sqlConfig);

    // Check linked articles
    const linkedArticles = await pool.request()
      .input('CategoryID', sql.Int, id)
      .query(`SELECT COUNT(*) AS Count FROM NewsArticles WHERE CategoryID = @CategoryID AND IsActive = 1`);

    if (linkedArticles.recordset[0].Count > 0) {
      return res.json({ success: false, message: 'Cannot delete category with active articles.' });
    }

    // Delete
    await pool.request()
      .input('CategoryID', sql.Int, id)
      .query(`DELETE FROM NewsCategories WHERE CategoryID = @CategoryID`);

    res.json({ success: true, message: 'Category deleted successfully.' });

  } catch (err) {
    console.error('Delete Category Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

// --------------------
// Get all categories
// --------------------
router.get('/news/categories', isAdmin, async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .query(`SELECT * FROM NewsCategories ORDER BY CategoryName`);

    res.json(result.recordset);

  } catch (err) {
    console.error('Get Categories Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
});

// --------------------
// Get single category by ID
// --------------------
router.get('/news/category/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('CategoryID', sql.Int, id)
      .query(`SELECT * FROM NewsCategories WHERE CategoryID = @CategoryID`);

    res.json(result.recordset[0] || {});

  } catch (err) {
    console.error('Get Category Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch category.' });
  }
});



// ----------------------
// GET comments for article
// ----------------------
router.get('/comments/:articleId', async (req, res) => {
  try {
    const articleId = parseInt(req.params.articleId);
    if (isNaN(articleId)) return res.status(400).json([]);

    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('articleId', sql.Int, articleId)
      .query(`
        SELECT CommentID, ArticleID, Name, Email, Content, ParentCommentID, CreatedOn, IsActive, IsApproved
        FROM NewsComments
        WHERE ArticleID = @articleId AND IsApproved = 1
        ORDER BY CreatedOn DESC
      `);

    const comments = result.recordset.map(c => ({ ...c, Replies: [] }));
    res.json(comments);
  } catch (err) {
    console.error('❌ GET /comments error:', err);
    res.status(500).json([]);
  }
});

// ----------------------
// POST new comment or reply
// ----------------------
router.post('/comments', async (req, res) => {
  try {
    const { articleId, name, email, content, parentCommentId = null } = req.body;
    const articleIdNum = parseInt(articleId);
    const parentIdNum = parentCommentId ? parseInt(parentCommentId) : null;

    if (!articleIdNum || !name || !content) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const pool = await sql.connect(sqlConfig);
    await pool.request()
      .input('articleId', sql.Int, articleIdNum)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email || 'noreply@tobnews.com')
      .input('content', sql.NText, content)
      .input('parentCommentId', sql.Int, parentIdNum)
      .query(`
        INSERT INTO NewsComments
        (ArticleID, Name, Email, Content, ParentCommentID, CreatedOn, IsActive, IsApproved)
        VALUES (@articleId, @name, @email, @content, @parentCommentId, GETDATE(), 1, 0)
      `);

    res.json({ success: true, message: 'Comment submitted and pending approval.' });
  } catch (err) {
    console.error('❌ POST /comments error:', err);
    res.status(500).json({ success: false, message: 'Server error adding comment.' });
  }
});

// ----------------------
// POST like
// ----------------------
router.post('/likes', async (req, res) => {
  try {
    const { articleId, userIdentifier } = req.body;
    const articleIdNum = parseInt(articleId);
    if (!articleIdNum || !userIdentifier) return res.status(400).json({ success: false });

    const pool = await sql.connect(sqlConfig);
    const exists = await pool.request()
      .input('articleId', sql.Int, articleIdNum)
      .input('userIdentifier', sql.NVarChar, userIdentifier)
      .query(`
        SELECT 1 FROM NewsLikes WHERE ArticleID = @articleId AND UserIdentifier = @userIdentifier
      `);

    if (exists.recordset.length) {
      return res.json({ success: false, message: "Already liked" });
    }

    await pool.request()
      .input('articleId', sql.Int, articleIdNum)
      .input('userIdentifier', sql.NVarChar, userIdentifier)
      .query(`INSERT INTO NewsLikes (ArticleID, UserIdentifier, LikedOn) VALUES (@articleId, @userIdentifier, GETDATE())`);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /likes error:', err);
    res.status(500).json({ success: false });
  }
});

// ----------------------
// GET likes count
// ----------------------
router.get('/likes/:articleId', async (req, res) => {
  try {
    const articleIdNum = parseInt(req.params.articleId);
    if (!articleIdNum) return res.status(400).json({ LikeCount: 0 });

    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('articleId', sql.Int, articleIdNum)
      .query(`SELECT COUNT(*) AS LikeCount FROM NewsLikes WHERE ArticleID = @articleId`);

    res.json(result.recordset[0] || { LikeCount: 0 });
  } catch (err) {
    console.error('❌ GET /likes error:', err);
    res.status(500).json({ LikeCount: 0 });
  }
});

// -----------------------------
// GET articles with comment stats
// -----------------------------
router.get('/articles/with-comments', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request().query(`
      SELECT 
        a.ArticleID,
        a.Title,
        a.ImageURL,
        a.CreatedOn,
        COUNT(CASE WHEN c.IsApproved = 1 THEN 1 END) AS ApprovedCount,
        COUNT(CASE WHEN c.IsApproved = 0 THEN 1 END) AS PendingCount
      FROM NewsArticles a
      INNER JOIN NewsComments c ON a.ArticleID = c.ArticleID
      WHERE a.IsApproved = 1 AND a.IsActive = 1
      GROUP BY a.ArticleID, a.Title, a.ImageURL, a.CreatedOn
      ORDER BY a.CreatedOn DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching articles with comments:', err);
    res.status(500).json({ success: false });
  }
});


// ----------------------------------------------
// GET comments for specific article
// ----------------------------------------------
router.get('/admincomments/:articleId', async (req, res) => {
  try {
    const articleId = parseInt(req.params.articleId);
    if (isNaN(articleId)) return res.status(400).json({ success: false });

    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('articleId', sql.Int, articleId)
      .query(`
        SELECT CommentID, ArticleID, Name, Email, Content, CreatedOn, IsActive, IsApproved
        FROM NewsComments
        WHERE ArticleID = @articleId
        ORDER BY CreatedOn DESC
      `);

    const approved = result.recordset.filter(c => c.IsApproved === true && c.IsActive === true);
    const pending = result.recordset.filter(c => c.IsApproved === false && c.IsActive === true);
    const rejected = result.recordset.filter(c => c.IsActive === false);

    res.json({ success: true, approved, pending, rejected });
  } catch (err) {
    console.error('❌ GET /comments/:articleId error:', err);
    res.status(500).json({ success: false });
  }
});

// ----------------------------------------------
// PUT comment approve/reject
// ----------------------------------------------
router.put('/comments/:commentId/status', async (req, res) => {
  try {
    const { status } = req.body; // "approve" | "reject"
    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId) || !['approve', 'reject'].includes(status))
      return res.status(400).json({ success: false });

    const pool = await sql.connect(sqlConfig);
    if (status === 'approve') {
      await pool.request()
        .input('commentId', sql.Int, commentId)
        .query(`UPDATE NewsComments SET IsApproved = 1, IsActive = 1 WHERE CommentID = @commentId`);
    } else {
      await pool.request()
        .input('commentId', sql.Int, commentId)
        .query(`UPDATE NewsComments SET IsApproved = 0, IsActive = 0 WHERE CommentID = @commentId`);
    }

    res.json({ success: true, message: 'Comment status updated' });
  } catch (err) {
    console.error('❌ PUT /comments/:commentId/status error:', err);
    res.status(500).json({ success: false });
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

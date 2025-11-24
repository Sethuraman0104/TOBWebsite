const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// -------------------------
// Ensure correct uploads folder exists
// Use project root public/uploads, not __dirname/public/uploads
const uploadPath = path.join(__dirname, "..", "public", "uploads"); // <-- fixed path
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// -------------------------
// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath); // guaranteed folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });
// Temporary admin middleware
const isAdmin = (req, res, next) => {
  req.user = { UserID: 1, Role: 'Admin' };
  next();
};

const token = crypto.randomBytes(20).toString('hex');

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

// Create News
router.post(
  "/news/create",
  isAdmin,
  upload.fields([
    { name: "MainImage", maxCount: 1 },
    { name: "Attachments", maxCount: 50 }
  ]),
  async (req, res) => {
    try {
      const {
        Title, Content, Title_Ar, Content_Ar,
        CategoryID, IsTopStory, IsFeatured, IsBreakingNews, IsSpotlightNews
      } = req.body;

      if (!Title || !Content || !CategoryID) {
        return res.status(400).json({ success: false, message: "Title, Content and Category are required" });
      }

      const MainSlideImage = req.files?.MainImage
        ? `/uploads/${req.files.MainImage[0].filename}`
        : null;

      const Attachments = req.files?.Attachments
        ? req.files.Attachments.map(f => `/uploads/${f.filename}`)
        : [];

      const pool = await sql.connect(sqlConfig);
      const request = pool.request();

      request
        .input("Title", sql.NVarChar(255), Title)
        .input("Content", sql.NText, Content)
        .input("Title_Ar", sql.NVarChar(255), Title_Ar || null)
        .input("Content_Ar", sql.NText, Content_Ar || null)
        .input("CategoryID", sql.Int, parseInt(CategoryID))
        .input("AuthorID", sql.Int, req.session.user.UserID) // Use session.user
        .input("MainSlideImage", sql.NVarChar(255), MainSlideImage)
        .input("IsTopStory", sql.Bit, IsTopStory === "true")
        .input("IsFeatured", sql.Bit, IsFeatured === "true")
        .input("IsBreakingNews", sql.Bit, IsBreakingNews === "true")
        .input("IsSpotlightNews", sql.Bit, IsSpotlightNews === "true")
        .input("CreatedOn", sql.DateTime, new Date())
        .input("IsActive", sql.Bit, 1)
        .input("IsApproved", sql.Bit, 0)
        .input("Attachments", sql.NVarChar(sql.MAX), JSON.stringify(Attachments));

      await request.query(`
        INSERT INTO NewsArticles
        (Title, Content, Title_Ar, Content_Ar, CategoryID, AuthorID,
         MainSlideImage, IsTopStory, IsFeatured, IsBreakingNews, IsSpotlightNews,
         CreatedOn, IsActive, IsApproved, Attachments)
        VALUES
        (@Title, @Content, @Title_Ar, @Content_Ar, @CategoryID, @AuthorID,
         @MainSlideImage, @IsTopStory, @IsFeatured, @IsBreakingNews, @IsSpotlightNews,
         @CreatedOn, @IsActive, @IsApproved, @Attachments)
      `);

      res.json({ success: true, message: "News posted successfully." });
    } catch (err) {
      console.error("CREATE NEWS ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/news/update/:id',
  isAdmin,
  upload.fields([
    { name: 'MainImage', maxCount: 1 },
    { name: 'Attachments', maxCount: 10 }
  ]),
  async (req, res) => {
    const ArticleID = parseInt(req.params.id);
    try {
      const {
        Title, Content, Title_Ar, Content_Ar,
        CategoryID, IsTopStory, IsFeatured, IsBreakingNews, IsSpotlightNews,
        editExistingAttachments // hidden input with JSON of old attachments
      } = req.body;

      // Parse existing attachments
      let existingAttachments = [];
      if (editExistingAttachments) {
        try {
          existingAttachments = JSON.parse(editExistingAttachments);
        } catch (err) {
          console.error('Error parsing existing attachments:', err);
        }
      }

      // New uploaded attachments
      const newAttachments = req.files['Attachments']
        ? req.files['Attachments'].map(f => `/uploads/${f.filename}`)
        : [];

      // Merge both
      const finalAttachments = [...existingAttachments, ...newAttachments];

      const MainImage = req.files['MainImage']
        ? `/uploads/${req.files['MainImage'][0].filename}`
        : null;

      const pool = await sql.connect(sqlConfig);
      const request = pool.request();

      request.input('ArticleID', sql.Int, ArticleID)
        .input('Title', sql.NVarChar(255), Title)
        .input('Content', sql.NText, Content)
        .input('Title_Ar', sql.NVarChar(255), Title_Ar || null)
        .input('Content_Ar', sql.NText, Content_Ar || null)
        .input('CategoryID', sql.Int, parseInt(CategoryID))
        .input('IsTopStory', sql.Bit, IsTopStory === 'true' ? 1 : 0)
        .input('IsFeatured', sql.Bit, IsFeatured === 'true' ? 1 : 0)
        .input('IsBreakingNews', sql.Bit, IsBreakingNews === 'true' ? 1 : 0)
        .input('IsSpotlightNews', sql.Bit, IsSpotlightNews === 'true' ? 1 : 0)
        .input('UpdatedOn', sql.DateTime, new Date())
        .input('Attachments', sql.NVarChar(sql.MAX), JSON.stringify(finalAttachments));

      let updateQuery = `
        UPDATE NewsArticles
        SET Title=@Title,
            Content=@Content,
            Title_Ar=@Title_Ar,
            Content_Ar=@Content_Ar,
            CategoryID=@CategoryID,
            IsTopStory=@IsTopStory,
            IsFeatured=@IsFeatured,
            IsBreakingNews=@IsBreakingNews,
            IsSpotlightNews=@IsSpotlightNews,
            UpdatedOn=@UpdatedOn,
            Attachments=@Attachments
      `;

      if (MainImage) {
        request.input('MainImage', sql.NVarChar(255), MainImage);
        updateQuery += `, MainSlideImage=@MainImage`;
      }

      updateQuery += ` WHERE ArticleID=@ArticleID`;

      await request.query(updateQuery);

      res.json({ success: true, message: 'News updated successfully.' });
    } catch (err) {
      console.error('UPDATE NEWS ERROR:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);



// router.post('/news/update/:id', isAdmin, upload.single('image'), async (req, res) => {
//   const ArticleID = parseInt(req.params.id);
//   try {
//     const { Title, Content, Title_Ar, Content_Ar, CategoryID, IsTopStory, IsFeatured } = req.body;

//     const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

//     const pool = await sql.connect(sqlConfig);
//     const request = pool.request();
//     request.input('ArticleID', sql.Int, ArticleID)
//       .input('Title', sql.NVarChar(255), Title)
//       .input('Content', sql.NText, Content)
//       .input('Title_Ar', sql.NVarChar(255), Title_Ar || null)
//       .input('Content_Ar', sql.NText, Content_Ar || null)
//       .input('CategoryID', sql.Int, parseInt(CategoryID))
//       .input('IsTopStory', sql.Bit, IsTopStory === 'true' ? 1 : 0)
//       .input('IsFeatured', sql.Bit, IsFeatured === 'true' ? 1 : 0);

//     if (ImageURL) request.input('ImageURL', sql.NVarChar(255), ImageURL);

//     await request.query(`
//       UPDATE NewsArticles
//       SET Title=@Title,
//           Content=@Content,
//           Title_Ar=@Title_Ar,
//           Content_Ar=@Content_Ar,
//           CategoryID=@CategoryID,
//           IsTopStory=@IsTopStory,
//           IsFeatured=@IsFeatured
//           ${ImageURL ? ', ImageURL=@ImageURL' : ''},
//           UpdatedOn=GETDATE()
//       WHERE ArticleID=@ArticleID
//     `);

//     res.json({ success: true, message: 'News updated successfully.' });
//   } catch (err) {
//     console.error('UPDATE NEWS ERROR:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// -------------------------
// 4️⃣ Delete News
// -------------------------
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
// router.get('/news/admin', isAdmin, async (req, res) => {
//   try {
//     await sql.connect(sqlConfig);
//     const result = await sql.query(`
//       SELECT n.ArticleID, n.Title, n.Title_Ar, n.Content, n.Content_Ar,
//              n.ImageURL, n.IsApproved, n.IsActive, n.CreatedOn, n.PublishedOn, n.CategoryID,
//              n.UpdatedOn,n.IsTopStory,n.IsFeatured,n.HighlightOrder, n.ViewCount,
//              (SELECT COUNT(*) FROM NewsLikes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
//              (SELECT COUNT(*) FROM NewsComments c WHERE c.ArticleID = n.ArticleID and c.IsApproved=1) AS CommentsCount,
// 			 c.CategoryName, 
//           c.CategoryName_Ar
//       FROM NewsArticles n LEFT JOIN NewsCategories c ON c.CategoryID = n.CategoryID
//       ORDER BY n.CreatedOn DESC
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error('ADMIN NEWS ERROR:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// -------------------------
// 6️⃣ Admin: Get all news with likes/comments and full fields for edit
// -------------------------
router.get('/news/admin', isAdmin, async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query(`
      SELECT n.ArticleID, n.Title, n.Title_Ar, n.Content, n.Content_Ar,
             n.CategoryID, n.AuthorID, n.MainSlideImage, n.Attachments,
             n.IsApproved, n.IsActive, n.CreatedOn, n.PublishedOn, n.UpdatedOn,
             n.IsTopStory, n.IsFeatured, n.IsBreakingNews, n.IsSpotlightNews,
             n.HighlightOrder, n.ViewCount,
             (SELECT COUNT(*) FROM NewsLikes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
             (SELECT COUNT(*) FROM NewsComments c WHERE c.ArticleID = n.ArticleID AND c.IsApproved=1) AS CommentsCount,
             c.CategoryName, c.CategoryName_Ar
      FROM NewsArticles n
      LEFT JOIN NewsCategories c ON c.CategoryID = n.CategoryID
      ORDER BY n.CreatedOn DESC
    `);

    // Parse attachments from JSON
    const newsWithAttachments = result.recordset.map(n => ({
      ...n,
      Attachments: n.Attachments ? JSON.parse(n.Attachments) : [],
      IsTopStory: !!n.IsTopStory,
      IsFeatured: !!n.IsFeatured,
      IsBreakingNews: !!n.IsBreakingNews,
      IsSpotlightNews: !!n.IsSpotlightNews
    }));

    res.json(newsWithAttachments);
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

// Get article by ID with all fields for preview modal
router.get('/newscheck/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT n.ArticleID, n.Title, n.Title_Ar, n.Content, n.Content_Ar,
               n.CategoryID, n.MainSlideImage, n.Attachments,
               n.IsApproved, n.IsActive, n.CreatedOn, n.PublishedOn, n.UpdatedOn,
               n.IsTopStory, n.IsFeatured, n.IsBreakingNews, n.IsSpotlightNews,
               n.HighlightOrder, n.ViewCount,
               u.FullName AS AuthorName,
               c.CategoryName, c.CategoryName_Ar,
               (SELECT COUNT(*) FROM NewsLikes l WHERE l.ArticleID = n.ArticleID) AS LikesCount,
               (SELECT COUNT(*) FROM NewsComments c WHERE c.ArticleID = n.ArticleID AND c.IsApproved=1) AS CommentsCount
        FROM NewsArticles n
        LEFT JOIN Users u ON n.AuthorID = u.UserID
        LEFT JOIN NewsCategories c ON n.CategoryID = c.CategoryID
        WHERE n.ArticleID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const article = result.recordset[0];

    // Parse attachments JSON
    article.Attachments = article.Attachments ? JSON.parse(article.Attachments) : [];

    // Convert flags to boolean
    article.IsTopStory = !!article.IsTopStory;
    article.IsFeatured = !!article.IsFeatured;
    article.IsBreakingNews = !!article.IsBreakingNews;
    article.IsSpotlightNews = !!article.IsSpotlightNews;

    res.json({ success: true, data: article });

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
        COUNT(CASE WHEN (c.IsApproved = 0 AND c.IsActive = 1) THEN 1 END) AS PendingCount
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

// ===================================================================
// GET SINGLE TREND
// ===================================================================
router.get("/gettrend/:id", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool
      .request()
      .input("TrendID", sql.Int, req.params.id)
      .query("SELECT * FROM TrendingCards WHERE TrendID = @TrendID");

    if (result.recordset.length === 0)
      return res.json({ success: false, data: null });

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// GET trends with comment stats
// -----------------------------
router.get('/trends/with-comments', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request().query(`
      SELECT 
        t.TrendID,
        t.TrendTitle_EN,
        t.ImageURL,
        t.CreatedOn,
        COUNT(CASE WHEN c.IsApproved = 1 THEN 1 END) AS ApprovedCount,
        COUNT(CASE WHEN c.IsApproved = 0 AND c.IsActive=1 AND c.IsApproved IS NOT NULL THEN 1 END) AS PendingCount
      FROM TrendingCards t
      LEFT JOIN TrendComments c ON t.TrendID = c.TrendID
      WHERE t.IsActive = 1 AND c.IsActive = 1
      GROUP BY t.TrendID, t.TrendTitle_EN, t.ImageURL, t.CreatedOn
      ORDER BY t.CreatedOn DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching trends with comments:', err);
    res.status(500).json({ success: false, message: 'Error fetching trends with comments' });
  }
});

// ----------------------------------------------
// GET comments for specific trend
// ----------------------------------------------
router.get('/admintrendcomments/:trendId', async (req, res) => {
  try {
    const trendId = parseInt(req.params.trendId);
    if (isNaN(trendId)) return res.status(400).json({ success: false });

    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('trendId', sql.Int, trendId)
      .query(`
        SELECT CommentID, TrendID, ParentCommentID, Depth, Name, Email, Content, CreatedOn, IsApproved, IsActive
        FROM TrendComments
        WHERE TrendID = @trendId
        ORDER BY CreatedOn DESC
      `);
    console.log(result.recordset);
    const approved = result.recordset.filter(c => c.IsApproved === true && c.IsActive === true);
    const pending = result.recordset.filter(c => c.IsApproved === false && c.IsActive === true);
    const rejected = result.recordset.filter(c => c.IsActive === false);

    res.json({ success: true, approved, pending, rejected });
  } catch (err) {
    console.error('❌ GET /admintrendcomments/:trendId error:', err);
    res.status(500).json({ success: false });
  }
});


// ----------------------------------------------
// PUT comment approve/reject (TrendComments)
// ----------------------------------------------
router.put('/trendcomments/:commentId/status', async (req, res) => {
  try {
    const { status } = req.body; // "approve" | "reject"
    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId) || !['approve', 'reject'].includes(status))
      return res.status(400).json({ success: false });

    const pool = await sql.connect(sqlConfig);

    if (status === 'approve') {
      await pool.request()
        .input('commentId', sql.Int, commentId)
        .query(`UPDATE TrendComments SET IsApproved = 1,IsActive = 1 WHERE CommentID = @commentId`);
    } else {
      await pool.request()
        .input('commentId', sql.Int, commentId)
        .query(`UPDATE TrendComments SET IsApproved = 0,IsActive = 0 WHERE CommentID = @commentId`);
    }

    res.json({ success: true, message: 'Trend comment status updated' });
  } catch (err) {
    console.error('❌ PUT /trendcomments/:commentId/status error:', err);
    res.status(500).json({ success: false });
  }
});

// -------------------------------
// POST /newsletter/subscribe
// -------------------------------
router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email address.' });

    const pool = await sql.connect(sqlConfig);

    // Check if already exists
    const check = await pool.request()
      .input('Email', sql.NVarChar(255), email)
      .query(`SELECT * FROM NewsletterSubscribers WHERE Email = @Email`);

    const token = crypto.randomBytes(20).toString('hex');

    // Already confirmed & active
    if (check.recordset.length && check.recordset[0].IsConfirmed && check.recordset[0].IsActive) {
      return res.json({ success: false, message: 'You are already subscribed with us.' });
    }

    // Existing but inactive/unconfirmed → update token
    if (check.recordset.length) {
      await pool.request()
        .input('Email', sql.NVarChar(255), email)
        .input('Token', sql.NVarChar(100), token)
        .query(`
          UPDATE NewsletterSubscribers
          SET IsActive = 1, IsConfirmed = 0, ConfirmationToken = @Token, CreatedOn = GETDATE()
          WHERE Email = @Email
        `);

      await sendConfirmationEmail(email, token);
      return res.json({ success: true, message: 'Welcome back! Please check your email to confirm your subscription.' });
    }

    // New subscriber
    await pool.request()
      .input('Email', sql.NVarChar(255), email)
      .input('Token', sql.NVarChar(100), token)
      .query(`
        INSERT INTO NewsletterSubscribers (Email, IsActive, IsConfirmed, ConfirmationToken, CreatedOn)
        VALUES (@Email, 1, 0, @Token, GETDATE())
      `);

    await sendConfirmationEmail(email, token);
    res.json({ success: true, message: 'Subscription started! Please check your inbox to confirm your subscription.' });

  } catch (err) {
    console.error('❌ POST /newsletter/subscribe error:', err);
    res.status(500).json({ success: false, message: 'Server error occurred.' });
  }
});

// -------------------------------
// Confirmation route
// GET /newsletter/confirm/:token
// -------------------------------
router.get('/newsletter/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('Token', sql.NVarChar(100), token)
      .query(`SELECT * FROM NewsletterSubscribers WHERE ConfirmationToken = @Token`);

    if (!result.recordset.length)
      return res.status(400).send(`
        <div style="font-family:Arial,sans-serif;text-align:center;padding:50px;">
          <h2 style="color:#ff4d6d;">Invalid or Expired Link ❌</h2>
          <p style="color:#555;">Please make sure you clicked the correct confirmation link or request a new subscription.</p>
        </div>
      `);

    const subscriber = result.recordset[0];

    await pool.request()
      .input('Email', sql.NVarChar(255), subscriber.Email)
      .query(`
        UPDATE NewsletterSubscribers
        SET IsConfirmed = 1, ConfirmedOn = GETDATE(), ConfirmationToken = NULL
        WHERE Email = @Email
      `);

    // Serve a nice card-based confirmation page
    res.send(`
      <div style="background:#f4f6f9; min-height:100vh; display:flex; justify-content:center; align-items:center; padding:40px;">
        <div style="background:#ffffff; max-width:500px; width:100%; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.1); text-align:center; overflow:hidden; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <!-- Logo Header -->
          <div style="background:linear-gradient(135deg,#004aad,#007bff); padding:30px;">
            <img src="http://mcfwll.runasp.net/images/Toblogo.jpg" alt="TOB News" style="max-width:120px; margin-bottom:15px;">
            <h1 style="color:#fff; font-size:24px; margin:0;">TOB News</h1>
          </div>

          <!-- Confirmation Card -->
          <div style="padding:40px 25px;">
            <h2 style="color:#004aad; font-size:22px; margin-bottom:20px;">Subscription Confirmed 🎉</h2>
            <p style="color:#555; font-size:15px; line-height:1.6;">
              Thank you, <strong>${subscriber.Email}</strong>!<br>
              You have successfully subscribed to <strong>TOB News</strong>.<br>
              Get ready to receive the latest news, updates, and insights directly in your inbox.
            </p>

            <a href="https://tobnews.com" 
               style="display:inline-block; margin-top:30px; background:linear-gradient(135deg,#007bff,#004aad); color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
               Visit TOB News
            </a>
          </div>

          <!-- Footer -->
          <div style="background:#f0f3f8; padding:20px; font-size:13px; color:#666;">
            <p style="margin:3px 0; font-weight:600;">TOB News</p>
            <p style="margin:2px 0;">📍 Manama, Bahrain</p>
            <p style="margin:2px 0;">📞 +973 1234 5678 | ☎️ +973 9876 5432</p>
            <p style="margin:2px 0;">✉️ info@tobnews.com | 🌐 <a href="https://tobnews.com" style="color:#004aad; text-decoration:none;">tobnews.com</a></p>
          </div>
        </div>
      </div>
    `);

  } catch (err) {
    console.error('❌ GET /newsletter/confirm/:token error:', err);
    res.status(500).send(`
      <div style="font-family:Arial,sans-serif;text-align:center;padding:50px;">
        <h3 style="color:#ff4d6d;">Server Error ❌</h3>
        <p style="color:#555;">An error occurred while confirming your subscription. Please try again later.</p>
      </div>
    `);
  }
});


async function sendConfirmationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sethuraman0104@gmail.com',
      pass: 'lujjbfhwjahqdarm'
    }
  });

  const confirmLink = `http://localhost:3000/api/newsletter/confirm/${token}`;
  const mailOptions = {
    from: '"TOB News" <sethuraman0104@gmail.com>',
    to: email,
    subject: '📰 Confirm Your Subscription to TOB News',
    html: `
  <div style="background:#eef2f7; padding:40px 0; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width:620px; margin:auto; background:#fff; border-radius:14px; box-shadow:0 8px 25px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header with Gradient -->
      <div style="background:linear-gradient(135deg,#004aad,#007bff); padding:35px 25px; text-align:center; position:relative;">
        <img src="http://mcfwll.runasp.net/images/Toblogo.jpg" alt="TOB News" style="max-width:120px; margin-bottom:10px;">
        <h1 style="color:#fff; margin:8px 0 4px; font-size:26px; letter-spacing:1px;">TOB News</h1>
        <p style="color:#dbe4ff; margin:0; font-size:14px;">Your Trusted Source for Business & Tech Updates</p>
        <div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); width:80%; height:2px; background:#fff; opacity:0.3; border-radius:2px;"></div>
      </div>

      <!-- Main Section -->
      <div style="padding:35px 30px; color:#333;">
        <h2 style="font-size:22px; color:#004aad; margin-bottom:12px;">Almost there! Confirm your subscription 👇</h2>
        <p style="font-size:15px; color:#555; line-height:1.7;">
          Hi there,<br><br>
          Thanks for joining <strong>TOB News</strong>! You’re just one click away from receiving the latest stories, insights, and special features directly in your inbox.
        </p>

        <!-- Confirmation Button -->
        <div style="text-align:center; margin:40px 0;">
          <a href="${confirmLink}"
             style="background:linear-gradient(135deg,#007bff,#004aad); color:#fff; padding:16px 36px; text-decoration:none; border-radius:8px; font-weight:600; letter-spacing:0.5px; display:inline-block; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:all 0.2s;">
            ✅ Confirm My Subscription
          </a>
        </div>

        <p style="font-size:14px; color:#777; text-align:center; margin-top:10px;">
          Didn’t subscribe? You can safely ignore this email.
        </p>
      </div>

      <!-- Divider -->
      <div style="height:1px; background:#eee; margin:0 30px;"></div>

      <!-- Footer -->
      <div style="background:#fafbfc; padding:25px 20px; text-align:center; font-size:13px; color:#666;">
        <p style="margin:6px 0; font-weight:600;">TOB News Media</p>
        <p style="margin:2px 0;">📍 Manama, Bahrain</p>
        <p style="margin:2px 0;">📞 +973 1234 5678 &nbsp; | &nbsp; ☎️ +973 9876 5432</p>
        <p style="margin:2px 0;">✉️ <a href="mailto:info@tobnews.com" style="color:#004aad; text-decoration:none;">info@tobnews.com</a></p>
        <p style="margin:4px 0;">🌐 <a href="https://tobnews.com" style="color:#004aad; text-decoration:none;">www.tobnews.com</a></p>

        <!-- Social Icons -->
        <div style="margin-top:15px;">
          <a href="https://facebook.com/tobnews" style="margin:0 6px; text-decoration:none;">🌐</a>
          <a href="https://twitter.com/tobnews" style="margin:0 6px; text-decoration:none;">🐦</a>
          <a href="https://linkedin.com/company/tobnews" style="margin:0 6px; text-decoration:none;">💼</a>
          <a href="https://youtube.com/tobnews" style="margin:0 6px; text-decoration:none;">▶️</a>
        </div>

        <hr style="border:none; border-top:1px solid #ddd; margin:18px 0;">
        <p style="font-size:12px; color:#999; line-height:1.6;">
          This is an automated message. Please do not reply to this email.<br>
          © ${new Date().getFullYear()} TOB News. All rights reserved.
        </p>
      </div>
    </div>
  </div>
  `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent info:', info);
  } catch (err) {
    console.error('❌ Failed to send confirmation email:', err);
  }
}

// ----------------------------------------------
// PUT newsletter unsubscribe
// ----------------------------------------------
router.put('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('Email', sql.NVarChar(150), email)
      .query(`
        UPDATE NewsletterSubscribers
        SET IsActive = 0, UnsubscribedOn = GETDATE()
        WHERE Email = @Email AND IsActive = 1
      `);

    if (result.rowsAffected[0] === 0)
      return res.json({ success: false, message: 'Email not found or already unsubscribed.' });

    res.json({ success: true, message: 'You have been unsubscribed successfully.' });
  } catch (err) {
    console.error('❌ PUT /newsletter/unsubscribe error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ----------------------------------------------
// PUT newsletter unsubscribe (Admin)
// ----------------------------------------------
router.put('/newsletter/admin/unsubscribe', async (req, res) => {
  try {
    const { subscriberId } = req.body;

    if (!subscriberId)
      return res.status(400).json({ success: false, message: "Subscriber ID is required." });

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input("SubscriberID", sql.Int, subscriberId)
      .query(`
        UPDATE NewsletterSubscribers
        SET IsActive = 0, UnsubscribedOn = GETDATE()
        WHERE SubscriberID = @SubscriberID AND IsActive = 1
      `);

    if (result.rowsAffected[0] === 0)
      return res.json({ success: false, message: "Already unsubscribed or not found." });

    res.json({ success: true, message: "Subscriber unsubscribed successfully." });

  } catch (err) {
    console.error("❌ PUT /newsletter/admin/unsubscribe:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.put('/newsletter/admin/reactivate', async (req, res) => {
  try {
    const { subscriberId } = req.body;

    if (!subscriberId)
      return res.status(400).json({ success: false, message: "Subscriber ID is required." });

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input("SubscriberID", sql.Int, subscriberId)
      .query(`
        UPDATE NewsletterSubscribers
        SET IsActive = 1, UnsubscribedOn = NULL
        WHERE SubscriberID = @SubscriberID
      `);

    res.json({ success: true, message: "Subscriber reactivated successfully." });

  } catch (err) {
    console.error("❌ PUT /newsletter/admin/reactivate:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});


// GET newsletter subscribers list (Admin)
router.get('/newsletter/list', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request().query(`
      SELECT 
        SubscriberID, 
        Email, 
        CreatedOn AS SubscribedOn, 
        ConfirmedOn, 
        UnsubscribedOn, 
        IsActive, 
        IsConfirmed
      FROM NewsletterSubscribers
      ORDER BY CreatedOn DESC
    `);

    res.json({ success: true, data: result.recordset });

  } catch (err) {
    console.error("❌ GET /newsletter/list error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// GET advertisements
router.get('/advertisements/list', async (req, res) => {
  try {
    const isActive = req.query.active === "1" ? 1 : 0;

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input("IsActive", sql.Bit, isActive)
      .query(`
        SELECT
          AdvertisementID,
          Title,
          ImageURL,
          LinkURL,
          Position,
          Size,
          IsActive,
          StartDate,
          EndDate,
          CreatedOn
        FROM Advertisements
        WHERE IsActive = @IsActive
          AND (StartDate IS NULL OR StartDate <= GETDATE())
          AND (EndDate IS NULL OR EndDate >= GETDATE())
        ORDER BY CreatedOn DESC
      `);

    return res.json({
      success: true,
      data: result.recordset
    });

  } catch (err) {
    console.error("❌ /advertisements ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
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

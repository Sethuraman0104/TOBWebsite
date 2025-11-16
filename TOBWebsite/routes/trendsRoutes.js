const express = require("express");
const router = express.Router();
const sql = require("mssql");
const sqlConfig = require("../sqlconfig");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Image upload config
const upload = multer({ dest: "public/uploads/trends/" });

// ===================================================================
// GET ALL TRENDS (with filters)
// ===================================================================
router.get("/", async (req, res) => {
  try {
    const { month, year, status } = req.query;

    const pool = await sql.connect(sqlConfig);
    const request = pool.request();

    let query = "SELECT * FROM TrendingCards WHERE 1=1";

    if (status && status !== "all") {
      request.input("IsActive", sql.Bit, status === "active" ? 1 : 0);
      query += " AND IsActive = @IsActive";
    }

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

      request.input("MonthStart", sql.DateTime, monthStart);
      request.input("MonthEnd", sql.DateTime, monthEnd);

      query += " AND FromDate <= @MonthEnd AND (ToDate IS NULL OR ToDate >= @MonthStart)";
    }

    query += " ORDER BY CreatedOn DESC";

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching trends" });
  }
});

// ===================================================================
// GET OTHER TRENDS (exclude current)
// ===================================================================
// router.get("/other/:id", async (req, res) => {
//   try {
//     const TrendID = parseInt(req.params.id, 10);
//     if (!TrendID || isNaN(TrendID)) {
//       return res.status(400).json({ success: false, message: "Invalid TrendID" });
//     }

//     const pool = await sql.connect(sqlConfig);

//     const result = await pool.request()
//       .input("TrendID", sql.Int, TrendID)
//       .query(`
//         SELECT * 
//         FROM TrendingCards
//         WHERE TrendID <> @TrendID
//           AND IsActive = 1
//         ORDER BY CreatedOn DESC
//       `);

//     res.json({ success: true, data: result.recordset });

//   } catch (err) {
//     console.error("GET /trends/other/:id error:", err);
//     res.status(500).json({ success: false, message: "Error loading other trends" });
//   }
// });

// ===================================================================
// GET OTHER TRENDS (exclude current) with likes & approved comments
// ===================================================================
router.get("/other/:id", async (req, res) => {
  try {
    const TrendID = parseInt(req.params.id, 10);
    if (!TrendID || isNaN(TrendID)) {
      return res.status(400).json({ success: false, message: "Invalid TrendID" });
    }

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input("TrendID", sql.Int, TrendID)
      .query(`
        SELECT 
          t.*,
          -- Total likes for this trend
          (SELECT COUNT(*) 
           FROM TrendLikes l
           WHERE l.TrendID = t.TrendID) AS LikeCount,
          
          -- Total approved comments for this trend
          (SELECT COUNT(*) 
           FROM TrendComments c
           WHERE c.TrendID = t.TrendID AND c.IsApproved = 1 AND c.IsActive = 1) AS CommentCount
        FROM TrendingCards t
        WHERE t.TrendID <> @TrendID
          AND t.IsActive = 1
        ORDER BY t.CreatedOn DESC
      `);

    res.json({ success: true, data: result.recordset });

  } catch (err) {
    console.error("GET /trends/other/:id error:", err);
    res.status(500).json({ success: false, message: "Error loading other trends" });
  }
});

// ===================================================================
// DELETE TREND
// ===================================================================
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(sqlConfig);

    const imageRes = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT ImageURL FROM TrendingCards WHERE TrendID = @id");

    if (imageRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: "Trend not found" });

    const imageURL = imageRes.recordset[0].ImageURL;

    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM TrendingCards WHERE TrendID = @id");

    if (imageURL) {
      const filePath = path.join(__dirname, "../uploads/trends", path.basename(imageURL));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "Trend deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting trend" });
  }
});

// ===================================================================
// CREATE TREND
// ===================================================================
router.post("/create", upload.single("Image"), async (req, res) => {
  try {
    const { TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, FromDate, ToDate } =
      req.body;

    const IsActive = req.body.IsActive === "on" ? 1 : 0;
    const ImageURL = req.file ? `/uploads/trends/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);

    await pool
      .request()
      .input("TrendTitle_EN", sql.NVarChar, TrendTitle_EN)
      .input("TrendTitle_AR", sql.NVarChar, TrendTitle_AR)
      .input("TrendDescription_EN", sql.NVarChar, TrendDescription_EN)
      .input("TrendDescription_AR", sql.NVarChar, TrendDescription_AR)
      .input("ImageURL", sql.NVarChar, ImageURL)
      .input("FromDate", sql.DateTime, FromDate)
      .input("ToDate", sql.DateTime, ToDate || null)
      .input("IsActive", sql.Bit, IsActive)
      .query(`
        INSERT INTO TrendingCards 
        (TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, ImageURL, FromDate, ToDate, IsActive)
        VALUES 
        (@TrendTitle_EN, @TrendTitle_AR, @TrendDescription_EN, @TrendDescription_AR, @ImageURL, @FromDate, @ToDate, @IsActive)
      `);

    res.json({ success: true, message: "Trend created successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================================================================
// UPDATE TREND
// ===================================================================
router.post("/update", upload.single("Image"), async (req, res) => {
  try {
    const { TrendID, TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, FromDate, ToDate } =
      req.body;

    const IsActive = req.body.IsActive === "on" ? 1 : 0;
    const ImageURL = req.file ? `/uploads/trends/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);

    await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .input("TrendTitle_EN", sql.NVarChar, TrendTitle_EN)
      .input("TrendTitle_AR", sql.NVarChar, TrendTitle_AR)
      .input("TrendDescription_EN", sql.NVarChar, TrendDescription_EN)
      .input("TrendDescription_AR", sql.NVarChar, TrendDescription_AR)
      .input("ImageURL", sql.NVarChar, ImageURL)
      .input("FromDate", sql.DateTime, FromDate)
      .input("ToDate", sql.DateTime, ToDate || null)
      .input("IsActive", sql.Bit, IsActive)
      .query(`
        UPDATE TrendingCards SET
          TrendTitle_EN=@TrendTitle_EN,
          TrendTitle_AR=@TrendTitle_AR,
          TrendDescription_EN=@TrendDescription_EN,
          TrendDescription_AR=@TrendDescription_AR,
          ImageURL = ISNULL(@ImageURL, ImageURL),
          FromDate=@FromDate, 
          ToDate=@ToDate, 
          IsActive=@IsActive, 
          UpdatedOn=GETDATE()
        WHERE TrendID=@TrendID
      `);

    res.json({ success: true, message: "Trend updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================================================================
// ACTIVATE / DEACTIVATE
// ===================================================================
router.post("/activate/:id", (req, res) => toggleTrend(req, res, 1));
router.post("/deactivate/:id", (req, res) => toggleTrend(req, res, 0));

async function toggleTrend(req, res, status) {
  try {
    const pool = await sql.connect(sqlConfig);
    await pool
      .request()
      .input("TrendID", sql.Int, req.params.id)
      .input("IsActive", sql.Bit, status)
      .query("UPDATE TrendingCards SET IsActive=@IsActive, UpdatedOn=GETDATE() WHERE TrendID=@TrendID");

    res.json({ success: true, message: status ? "Trend activated." : "Trend deactivated." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

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

// ===================================================================
// LIKE A TREND
// ===================================================================
router.post("/:id/likes", async (req, res) => {
  const TrendID = parseInt(req.params.id, 10);
  const { userIdentifier } = req.body;

  if (!TrendID || isNaN(TrendID)) {
    return res.status(400).json({ success: false, message: "Invalid TrendID" });
  }
  if (!userIdentifier || typeof userIdentifier !== "string") {
    return res.status(400).json({ success: false, message: "Missing or invalid userIdentifier" });
  }

  try {
    const pool = await sql.connect(sqlConfig);

    // Check trend existence
    const trendExists = await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .query("SELECT 1 FROM TrendingCards WHERE TrendID=@TrendID");

    if (!trendExists.recordset.length) {
      return res.status(404).json({ success: false, message: "Trend not found" });
    }

    // Check for duplicate like
    const alreadyLiked = await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .input("UserIdentifier", sql.NVarChar(255), userIdentifier)
      .query("SELECT 1 FROM TrendLikes WHERE TrendID=@TrendID AND UserIdentifier=@UserIdentifier");

    if (alreadyLiked.recordset.length) {
      return res.json({ success: false, message: "You already liked this trend" });
    }

    // Insert like
    await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .input("UserIdentifier", sql.NVarChar(255), userIdentifier)
      .query("INSERT INTO TrendLikes (TrendID, UserIdentifier, LikedOn) VALUES (@TrendID, @UserIdentifier, GETDATE())");

    // Return updated like count
    const likeCountResult = await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .query("SELECT COUNT(*) AS LikeCount FROM TrendLikes WHERE TrendID=@TrendID");

    res.json({ success: true, message: "Trend liked successfully", likeCount: likeCountResult.recordset[0].LikeCount });
  } catch (err) {
    console.error("POST /trends/:id/likes error:", err);
    res.status(500).json({ success: false, message: "Server error while liking trend", error: err.message });
  }
});

// ===================================================================
// GET TREND LIKE COUNT
// ===================================================================
router.get("/:id/likes", async (req, res) => {
  try {
    const TrendID = parseInt(req.params.id, 10);
    if (!TrendID || isNaN(TrendID)) {
      return res.status(400).json({ success: false, message: "Invalid TrendID" });
    }

    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .query("SELECT COUNT(*) AS LikeCount FROM TrendLikes WHERE TrendID=@TrendID");

    res.json({ likeCount: result.recordset[0].LikeCount });
  } catch (err) {
    console.error("GET /trends/:id/likes error:", err);
    res.status(500).json({ success: false, message: "Error loading likes" });
  }
});

// ===================================================================
// COMMENTS (Hierarchical)
// ===================================================================
router.get("/:id/comments", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool
      .request()
      .input("TrendID", sql.Int, req.params.id)
      .query(`
        SELECT CommentID, TrendID, ParentCommentID, Name, Email, Content, IsApproved, CreatedOn,IsActive
        FROM TrendComments
        WHERE TrendID = @TrendID
        ORDER BY CreatedOn ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Error loading comments" });
  }
});

router.post("/comments", async (req, res) => {
  try {
    const { TrendID, Name, Email, Content, ParentCommentID } = req.body;

    const pool = await sql.connect(sqlConfig);

    await pool
      .request()
      .input("TrendID", sql.Int, TrendID)
      .input("ParentCommentID", sql.Int, ParentCommentID)
      .input("Name", sql.NVarChar, Name)
      .input("Email", sql.NVarChar, Email)
      .input("Content", sql.NVarChar, Content)
      .query(`
        INSERT INTO TrendComments 
        (TrendID, ParentCommentID, Name, Email, Content, IsApproved, CreatedOn,IsActive = 1)
        VALUES (@TrendID, @ParentCommentID, @Name, @Email, @Content, 0, GETDATE(),1)
      `);

    res.json({ success: true, message: "Comment submitted for approval." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting comment" });
  }
});

module.exports = router;

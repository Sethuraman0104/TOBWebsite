const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Image upload config
const upload = multer({ dest: 'public/uploads/trends/' });

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input('TrendID', sql.Int, req.params.id)
      .query('SELECT * FROM TrendingCards WHERE TrendID = @TrendID');
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all trends with optional filters (including month/year range)
router.get('/', async (req, res) => {
  try {
    const { month, year, status } = req.query;

    const pool = await sql.connect(sqlConfig);
    const request = pool.request();

    let query = 'SELECT * FROM TrendingCards WHERE 1=1';

    // Filter by status
    if (status && status !== 'all') {
      request.input('IsActive', sql.Bit, status === 'active' ? 1 : 0);
      query += ' AND IsActive = @IsActive';
    }

    // Filter by month/year with date range overlap
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      // Compute start and end of selected month
      const monthStart = new Date(y, m - 1, 1);               // e.g., 2025-11-01
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);   // e.g., 2025-11-30 23:59:59

      request.input('MonthStart', sql.DateTime, monthStart);
      request.input('MonthEnd', sql.DateTime, monthEnd);

      // Include trends where the range overlaps the selected month
      query += ' AND FromDate <= @MonthEnd AND (ToDate IS NULL OR ToDate >= @MonthStart)';
    }

    query += ' ORDER BY CreatedOn DESC';

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching trends' });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(sqlConfig);

    // Get image URL before deletion
    const getQuery = `SELECT ImageURL FROM TrendingCards WHERE TrendID = @id`;
    const getResult = await pool.request().input('id', sql.Int, id).query(getQuery);

    if (getResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Trend not found' });
    }

    const imageURL = getResult.recordset[0].ImageURL;

    // Delete the record
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM TrendingCards WHERE TrendID = @id`);

    // Delete image from uploads/trends folder
    if (imageURL) {
      const filePath = path.join(__dirname, '../uploads/trends', path.basename(imageURL));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Trend deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting trend' });
  }
});

// Create
router.post('/create', upload.single('Image'), async (req, res) => {
  try {
    const { TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, FromDate, ToDate } = req.body;
    const IsActive = req.body.IsActive === 'on' ? 1 : 0;
    const ImageURL = req.file ? `/uploads/trends/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    await pool.request()
      .input('TrendTitle_EN', sql.NVarChar, TrendTitle_EN)
      .input('TrendTitle_AR', sql.NVarChar, TrendTitle_AR)
      .input('TrendDescription_EN', sql.NVarChar, TrendDescription_EN)
      .input('TrendDescription_AR', sql.NVarChar, TrendDescription_AR)
      .input('ImageURL', sql.NVarChar, ImageURL)
      .input('FromDate', sql.DateTime, FromDate)
      .input('ToDate', sql.DateTime, ToDate || null)
      .input('IsActive', sql.Bit, IsActive)
      .query(`
        INSERT INTO TrendingCards (TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, ImageURL, FromDate, ToDate, IsActive)
        VALUES (@TrendTitle_EN, @TrendTitle_AR, @TrendDescription_EN, @TrendDescription_AR, @ImageURL, @FromDate, @ToDate, @IsActive)
      `);

    res.json({ success: true, message: 'Trend created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update
router.post('/update', upload.single('Image'), async (req, res) => {
  try {
    const { TrendID, TrendTitle_EN, TrendTitle_AR, TrendDescription_EN, TrendDescription_AR, FromDate, ToDate } = req.body;
    const IsActive = req.body.IsActive === 'on' ? 1 : 0;
    const ImageURL = req.file ? `/uploads/trends/${req.file.filename}` : null;

    const pool = await sql.connect(sqlConfig);
    await pool.request()
      .input('TrendID', sql.Int, TrendID)
      .input('TrendTitle_EN', sql.NVarChar, TrendTitle_EN)
      .input('TrendTitle_AR', sql.NVarChar, TrendTitle_AR)
      .input('TrendDescription_EN', sql.NVarChar, TrendDescription_EN)
      .input('TrendDescription_AR', sql.NVarChar, TrendDescription_AR)
      .input('ImageURL', sql.NVarChar, ImageURL)
      .input('FromDate', sql.DateTime, FromDate)
      .input('ToDate', sql.DateTime, ToDate || null)
      .input('IsActive', sql.Bit, IsActive)
      .query(`
        UPDATE TrendingCards
        SET TrendTitle_EN=@TrendTitle_EN, TrendTitle_AR=@TrendTitle_AR,
            TrendDescription_EN=@TrendDescription_EN, TrendDescription_AR=@TrendDescription_AR,
            ImageURL = ISNULL(@ImageURL, ImageURL),
            FromDate=@FromDate, ToDate=@ToDate, IsActive=@IsActive, UpdatedOn=GETDATE()
        WHERE TrendID=@TrendID
      `);

    res.json({ success: true, message: 'Trend updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Activate / Deactivate
router.post('/activate/:id', async (req, res) => {
  await toggleTrend(req, res, 1);
});
router.post('/deactivate/:id', async (req, res) => {
  await toggleTrend(req, res, 0);
});

async function toggleTrend(req, res, status) {
  try {
    const pool = await sql.connect(sqlConfig);
    await pool.request()
      .input('TrendID', sql.Int, req.params.id)
      .input('IsActive', sql.Bit, status)
      .query('UPDATE TrendingCards SET IsActive=@IsActive, UpdatedOn=GETDATE() WHERE TrendID=@TrendID');
    res.json({ success: true, message: status ? 'Trend activated.' : 'Trend deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = router;

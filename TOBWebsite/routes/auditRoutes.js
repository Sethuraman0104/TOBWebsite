const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');

// GET all audit actions
router.get('/actions', async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    console.log('sql-connection-succes');
    const result = await new sql.Request()
      .query('SELECT ActionID, ActionName FROM audit_actions ORDER BY ActionName');
    res.json({ success: true, actions: result.recordset });
  } catch (err) {
    console.error('FETCH AUDIT ACTIONS ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET audit logs with filters & pagination
router.get('/', async (req, res) => {
  const search = req.query.search || '';
  const module = req.query.module || '';
  const actionIdRaw = req.query.actionId;
  const actionId = Number(actionIdRaw);
  const isValidActionId = !isNaN(actionId) && Number.isInteger(actionId);

  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;

  try {
    await sql.connect(sqlConfig);

    // Count total logs
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM audit_logs l
      INNER JOIN users u ON l.UserID = u.UserID
      INNER JOIN audit_actions a ON l.ActionID = a.ActionID
      WHERE 1=1
      ${search ? "AND (l.Description LIKE @searchPattern OR u.FullName LIKE @searchPattern OR l.ModuleName LIKE @searchPattern)" : ""}
      ${module ? "AND l.ModuleName = @module" : ""}
      ${isValidActionId ? "AND l.ActionID = @actionId" : ""}
    `;

    const countRequest = new sql.Request();
    if (search) countRequest.input('searchPattern', sql.NVarChar, `%${search}%`);
    if (module) countRequest.input('module', sql.NVarChar, module);
    if (isValidActionId) countRequest.input('actionId', sql.Int, actionId);

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Fetch paginated logs
    let dataQuery = `
      SELECT l.LogID, u.FullName AS UserName, a.ActionName, l.ModuleName, l.Description,
             l.IPAddress, l.UserAgent, l.CreatedAt
      FROM audit_logs l
      INNER JOIN users u ON l.UserID = u.UserID
      INNER JOIN audit_actions a ON l.ActionID = a.ActionID
      WHERE 1=1
      ${search ? "AND (l.Description LIKE @searchPattern OR u.FullName LIKE @searchPattern OR l.ModuleName LIKE @searchPattern)" : ""}
      ${module ? "AND l.ModuleName = @module" : ""}
      ${isValidActionId ? "AND l.ActionID = @actionId" : ""}
      ORDER BY l.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `;

    const dataRequest = new sql.Request();
    if (search) dataRequest.input('searchPattern', sql.NVarChar, `%${search}%`);
    if (module) dataRequest.input('module', sql.NVarChar, module);
    if (isValidActionId) dataRequest.input('actionId', sql.Int, actionId);
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('pageSize', sql.Int, pageSize);

    const logsResult = await dataRequest.query(dataQuery);

    res.json({
      success: true,
      total,
      page,
      pageSize,
      logs: logsResult.recordset
    });

  } catch (err) {
    console.error('FETCH AUDIT LOGS ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

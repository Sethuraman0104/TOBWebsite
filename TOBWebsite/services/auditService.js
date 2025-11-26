const sql = require("mssql");
const sqlConfig = require("../sqlconfig");

// Saves audit entry into audit_logs using ActionID + your existing schema
async function saveAudit({ userId, actionName, moduleName, description, req }) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] || "Unknown";

    const pool = await sql.connect(sqlConfig);

    // 1. Get ActionID (or create if missing)
    let actionResult = await pool.request()
      .input("ActionName", sql.NVarChar(100), actionName)
      .query(`
        SELECT ActionID FROM audit_actions WHERE ActionName = @ActionName
      `);

    let actionId;

    // If action not found → insert it automatically
    if (actionResult.recordset.length === 0) {
      const insertAction = await pool.request()
        .input("ActionName", sql.NVarChar(100), actionName)
        .query(`
          INSERT INTO audit_actions (ActionName)
          OUTPUT inserted.ActionID
          VALUES (@ActionName)
        `);

      actionId = insertAction.recordset[0].ActionID;
    } else {
      actionId = actionResult.recordset[0].ActionID;
    }

    // 2. Insert into audit_logs
    await pool.request()
      .input("UserID", sql.Int, userId)
      .input("ActionID", sql.Int, actionId)
      .input("ModuleName", sql.NVarChar(100), moduleName)
      .input("Description", sql.NVarChar(sql.MAX), description)
      .input("IPAddress", sql.VarChar(50), ip)
      .input("UserAgent", sql.NVarChar(400), userAgent)
      .query(`
        INSERT INTO audit_logs
        (UserID, ActionID, ModuleName, Description, IPAddress, UserAgent)
        VALUES (@UserID, @ActionID, @ModuleName, @Description, @IPAddress, @UserAgent)
      `);

  } catch (err) {
    console.error("AUDIT LOG ERROR:", err);
  }
}

module.exports = { saveAudit };

const sql = require("mssql");
const sqlConfig = require("../sqlconfig");

// Save audit log using single-table audit_logs
async function saveAudit({ userId, userName, actionName, moduleName, description, req }) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] || "Unknown";

    const pool = await sql.connect(sqlConfig);

    await pool.request()
      .input("UserID", sql.Int, userId)
      .input("UserName", sql.NVarChar(150), userName || null)
      .input("ActionName", sql.NVarChar(150), actionName)
      .input("ModuleName", sql.NVarChar(100), moduleName || null)
      .input("Description", sql.NVarChar(sql.MAX), description || null)
      .input("IPAddress", sql.VarChar(50), ip)
      .input("UserAgent", sql.NVarChar(400), userAgent)
      .query(`
        INSERT INTO audit_logs
        (UserID, UserName, ActionName, ModuleName, Description, IPAddress, UserAgent)
        VALUES (@UserID, @UserName, @ActionName, @ModuleName, @Description, @IPAddress, @UserAgent)
      `);

  } catch (err) {
    console.error("❌ AUDIT LOG INSERT ERROR:", err);
  }
}

module.exports = { saveAudit };

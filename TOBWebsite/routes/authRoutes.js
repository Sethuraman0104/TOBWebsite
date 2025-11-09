const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const bcrypt = require('bcrypt');

// -------------------------
// Login API
// -------------------------
router.post('/login', async (req, res) => {
  const { Email, Password } = req.body;  // match frontend form
  if (!Email || !Password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    await sql.connect(sqlConfig);

    const result = await new sql.Request()
      .input('Email', sql.NVarChar, Email)
      .query('SELECT * FROM Users WHERE Email=@Email AND IsActive=1');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(Password, user.PasswordHash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

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
// Logout API
// -------------------------
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;

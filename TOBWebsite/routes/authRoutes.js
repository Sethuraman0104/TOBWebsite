const express = require('express');
const router = express.Router();
const sql = require('mssql');
const sqlConfig = require('../sqlconfig');
const bcrypt = require('bcrypt');

// -------------------------
// Login API
// -------------------------
router.post('/login', async (req, res) => {
  const { Email, Password } = req.body;
  if (!Email || !Password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    await sql.connect(sqlConfig);

    const result = await new sql.Request()
      .input('Email', sql.NVarChar, Email)
      .query('SELECT * FROM Users WHERE Email=@Email AND IsActive=1');

    const user = result.recordset[0];
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(Password, user.PasswordHash);
    if (!isValid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // ✅ Update LastLogin timestamp
    await new sql.Request()
      .input('UserID', sql.Int, user.UserID)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID');

    // ✅ Fetch updated LastLogin value
    const updatedUser = await new sql.Request()
      .input('UserID', sql.Int, user.UserID)
      .query('SELECT TOP 1 LastLogin FROM Users WHERE UserID=@UserID');

    const lastLogin = updatedUser.recordset[0]?.LastLogin || null;

    // ✅ Save user info in session
    req.session.user = {
      UserID: user.UserID,
      FullName: user.FullName,
      Email: user.Email,
      Role: user.Role,
      LastLogin: lastLogin
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: req.session.user
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -------------------------
// Current User API
// -------------------------
router.get('/currentUser', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: 'Not logged in' });
  res.json(req.session.user);
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

// -------------------------
// Get current profile
// -------------------------
router.get('/profile', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    await sql.connect(sqlConfig);
    const result = await new sql.Request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .query('SELECT UserID, FullName, Email, Role, LastLogin FROM Users WHERE UserID=@UserID');

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('PROFILE FETCH ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/updateProfile', async (req, res) => {
  const { FullName, Email } = req.body;
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (!FullName || !Email)
    return res.status(400).json({ success: false, message: 'Full name and email are required' });

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(Email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    await sql.connect(sqlConfig);
    await new sql.Request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .input('FullName', sql.NVarChar, FullName)
      .input('Email', sql.NVarChar, Email)
      .query('UPDATE Users SET FullName=@FullName, Email=@Email WHERE UserID=@UserID');

    // Update session info
    req.session.user.FullName = FullName;
    req.session.user.Email = Email;

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('PROFILE UPDATE ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// -------------------------
// Change password
// -------------------------
router.post('/changePassword', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    await sql.connect(sqlConfig);

    const result = await new sql.Request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .query('SELECT PasswordHash FROM Users WHERE UserID=@UserID');

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Old password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await new sql.Request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .input('PasswordHash', sql.NVarChar, hashed)
      .query('UPDATE Users SET PasswordHash=@PasswordHash WHERE UserID=@UserID');

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('CHANGE PASSWORD ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;

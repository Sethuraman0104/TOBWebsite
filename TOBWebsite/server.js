const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 }, // 2 hours
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', mainRoutes);

// -------------------------
// Serve static files AFTER routes to avoid interference
// -------------------------
// app.use('/public', express.static(path.join(__dirname, 'public')));

// Default route -> login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve static files after routes
app.use(express.static(path.join(__dirname, 'public')));

// Protect admin page
app.get('/admin.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Protect profile page
app.get('/profile.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Catch-all
app.use((req, res) => {
  res.status(404).send('Route not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

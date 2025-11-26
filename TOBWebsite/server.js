const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');
const trendsRoutes = require('./routes/trendsRoutes');
const listEndpoints = require('express-list-endpoints');

dotenv.config();
const app = express();

// -------------------------
// Middleware
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 }, // 2 hours
}));

// -------------------------
// API Routes
// -------------------------
app.use('/api/auth', authRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api', mainRoutes);

// -------------------------
// Debug all endpoints
// -------------------------
console.log(listEndpoints(app));

// -------------------------
// Public Homepage -> TOBHome.html
// -------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TOBHome.html'));
});

// -------------------------
// Serve static files
// -------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// -------------------------
// Other public pages
// -------------------------
app.get('/TOBHome.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TOBHome.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// -------------------------
// Protected pages
// -------------------------
app.get('/admin.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// -------------------------
// Catch-all 404
// -------------------------
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// -------------------------
// Request Logger
// -------------------------
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mainRoutes = require('./routes/mainRoutes');

dotenv.config();
const app = express();

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// API routes first
// -------------------------
app.use('/api', mainRoutes);

// -------------------------
// Serve static files after API routes
// -------------------------
app.use(express.static(path.join(__dirname, 'public')));

// Default route (admin panel)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all for undefined routes (optional)
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

const express = require('express');
const path = require('path');
const sql = require('mssql');
const dotenv = require('dotenv');
const sqlConfig = require('./sqlconfig');
const mainRoutes = require('./routes/mainRoutes');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', mainRoutes);

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

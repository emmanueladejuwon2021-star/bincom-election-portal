const express = require('express');
const path = require('path');
const fs = require('fs');
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure database file exists before serving requests
const dbPath = path.join(__dirname, 'database.sqlite');
if (!fs.existsSync(dbPath)) {
  console.log('Database not found. Bootstrapping initial database...');
  require('./scripts/init-db');
}

// Routes
app.use('/api', apiRoutes);
app.use('/', indexRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    currentPage: '',
    error: `The requested URL "${req.originalUrl}" was not found on this server.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).render('error', {
    title: '500 - Server Error',
    currentPage: '',
    error: err.message || 'An internal server error occurred.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`Delta State Election Portal is running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`- Polling Units: http://localhost:${PORT}/polling-unit`);
  console.log(`- LGA Collation: http://localhost:${PORT}/lga-total`);
  console.log(`- Submit Results: http://localhost:${PORT}/new-polling-unit`);
  console.log('====================================================');
});

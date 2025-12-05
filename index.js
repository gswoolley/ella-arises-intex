// Ella Rises - Main Application Entry Point
// Configures Express server, middleware, routes, and starts HTTP server

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const session = require('express-session');

const knex = require('./util/db');
const runNormalization = require('./etl/normalize');
const mapCsvRowsToStaging = require('./etl/mapCsvToStaging');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Server port - defaults to 8080 for local development
// In production (Elastic Beanstalk), this is set via environment variable
const PORT = process.env.PORT || 8080;

// Environment detection (development or production)
const ENV = process.env.NODE_ENV || 'development';

// Force HTTPS in production (AWS Elastic Beanstalk)
if (ENV === 'production') {
  app.use((req, res, next) => {
    // Allow health check requests from Elastic Load Balancer without redirect
    const isHealthCheck =
      req.headers['user-agent'] &&
      req.headers['user-agent'].includes('ELB-HealthChecker');

    if (isHealthCheck) return next();

    // If request came in via HTTP (not HTTPS), redirect to HTTPS
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }

    next();
  });
}

// Configure EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy (for Elastic Beanstalk load balancer)
app.set('trust proxy', 1);

// Parse request bodies (forms and JSON)
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// Parse JSON request bodies (for API endpoints if needed)
app.use(express.json({ limit: '100mb' }));

// Configure sessions for authentication
app.use(
  session({
    // Secret key for signing session cookies (should be set via environment variable in production)
    secret: process.env.SESSION_SECRET || 'ella-rises-dev-secret',
    // Don't save session if unmodified
    resave: false,
    // Don't create session until something is stored
    saveUninitialized: false,
    cookie: {
      // Lax SameSite prevents CSRF attacks while allowing normal navigation
      sameSite: 'lax',
      // Only send cookie over HTTPS in production
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Configure file uploads
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the static Ella Rises landing page (HTML/CSS/JS)
// This allows the root route to serve the marketing/informational page
app.use(express.static(path.join(__dirname, 'public', 'ella-rises-landingpage')));

// Register routes

// Public dashboard routes - Read-only data visualization for the public
app.use('/dashboard', dashboardRoutes);

// Admin panel routes - Authentication, CRUD operations, CSV upload, user management
app.use('/admin', adminRoutes);

// Root route - Serve the static landing page (marketing/informational site)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ella-rises-landingpage', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

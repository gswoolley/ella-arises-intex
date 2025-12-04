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
const PORT = process.env.PORT || 8080;

const ENV = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------
// FORCE HTTPS ON ELASTIC BEANSTALK (Classic Load Balancer Compatible)
// ---------------------------------------------------------------------
if (ENV === 'production') {
  app.use((req, res, next) => {
    const isHealthCheck =
      req.headers['user-agent'] &&
      req.headers['user-agent'].includes('ELB-HealthChecker');

    if (isHealthCheck) return next();

    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }

    next();
  });
}
// ---------------------------------------------------------------------

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Tell Express it is running behind a reverse proxy (Elastic Beanstalk
// load balancer / Nginx). This enables correct handling of X-Forwarded-* headers.
app.set('trust proxy', 1);

// Parse URL-encoded form bodies (used by the CSV upload form)
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));

// Session middleware for login/auth
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ella-rises-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Configure Multer to store uploaded CSV files temporarily on disk
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Serve the static Ella Rises landing page (HTML/CSS/JS) from the public
// directory so the root route can simply send index.html.
app.use(express.static(path.join(__dirname, 'public', 'ella-rises-landingpage')));

// Routes
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

// Root route: send the static Ella Rises landing page HTML file directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ella-rises-landingpage', 'index.html'));
});

// CSV upload is now handled by admin routes at /admin/csv-upload

// Start the HTTP server. In production, Elastic Beanstalk will route
// external traffic (HTTP/HTTPS) through a load balancer/Nginx to this port.
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

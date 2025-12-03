// Core dependencies used by the Express app and ETL pipeline
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');

// Knex instance (configured per environment) and ETL helpers
const knex = require('./util/db');
const runNormalization = require('./etl/normalize');
const mapCsvRowsToStaging = require('./etl/mapCsvToStaging');

// Create the Express application and determine the port (Elastic Beanstalk
// injects PORT in production; 3000 is used locally by default.)
const app = express();
const PORT = process.env.PORT || 3000;

// Configure EJS as the view engine and point it at the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tell Express it is running behind a reverse proxy (Elastic Beanstalk
// load balancer / Nginx). This enables correct handling of X-Forwarded-* headers.
app.set('trust proxy', 1);

// Parse URL-encoded form bodies (used by the CSV upload form)
app.use(express.urlencoded({ extended: true }));

// In production, enforce HTTPS when requests arrive through a proxy that sets
// the x-forwarded-proto header. Locally (NODE_ENV !== 'production'), this is
// skipped so you can use plain http://localhost.
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
  }
  next();
});

// Configure Multer to store uploaded CSV files temporarily on disk
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Serve the static Ella Rises landing page (HTML/CSS/JS) from the public
// directory so the root route can simply send index.html.
app.use(express.static(path.join(__dirname, 'public', 'ella-rises-landingpage')));

// Render the dedicated CSV upload page (server-rendered EJS template)
app.get('/upload', (req, res) => {
  res.render('upload', { message: null, error: null });
});


// Root route: send the static Ella Rises landing page HTML file directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ella-rises-landingpage', 'index.html'));
});

// Upload endpoint: accept a CSV file, stream rows into the staging table,
// and then run the normalization pipeline to populate the reporting tables.
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).render('upload', { message: null, error: 'No file uploaded. Please choose a CSV file.' });
  }

  // Absolute path to the temporary file on disk created by Multer
  const filePath = req.file.path;

  const rows = [];

  try {
    console.log('--- Upload started ---');
    console.log('[upload] Received file', { originalname: req.file.originalname, size: req.file.size, path: filePath });
    // Stream the CSV file row-by-row to avoid loading the entire file into
    // memory at once. Each parsed row is pushed into the rows array.
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rows.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('[upload] Finished reading CSV file', { rowCount: rows.length });

    // Insert all raw rows into the staging table (stagingrawsurvey). This
    // keeps uploaded data separate from the normalized reporting tables.
    await mapCsvRowsToStaging(knex, rows);

    // Run the normalization pipeline, which reads from stagingrawsurvey,
    // populates the normalized schema, archives rows, and truncates staging.
    await runNormalization(knex);

    // Clean up: remove the temporary CSV file once processing is complete.
    fs.unlink(filePath, () => {});

    console.log('--- Upload + normalization completed successfully ---');
    res.render('upload', { message: 'Upload and normalization completed successfully.', error: null });
  } catch (err) {
    console.error('Error during upload/normalization:', err);
    fs.unlink(filePath, () => {});
    res.status(500).render('upload', { message: null, error: 'An error occurred while processing the CSV. Check server logs for details.' });
  }
});

// Start the HTTP server. In production, Elastic Beanstalk will route
// external traffic (HTTP/HTTPS) through a load balancer/Nginx to this port.
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Server.js - Express server for Market Data Collector application
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Firebase Admin SDK if service account is provided
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase service account not provided, skipping initialization');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*'],
      connectSrc: ["'self'", 'https://*']
    }
  }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Import API functions
const fetchMarketData = require('./netlify/functions/fetch-market-data');
const processMarketData = require('./netlify/functions/process-market-data');
const calculateIndicators = require('./netlify/functions/calculate-indicators');
const storeMarketData = require('./netlify/functions/store-market-data');
const monitoring = require('./netlify/functions/monitoring');
const collectMarketData = require('./netlify/scheduled-functions/collect-market-data');

// API routes
app.post('/api/fetch-market-data', async (req, res) => {
  try {
    const result = await fetchMarketData.handler({
      body: JSON.stringify(req.body)
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in fetch-market-data:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.post('/api/process-market-data', async (req, res) => {
  try {
    const result = await processMarketData.handler({
      body: JSON.stringify(req.body)
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in process-market-data:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.post('/api/calculate-indicators', async (req, res) => {
  try {
    const result = await calculateIndicators.handler({
      body: JSON.stringify(req.body)
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in calculate-indicators:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.post('/api/store-market-data', async (req, res) => {
  try {
    const result = await storeMarketData.handler({
      body: JSON.stringify(req.body)
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in store-market-data:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/monitoring', async (req, res) => {
  try {
    const result = await monitoring.handler();
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in monitoring:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized ? 'connected' : 'not connected'
  });
});

// Set up scheduled jobs
if (process.env.NODE_ENV === 'production') {
  // Run market data collection every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled market data collection...');
    try {
      const result = await collectMarketData.handler();
      console.log('Scheduled market data collection completed:', result);
    } catch (error) {
      console.error('Error in scheduled market data collection:', error);
    }
  });

  // Run monitoring checks every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running monitoring checks...');
    try {
      const result = await monitoring.handler();
      console.log('Monitoring checks completed:', result);
    } catch (error) {
      console.error('Error in monitoring checks:', error);
    }
  });
}

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

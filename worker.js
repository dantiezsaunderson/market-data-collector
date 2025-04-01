// Worker.js - Background worker for Market Data Collector application
const admin = require('firebase-admin');
const cron = require('node-cron');
const Redis = require('redis');
const Bull = require('bull');
const { promisify } = require('util');

// Import scheduled functions
const collectMarketData = require('./scheduled-functions/collect-market-data');
const monitoring = require('./functions/monitoring');

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
    console.log('Firebase initialized successfully in worker');
  } else {
    console.log('Firebase service account not provided, skipping initialization');
  }
} catch (error) {
  console.error('Error initializing Firebase in worker:', error);
}

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = Redis.createClient({
  url: redisUrl
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Create job queues
const dataCollectionQueue = new Bull('data-collection', redisUrl);
const monitoringQueue = new Bull('monitoring', redisUrl);

// Process data collection jobs
dataCollectionQueue.process(async (job) => {
  console.log(`Processing data collection job ${job.id}`);
  try {
    const result = await collectMarketData.handler(job.data);
    console.log(`Data collection job ${job.id} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Error processing data collection job ${job.id}:`, error);
    throw error;
  }
});

// Process monitoring jobs
monitoringQueue.process(async (job) => {
  console.log(`Processing monitoring job ${job.id}`);
  try {
    const result = await monitoring.handler(job.data);
    console.log(`Monitoring job ${job.id} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Error processing monitoring job ${job.id}:`, error);
    throw error;
  }
});

// Schedule jobs
console.log('Setting up scheduled jobs...');

// Run market data collection every hour
cron.schedule('0 * * * *', async () => {
  console.log('Scheduling market data collection job...');
  try {
    const job = await dataCollectionQueue.add({
      timestamp: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000 // 1 minute
      }
    });
    console.log(`Scheduled market data collection job ${job.id}`);
  } catch (error) {
    console.error('Error scheduling market data collection job:', error);
  }
});

// Run monitoring checks every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Scheduling monitoring job...');
  try {
    const job = await monitoringQueue.add({
      timestamp: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000 // 30 seconds
      }
    });
    console.log(`Scheduled monitoring job ${job.id}`);
  } catch (error) {
    console.error('Error scheduling monitoring job:', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await dataCollectionQueue.close();
  await monitoringQueue.close();
  redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await dataCollectionQueue.close();
  await monitoringQueue.close();
  redisClient.quit();
  process.exit(0);
});

console.log('Worker started successfully');

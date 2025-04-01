// Netlify scheduled function to collect market data on a regular basis
const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  // Use environment variables for Firebase credentials
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  
  firebaseInitialized = true;
};

// Helper function to get active scheduled jobs from Firestore
const getActiveJobs = async () => {
  initializeFirebase();
  
  const db = admin.firestore();
  const jobsRef = db.collection('scheduledJobs');
  const snapshot = await jobsRef.where('status', '==', 'active').get();
  
  if (snapshot.empty) {
    console.log('No active scheduled jobs found');
    return [];
  }
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Helper function to update job status in Firestore
const updateJobStatus = async (jobId, status, result = null) => {
  initializeFirebase();
  
  const db = admin.firestore();
  const jobRef = db.collection('scheduledJobs').doc(jobId);
  
  const updateData = {
    lastRun: admin.firestore.FieldValue.serverTimestamp(),
    lastStatus: status
  };
  
  if (result) {
    updateData.lastResult = result;
  }
  
  await jobRef.update(updateData);
};

// Helper function to fetch market data
const fetchMarketData = async (job) => {
  const { exchange, symbol, timeframe, apiKey, apiSecret, includeOrderbook, includeTickers } = job.config;
  
  // Calculate date range based on job configuration
  const now = new Date();
  let startDate;
  
  switch (job.config.dataRange) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '3d':
      startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '1w':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1m':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 1 day
  }
  
  // Format dates as ISO strings
  const startDateStr = startDate.toISOString();
  const endDateStr = now.toISOString();
  
  // Call the fetch-market-data function
  const response = await axios.post(process.env.NETLIFY_URL + '/.netlify/functions/fetch-market-data', {
    exchange,
    symbol,
    timeframe,
    startDate: startDateStr,
    endDate: endDateStr,
    apiKey,
    apiSecret,
    includeOrderbook,
    includeTickers
  });
  
  return response.data;
};

// Helper function to process market data
const processMarketData = async (data, job) => {
  const { cleanData, removeOutliers, handleMissingValues, normalize } = job.config.processing || {};
  
  if (!cleanData) {
    return data; // Skip processing if not enabled
  }
  
  // Call the process-market-data function
  const response = await axios.post(process.env.NETLIFY_URL + '/.netlify/functions/process-market-data', {
    data: data.ohlcv,
    options: {
      alignTimestamps: true,
      handleMissingValues: handleMissingValues !== false,
      removeOutliers: removeOutliers === true,
      normalize: normalize === true
    }
  });
  
  return {
    ...data,
    ohlcv: response.data.data
  };
};

// Helper function to calculate indicators
const calculateIndicators = async (data, job) => {
  const { calculateIndicators, indicators } = job.config.processing || {};
  
  if (!calculateIndicators || !indicators || indicators.length === 0) {
    return data; // Skip indicator calculation if not enabled
  }
  
  // Call the calculate-indicators function
  const response = await axios.post(process.env.NETLIFY_URL + '/.netlify/functions/calculate-indicators', {
    data: data.ohlcv,
    indicators,
    parameters: job.config.indicatorParams || {}
  });
  
  return {
    ...data,
    indicators: response.data.indicators,
    ohlcv: response.data.combinedData || data.ohlcv
  };
};

// Helper function to store market data
const storeMarketData = async (data, job) => {
  const { storageMethod, format } = job.config.storage || {};
  
  if (!storageMethod) {
    return null; // Skip storage if not configured
  }
  
  // Prepare metadata
  const metadata = {
    symbol: job.config.symbol,
    timeframe: job.config.timeframe,
    startDate: data.startDate,
    endDate: data.endDate,
    jobId: job.id,
    jobName: job.name,
    dataPoints: data.ohlcv.length,
    hasIndicators: !!data.indicators,
    hasOrderBook: !!data.orderBook,
    hasTicker: !!data.ticker
  };
  
  // Call the store-market-data function
  const response = await axios.post(process.env.NETLIFY_URL + '/.netlify/functions/store-market-data', {
    data: data.ohlcv,
    metadata,
    options: {
      storageMethod: storageMethod || 'firestore',
      format: format || 'json'
    }
  });
  
  return response.data;
};

// Main handler function
exports.handler = async (event, context) => {
  console.log('Scheduled market data collection started');
  
  try {
    // Get active scheduled jobs
    const activeJobs = await getActiveJobs();
    console.log(`Found ${activeJobs.length} active jobs`);
    
    // Process each job
    const results = [];
    
    for (const job of activeJobs) {
      console.log(`Processing job: ${job.name} (${job.id})`);
      
      try {
        // Update job status to running
        await updateJobStatus(job.id, 'running');
        
        // Fetch market data
        const marketData = await fetchMarketData(job);
        console.log(`Fetched ${marketData.dataPoints} data points for ${job.config.symbol}`);
        
        // Process market data if enabled
        const processedData = await processMarketData(marketData, job);
        
        // Calculate indicators if enabled
        const dataWithIndicators = await calculateIndicators(processedData, job);
        
        // Store market data if enabled
        const storageResult = await storeMarketData(dataWithIndicators, job);
        
        // Update job status to completed
        await updateJobStatus(job.id, 'completed', {
          dataPoints: marketData.dataPoints,
          storageId: storageResult?.result?.id,
          timestamp: new Date().toISOString()
        });
        
        results.push({
          jobId: job.id,
          jobName: job.name,
          status: 'completed',
          dataPoints: marketData.dataPoints,
          storageId: storageResult?.result?.id
        });
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        
        // Update job status to failed
        await updateJobStatus(job.id, 'failed', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        results.push({
          jobId: job.id,
          jobName: job.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled market data collection completed',
        jobsProcessed: activeJobs.length,
        results
      })
    };
  } catch (error) {
    console.error('Error in scheduled market data collection:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

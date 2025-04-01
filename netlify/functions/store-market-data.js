// Netlify function to store market data in Firebase
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  // Use environment variables for Firebase credentials
  // These would be set in Netlify environment variables
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  
  firebaseInitialized = true;
};

// Helper function to store data in Firestore
const storeInFirestore = async (data, metadata) => {
  initializeFirebase();
  
  const db = admin.firestore();
  const datasetId = metadata.id || uuidv4();
  
  // Create a reference to the dataset document
  const datasetRef = db.collection('datasets').doc(datasetId);
  
  // Store metadata in the dataset document
  await datasetRef.set({
    ...metadata,
    id: datasetId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    recordCount: data.length,
    status: 'complete'
  });
  
  // For large datasets, store data in chunks to avoid Firestore document size limits
  const chunkSize = 500; // Firestore has a 1MB document size limit
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const chunkId = `${i / chunkSize + 1}`;
    
    await datasetRef.collection('chunks').doc(chunkId).set({
      data: chunk,
      index: i,
      count: chunk.length
    });
  }
  
  return {
    id: datasetId,
    chunks: Math.ceil(data.length / chunkSize)
  };
};

// Helper function to store data in Firebase Storage as a file
const storeInStorage = async (data, metadata, format = 'json') => {
  initializeFirebase();
  
  const storage = admin.storage().bucket();
  const datasetId = metadata.id || uuidv4();
  
  // Create file path based on metadata
  const symbol = metadata.symbol.replace('/', '_');
  const timeframe = metadata.timeframe;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `datasets/${symbol}/${timeframe}/${datasetId}_${timestamp}.${format}`;
  
  // Prepare file content based on format
  let fileContent;
  
  if (format === 'json') {
    fileContent = JSON.stringify({
      metadata: {
        ...metadata,
        id: datasetId,
        createdAt: new Date().toISOString(),
        recordCount: data.length
      },
      data
    });
  } else if (format === 'csv') {
    // Create CSV header
    const headers = Object.keys(data[0]).join(',');
    
    // Create CSV rows
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );
    
    fileContent = [headers, ...rows].join('\n');
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  // Upload file to Firebase Storage
  const file = storage.file(filePath);
  await file.save(fileContent, {
    contentType: format === 'json' ? 'application/json' : 'text/csv',
    metadata: {
      metadata: {
        symbol: metadata.symbol,
        timeframe: metadata.timeframe,
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        recordCount: data.length.toString()
      }
    }
  });
  
  // Get public URL
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2500' // Far future expiration
  });
  
  // Also store reference in Firestore for easier querying
  const db = admin.firestore();
  await db.collection('files').doc(datasetId).set({
    id: datasetId,
    filePath,
    url,
    format,
    symbol: metadata.symbol,
    timeframe: metadata.timeframe,
    startDate: metadata.startDate,
    endDate: metadata.endDate,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    recordCount: data.length
  });
  
  return {
    id: datasetId,
    filePath,
    url
  };
};

// Main handler function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight request successful' }),
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { 
      data,
      metadata,
      options = {}
    } = requestBody;
    
    // Validate required parameters
    if (!data || !Array.isArray(data)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing or invalid data parameter', 
          required: 'Array of OHLCV data objects'
        }),
      };
    }
    
    if (!metadata || !metadata.symbol || !metadata.timeframe) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing or invalid metadata', 
          required: 'Object with symbol and timeframe properties'
        }),
      };
    }
    
    // Determine storage method
    const storageMethod = options.storageMethod || 'firestore';
    const format = options.format || 'json';
    
    let result;
    
    if (storageMethod === 'firestore') {
      result = await storeInFirestore(data, metadata);
    } else if (storageMethod === 'storage') {
      result = await storeInStorage(data, metadata, format);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid storage method', 
          allowed: ['firestore', 'storage']
        }),
      };
    }
    
    // Return the result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        storageMethod,
        result
      }),
    };
  } catch (error) {
    console.error(`Error in store-market-data function: ${error.message}`);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
    };
  }
};

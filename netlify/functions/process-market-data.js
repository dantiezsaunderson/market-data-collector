// Netlify function to process and clean market data
const { parse, format } = require('date-fns');

// Helper function to handle missing values in OHLCV data
const handleMissingValues = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Sort data by timestamp to ensure chronological order
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  
  // Check for missing timestamps
  const timeframe = getTimeframeFromData(sortedData);
  if (!timeframe) {
    return sortedData; // Can't detect timeframe, return original data
  }
  
  const expectedTimestamps = generateExpectedTimestamps(
    sortedData[0].timestamp,
    sortedData[sortedData.length - 1].timestamp,
    timeframe
  );
  
  // Create a map of existing data points
  const dataMap = {};
  sortedData.forEach(candle => {
    dataMap[candle.timestamp] = candle;
  });
  
  // Fill in missing data points
  const filledData = [];
  let lastValidCandle = null;
  
  expectedTimestamps.forEach(timestamp => {
    if (dataMap[timestamp]) {
      // Use existing data
      filledData.push(dataMap[timestamp]);
      lastValidCandle = dataMap[timestamp];
    } else if (lastValidCandle) {
      // Forward-fill with last valid values
      filledData.push({
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        open: lastValidCandle.close,
        high: lastValidCandle.close,
        low: lastValidCandle.close,
        close: lastValidCandle.close,
        volume: 0,
        interpolated: true
      });
    }
    // If no lastValidCandle, we skip this timestamp (can't forward-fill the beginning)
  });
  
  return filledData;
};

// Helper function to detect timeframe from data
const getTimeframeFromData = (data) => {
  if (data.length < 2) {
    return null;
  }
  
  // Calculate differences between consecutive timestamps
  const differences = [];
  for (let i = 1; i < Math.min(data.length, 10); i++) {
    differences.push(data[i].timestamp - data[i-1].timestamp);
  }
  
  // Find the most common difference (mode)
  const differenceCounts = {};
  let maxCount = 0;
  let mostCommonDiff = differences[0];
  
  differences.forEach(diff => {
    differenceCounts[diff] = (differenceCounts[diff] || 0) + 1;
    if (differenceCounts[diff] > maxCount) {
      maxCount = differenceCounts[diff];
      mostCommonDiff = diff;
    }
  });
  
  return mostCommonDiff;
};

// Helper function to generate expected timestamps
const generateExpectedTimestamps = (startTimestamp, endTimestamp, timeframeMs) => {
  const timestamps = [];
  let currentTimestamp = startTimestamp;
  
  while (currentTimestamp <= endTimestamp) {
    timestamps.push(currentTimestamp);
    currentTimestamp += timeframeMs;
  }
  
  return timestamps;
};

// Helper function to remove outliers
const removeOutliers = (data, threshold = 3) => {
  if (!data || data.length < 10) {
    return data; // Not enough data to detect outliers
  }
  
  // Calculate mean and standard deviation for high and low prices
  let sumHigh = 0;
  let sumLow = 0;
  data.forEach(candle => {
    sumHigh += candle.high;
    sumLow += candle.low;
  });
  
  const meanHigh = sumHigh / data.length;
  const meanLow = sumLow / data.length;
  
  let sumSquaredDevHigh = 0;
  let sumSquaredDevLow = 0;
  data.forEach(candle => {
    sumSquaredDevHigh += Math.pow(candle.high - meanHigh, 2);
    sumSquaredDevLow += Math.pow(candle.low - meanLow, 2);
  });
  
  const stdDevHigh = Math.sqrt(sumSquaredDevHigh / data.length);
  const stdDevLow = Math.sqrt(sumSquaredDevLow / data.length);
  
  // Filter out outliers
  return data.map(candle => {
    const highZScore = Math.abs((candle.high - meanHigh) / stdDevHigh);
    const lowZScore = Math.abs((candle.low - meanLow) / stdDevLow);
    
    if (highZScore > threshold) {
      // High price is an outlier, replace with a reasonable value
      return {
        ...candle,
        high: Math.min(candle.high, meanHigh + threshold * stdDevHigh),
        outlierCorrected: true
      };
    } else if (lowZScore > threshold) {
      // Low price is an outlier, replace with a reasonable value
      return {
        ...candle,
        low: Math.max(candle.low, meanLow - threshold * stdDevLow),
        outlierCorrected: true
      };
    }
    
    return candle;
  });
};

// Helper function to normalize data
const normalizeData = (data) => {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Find min and max values for each field
  let minOpen = Infinity, maxOpen = -Infinity;
  let minHigh = Infinity, maxHigh = -Infinity;
  let minLow = Infinity, maxLow = -Infinity;
  let minClose = Infinity, maxClose = -Infinity;
  let minVolume = Infinity, maxVolume = -Infinity;
  
  data.forEach(candle => {
    minOpen = Math.min(minOpen, candle.open);
    maxOpen = Math.max(maxOpen, candle.open);
    
    minHigh = Math.min(minHigh, candle.high);
    maxHigh = Math.max(maxHigh, candle.high);
    
    minLow = Math.min(minLow, candle.low);
    maxLow = Math.max(maxLow, candle.low);
    
    minClose = Math.min(minClose, candle.close);
    maxClose = Math.max(maxClose, candle.close);
    
    minVolume = Math.min(minVolume, candle.volume);
    maxVolume = Math.max(maxVolume, candle.volume);
  });
  
  // Normalize each field to [0, 1] range
  return data.map(candle => {
    return {
      ...candle,
      normalizedOpen: (candle.open - minOpen) / (maxOpen - minOpen || 1),
      normalizedHigh: (candle.high - minHigh) / (maxHigh - minHigh || 1),
      normalizedLow: (candle.low - minLow) / (maxLow - minLow || 1),
      normalizedClose: (candle.close - minClose) / (maxClose - minClose || 1),
      normalizedVolume: (candle.volume - minVolume) / (maxVolume - minVolume || 1)
    };
  });
};

// Helper function to align timestamps
const alignTimestamps = (data) => {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Detect timeframe
  const timeframe = getTimeframeFromData(data);
  if (!timeframe) {
    return data;
  }
  
  // Align each timestamp to the nearest timeframe boundary
  return data.map(candle => {
    const timestamp = candle.timestamp;
    const alignedTimestamp = Math.floor(timestamp / timeframe) * timeframe;
    
    return {
      ...candle,
      timestamp: alignedTimestamp,
      datetime: new Date(alignedTimestamp).toISOString(),
      originalTimestamp: timestamp !== alignedTimestamp ? timestamp : undefined
    };
  });
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
    
    // Apply cleaning operations based on options
    let processedData = [...data];
    const processingSteps = [];
    
    if (options.alignTimestamps !== false) {
      processedData = alignTimestamps(processedData);
      processingSteps.push('alignTimestamps');
    }
    
    if (options.handleMissingValues !== false) {
      processedData = handleMissingValues(processedData);
      processingSteps.push('handleMissingValues');
    }
    
    if (options.removeOutliers !== false) {
      const threshold = options.outlierThreshold || 3;
      processedData = removeOutliers(processedData, threshold);
      processingSteps.push('removeOutliers');
    }
    
    if (options.normalize === true) {
      processedData = normalizeData(processedData);
      processingSteps.push('normalize');
    }
    
    // Return the processed data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        originalCount: data.length,
        processedCount: processedData.length,
        processingSteps,
        data: processedData
      }),
    };
  } catch (error) {
    console.error(`Error in process-market-data function: ${error.message}`);
    
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

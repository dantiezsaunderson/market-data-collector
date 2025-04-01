// Netlify function to fetch market data from cryptocurrency exchanges
const axios = require('axios');
const ccxt = require('ccxt');

// Helper function to initialize exchange
const initializeExchange = (exchange, apiKey = null, apiSecret = null) => {
  let exchangeInstance;
  
  try {
    // Create exchange instance based on name
    if (exchange === 'binance') {
      exchangeInstance = new ccxt.binance({
        apiKey: apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      });
    } else if (exchange === 'bybit') {
      exchangeInstance = new ccxt.bybit({
        apiKey: apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      });
    } else if (exchange === 'coinbase') {
      exchangeInstance = new ccxt.coinbasepro({
        apiKey: apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      });
    } else if (exchange === 'kraken') {
      exchangeInstance = new ccxt.kraken({
        apiKey: apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      });
    } else {
      throw new Error(`Unsupported exchange: ${exchange}`);
    }
    
    return exchangeInstance;
  } catch (error) {
    throw new Error(`Failed to initialize exchange: ${error.message}`);
  }
};

// Helper function to convert timeframe to milliseconds
const timeframeToMs = (timeframe) => {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid timeframe: ${timeframe}`);
  }
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
      exchange, 
      symbol, 
      timeframe, 
      startDate, 
      endDate, 
      apiKey, 
      apiSecret,
      includeOrderbook,
      includeTickers
    } = requestBody;
    
    // Validate required parameters
    if (!exchange || !symbol || !timeframe || !startDate || !endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters', 
          requiredParams: ['exchange', 'symbol', 'timeframe', 'startDate', 'endDate'] 
        }),
      };
    }
    
    // Initialize exchange
    const exchangeInstance = initializeExchange(exchange, apiKey, apiSecret);
    
    // Convert dates to timestamps
    const since = new Date(startDate).getTime();
    const until = new Date(endDate).getTime();
    
    // Calculate time intervals to avoid rate limits and large responses
    const timeframeMs = timeframeToMs(timeframe);
    const maxDataPoints = 1000; // Most exchanges limit to 1000 candles per request
    const intervalMs = maxDataPoints * timeframeMs;
    
    // Prepare result container
    let allCandles = [];
    let orderBookData = null;
    let tickerData = null;
    
    // Fetch OHLCV data in chunks
    let currentSince = since;
    while (currentSince < until) {
      const currentUntil = Math.min(currentSince + intervalMs, until);
      
      console.log(`Fetching ${symbol} ${timeframe} from ${new Date(currentSince).toISOString()} to ${new Date(currentUntil).toISOString()}`);
      
      const candles = await exchangeInstance.fetchOHLCV(
        symbol,
        timeframe,
        currentSince,
        maxDataPoints
      );
      
      if (candles && candles.length > 0) {
        allCandles = [...allCandles, ...candles];
        
        // Update currentSince for next iteration
        // Use the timestamp of the last candle plus one timeframe
        const lastCandleTime = candles[candles.length - 1][0];
        currentSince = lastCandleTime + timeframeMs;
      } else {
        // If no candles returned, move forward by interval
        currentSince += intervalMs;
      }
      
      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Fetch order book if requested
    if (includeOrderbook) {
      try {
        orderBookData = await exchangeInstance.fetchOrderBook(symbol);
      } catch (error) {
        console.error(`Error fetching order book: ${error.message}`);
        orderBookData = { error: error.message };
      }
    }
    
    // Fetch ticker if requested
    if (includeTickers) {
      try {
        tickerData = await exchangeInstance.fetchTicker(symbol);
      } catch (error) {
        console.error(`Error fetching ticker: ${error.message}`);
        tickerData = { error: error.message };
      }
    }
    
    // Format OHLCV data
    const formattedCandles = allCandles.map(candle => ({
      timestamp: candle[0],
      datetime: new Date(candle[0]).toISOString(),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5]
    }));
    
    // Return the data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        exchange,
        symbol,
        timeframe,
        startDate,
        endDate,
        dataPoints: formattedCandles.length,
        ohlcv: formattedCandles,
        orderBook: orderBookData,
        ticker: tickerData
      }),
    };
  } catch (error) {
    console.error(`Error in fetch-market-data function: ${error.message}`);
    
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

// Netlify function to calculate technical indicators for market data
const technicalIndicators = require('technicalindicators');

// Configure technical indicators
technicalIndicators.setConfig('precision', 8);

// Helper function to calculate Simple Moving Average (SMA)
const calculateSMA = (data, period = 20) => {
  if (!data || data.length < period) {
    return [];
  }
  
  const closes = data.map(candle => candle.close);
  const sma = technicalIndicators.SMA.calculate({
    period,
    values: closes
  });
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - sma.length).fill(null);
  return [...padding, ...sma];
};

// Helper function to calculate Exponential Moving Average (EMA)
const calculateEMA = (data, period = 20) => {
  if (!data || data.length < period) {
    return [];
  }
  
  const closes = data.map(candle => candle.close);
  const ema = technicalIndicators.EMA.calculate({
    period,
    values: closes
  });
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - ema.length).fill(null);
  return [...padding, ...ema];
};

// Helper function to calculate Relative Strength Index (RSI)
const calculateRSI = (data, period = 14) => {
  if (!data || data.length < period + 1) {
    return [];
  }
  
  const closes = data.map(candle => candle.close);
  const rsi = technicalIndicators.RSI.calculate({
    period,
    values: closes
  });
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - rsi.length).fill(null);
  return [...padding, ...rsi];
};

// Helper function to calculate Moving Average Convergence Divergence (MACD)
const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (!data || data.length < slowPeriod + signalPeriod) {
    return {
      macd: [],
      signal: [],
      histogram: []
    };
  }
  
  const closes = data.map(candle => candle.close);
  const macdResult = technicalIndicators.MACD.calculate({
    fastPeriod,
    slowPeriod,
    signalPeriod,
    values: closes
  });
  
  // Extract MACD, signal, and histogram values
  const macd = macdResult.map(item => item.MACD);
  const signal = macdResult.map(item => item.signal);
  const histogram = macdResult.map(item => item.histogram);
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - macd.length).fill(null);
  
  return {
    macd: [...padding, ...macd],
    signal: [...padding, ...signal],
    histogram: [...padding, ...histogram]
  };
};

// Helper function to calculate Bollinger Bands
const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  if (!data || data.length < period) {
    return {
      upper: [],
      middle: [],
      lower: []
    };
  }
  
  const closes = data.map(candle => candle.close);
  const bbResult = technicalIndicators.BollingerBands.calculate({
    period,
    values: closes,
    stdDev
  });
  
  // Extract upper, middle, and lower bands
  const upper = bbResult.map(item => item.upper);
  const middle = bbResult.map(item => item.middle);
  const lower = bbResult.map(item => item.lower);
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - upper.length).fill(null);
  
  return {
    upper: [...padding, ...upper],
    middle: [...padding, ...middle],
    lower: [...padding, ...lower]
  };
};

// Helper function to calculate Average True Range (ATR)
const calculateATR = (data, period = 14) => {
  if (!data || data.length < period + 1) {
    return [];
  }
  
  const atrInput = data.map(candle => ({
    high: candle.high,
    low: candle.low,
    close: candle.close
  }));
  
  const atr = technicalIndicators.ATR.calculate({
    period,
    high: atrInput.map(item => item.high),
    low: atrInput.map(item => item.low),
    close: atrInput.map(item => item.close)
  });
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - atr.length).fill(null);
  return [...padding, ...atr];
};

// Helper function to calculate Stochastic Oscillator
const calculateStochastic = (data, period = 14, signalPeriod = 3) => {
  if (!data || data.length < period) {
    return {
      k: [],
      d: []
    };
  }
  
  const stochInput = data.map(candle => ({
    high: candle.high,
    low: candle.low,
    close: candle.close
  }));
  
  const stoch = technicalIndicators.Stochastic.calculate({
    period,
    signalPeriod,
    high: stochInput.map(item => item.high),
    low: stochInput.map(item => item.low),
    close: stochInput.map(item => item.close)
  });
  
  // Extract k and d values
  const k = stoch.map(item => item.k);
  const d = stoch.map(item => item.d);
  
  // Pad the beginning with nulls to match the original data length
  const padding = Array(data.length - k.length).fill(null);
  
  return {
    k: [...padding, ...k],
    d: [...padding, ...d]
  };
};

// Helper function to calculate On-Balance Volume (OBV)
const calculateOBV = (data) => {
  if (!data || data.length < 2) {
    return [];
  }
  
  const obv = [0]; // Start with 0
  
  for (let i = 1; i < data.length; i++) {
    const currentClose = data[i].close;
    const previousClose = data[i-1].close;
    const currentVolume = data[i].volume;
    
    if (currentClose > previousClose) {
      // Price up, add volume
      obv.push(obv[i-1] + currentVolume);
    } else if (currentClose < previousClose) {
      // Price down, subtract volume
      obv.push(obv[i-1] - currentVolume);
    } else {
      // Price unchanged, OBV unchanged
      obv.push(obv[i-1]);
    }
  }
  
  return obv;
};

// Helper function to calculate percentage returns
const calculateReturns = (data) => {
  if (!data || data.length < 2) {
    return [];
  }
  
  const returns = [null]; // First candle has no return
  
  for (let i = 1; i < data.length; i++) {
    const currentClose = data[i].close;
    const previousClose = data[i-1].close;
    
    // Calculate percentage return
    const returnValue = ((currentClose - previousClose) / previousClose) * 100;
    returns.push(returnValue);
  }
  
  return returns;
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
      indicators = ['sma', 'ema', 'rsi'],
      parameters = {}
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
    
    // Calculate requested indicators
    const result = {
      originalData: data,
      indicators: {}
    };
    
    // Process each requested indicator
    for (const indicator of indicators) {
      switch (indicator.toLowerCase()) {
        case 'sma':
          const smaPeriod = parameters.smaPeriod || 20;
          result.indicators.sma = calculateSMA(data, smaPeriod);
          break;
          
        case 'ema':
          const emaPeriod = parameters.emaPeriod || 20;
          result.indicators.ema = calculateEMA(data, emaPeriod);
          break;
          
        case 'rsi':
          const rsiPeriod = parameters.rsiPeriod || 14;
          result.indicators.rsi = calculateRSI(data, rsiPeriod);
          break;
          
        case 'macd':
          const fastPeriod = parameters.macdFastPeriod || 12;
          const slowPeriod = parameters.macdSlowPeriod || 26;
          const signalPeriod = parameters.macdSignalPeriod || 9;
          result.indicators.macd = calculateMACD(data, fastPeriod, slowPeriod, signalPeriod);
          break;
          
        case 'bollinger':
          const bbPeriod = parameters.bollingerPeriod || 20;
          const bbStdDev = parameters.bollingerStdDev || 2;
          result.indicators.bollinger = calculateBollingerBands(data, bbPeriod, bbStdDev);
          break;
          
        case 'atr':
          const atrPeriod = parameters.atrPeriod || 14;
          result.indicators.atr = calculateATR(data, atrPeriod);
          break;
          
        case 'stochastic':
          const stochPeriod = parameters.stochasticPeriod || 14;
          const stochSignalPeriod = parameters.stochasticSignalPeriod || 3;
          result.indicators.stochastic = calculateStochastic(data, stochPeriod, stochSignalPeriod);
          break;
          
        case 'obv':
          result.indicators.obv = calculateOBV(data);
          break;
          
        case 'returns':
          result.indicators.returns = calculateReturns(data);
          break;
          
        default:
          console.warn(`Unknown indicator: ${indicator}`);
      }
    }
    
    // Combine data with indicators if requested
    if (parameters.combineWithData === true) {
      result.combinedData = data.map((candle, index) => {
        const combined = { ...candle };
        
        // Add each indicator value to the candle
        Object.entries(result.indicators).forEach(([indicatorName, indicatorValues]) => {
          if (Array.isArray(indicatorValues)) {
            combined[indicatorName] = indicatorValues[index];
          } else if (typeof indicatorValues === 'object') {
            // For indicators with multiple values (like MACD, Bollinger Bands)
            Object.entries(indicatorValues).forEach(([subName, subValues]) => {
              combined[`${indicatorName}_${subName}`] = subValues[index];
            });
          }
        });
        
        return combined;
      });
    }
    
    // Return the result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(`Error in calculate-indicators function: ${error.message}`);
    
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

// Performance optimization utilities for the Market Data Collector application
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom hook for debouncing values
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for lazy loading components
 * @param {Function} importFunc - Import function for the component
 * @returns {Object} Component and loading state
 */
export const useLazyComponent = (importFunc) => {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    importFunc()
      .then((module) => {
        setComponent(module.default);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error lazy loading component:', error);
        setLoading(false);
      });
  }, [importFunc]);

  return { component, loading };
};

/**
 * Custom hook for virtualized lists
 * @param {Array} items - List items
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} windowHeight - Visible window height in pixels
 * @param {number} overscan - Number of items to render outside visible area
 * @returns {Object} Virtualized list data
 */
export const useVirtualizedList = (items, itemHeight, windowHeight, overscan = 3) => {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    if (!items || !items.length) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + windowHeight) / itemHeight) + overscan
    );

    const visibleData = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleData.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0
        }
      });
    }

    return visibleData;
  }, [items, itemHeight, windowHeight, scrollTop, overscan]);

  const totalHeight = useMemo(() => {
    return items ? items.length * itemHeight : 0;
  }, [items, itemHeight]);

  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
};

/**
 * Custom hook for data caching
 * @param {Function} fetchFunc - Function to fetch data
 * @param {Array} deps - Dependencies array
 * @param {number} cacheTime - Cache time in milliseconds
 * @returns {Object} Cached data and loading state
 */
export const useDataCache = (fetchFunc, deps = [], cacheTime = 5 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(0);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Return cached data if within cache time
    if (!force && data && now - lastFetched < cacheTime) {
      return data;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunc();
      setData(result);
      setLastFetched(now);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [fetchFunc, data, lastFetched, cacheTime]);

  useEffect(() => {
    fetchData().catch(err => console.error('Error fetching data:', err));
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true)
  };
};

/**
 * Memoize expensive calculations
 * @param {Function} func - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (func) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * Chunk array processing for better responsiveness
 * @param {Array} array - Array to process
 * @param {Function} processFunc - Function to process each item
 * @param {number} chunkSize - Size of each chunk
 * @param {number} delay - Delay between chunks in milliseconds
 * @returns {Promise<Array>} Processed array
 */
export const processArrayInChunks = async (array, processFunc, chunkSize = 100, delay = 0) => {
  const results = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    
    // Process chunk
    const chunkResults = await Promise.all(chunk.map(processFunc));
    results.push(...chunkResults);
    
    // Add delay between chunks if specified
    if (delay > 0 && i + chunkSize < array.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};

/**
 * Web Worker wrapper for offloading heavy computations
 * @param {Function} workerFunc - Function to run in worker
 * @returns {Function} Function that returns a promise with the result
 */
export const createWorker = (workerFunc) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      // Create worker from function
      const workerCode = `
        self.onmessage = function(e) {
          try {
            const result = (${workerFunc.toString()})(e.data);
            self.postMessage({ result });
          } catch (error) {
            self.postMessage({ error: error.message });
          }
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      // Handle worker messages
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
      
      // Start worker
      worker.postMessage(args);
    });
  };
};

/**
 * Optimize large dataset for charts
 * @param {Array} data - OHLCV data array
 * @param {number} maxPoints - Maximum number of points to display
 * @returns {Array} Optimized data array
 */
export const optimizeChartData = memoize((data, maxPoints = 1000) => {
  if (!data || data.length <= maxPoints) {
    return data;
  }
  
  // Calculate sampling interval
  const interval = Math.ceil(data.length / maxPoints);
  
  // Sample data points
  const sampledData = [];
  
  for (let i = 0; i < data.length; i += interval) {
    // For each interval, find min/max values
    const chunk = data.slice(i, Math.min(i + interval, data.length));
    
    // For OHLCV data, we need to preserve the structure
    if (chunk.length > 0) {
      const first = chunk[0];
      const last = chunk[chunk.length - 1];
      
      // Find highest high and lowest low in the chunk
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      let totalVolume = 0;
      
      for (const candle of chunk) {
        highestHigh = Math.max(highestHigh, candle.high);
        lowestLow = Math.min(lowestLow, candle.low);
        totalVolume += candle.volume;
      }
      
      // Create a representative candle for this interval
      sampledData.push({
        timestamp: first.timestamp,
        datetime: first.datetime,
        open: first.open,
        high: highestHigh,
        low: lowestLow,
        close: last.close,
        volume: totalVolume
      });
    }
  }
  
  return sampledData;
});

/**
 * Compress data for storage or transmission
 * @param {Object} data - Data to compress
 * @returns {string} Compressed data as base64 string
 */
export const compressData = (data) => {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);
    
    // Use browser's built-in compression
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);
    
    // This would normally use compression, but for browser compatibility
    // we'll just convert to base64 here
    return btoa(String.fromCharCode.apply(null, uint8Array));
  } catch (error) {
    console.error('Error compressing data:', error);
    return null;
  }
};

/**
 * Decompress data
 * @param {string} compressedData - Compressed data as base64 string
 * @returns {Object} Decompressed data
 */
export const decompressData = (compressedData) => {
  try {
    // Convert base64 to uint8array
    const binaryString = atob(compressedData);
    const uint8Array = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    // Decode to string
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(uint8Array);
    
    // Parse JSON
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decompressing data:', error);
    return null;
  }
};

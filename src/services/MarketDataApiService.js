// Modified MarketDataApiService.js for Docker environment
import axios from 'axios';

/**
 * Service for interacting with market data API endpoints
 */
class MarketDataApiService {
  constructor() {
    // Use environment-aware base URL
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
  }

  /**
   * Fetch market data from exchange
   * @param {Object} params - Request parameters
   * @param {string} params.exchange - Exchange name
   * @param {string} params.symbol - Trading pair symbol
   * @param {string} params.timeframe - Timeframe interval
   * @param {string} params.startDate - Start date in ISO format
   * @param {string} params.endDate - End date in ISO format
   * @param {boolean} params.includeOrderbook - Whether to include orderbook data
   * @param {boolean} params.includeTickers - Whether to include ticker data
   * @returns {Promise<Object>} Market data
   */
  async fetchMarketData(params) {
    try {
      const response = await axios.post(`${this.baseUrl}/fetch-market-data`, params);
      return response.data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  /**
   * Process market data
   * @param {Object} params - Request parameters
   * @param {Array} params.data - OHLCV data array
   * @param {Object} params.options - Processing options
   * @returns {Promise<Object>} Processed data
   */
  async processMarketData(params) {
    try {
      const response = await axios.post(`${this.baseUrl}/process-market-data`, params);
      return response.data;
    } catch (error) {
      console.error('Error processing market data:', error);
      throw error;
    }
  }

  /**
   * Calculate technical indicators
   * @param {Object} params - Request parameters
   * @param {Array} params.data - OHLCV data array
   * @param {Array} params.indicators - Array of indicator names
   * @param {Object} params.parameters - Indicator parameters
   * @returns {Promise<Object>} Indicator data
   */
  async calculateIndicators(params) {
    try {
      const response = await axios.post(`${this.baseUrl}/calculate-indicators`, params);
      return response.data;
    } catch (error) {
      console.error('Error calculating indicators:', error);
      throw error;
    }
  }

  /**
   * Store market data
   * @param {Object} params - Request parameters
   * @param {Array} params.data - OHLCV data array
   * @param {Object} params.metadata - Data metadata
   * @param {Object} params.options - Storage options
   * @returns {Promise<Object>} Storage result
   */
  async storeMarketData(params) {
    try {
      const response = await axios.post(`${this.baseUrl}/store-market-data`, params);
      return response.data;
    } catch (error) {
      console.error('Error storing market data:', error);
      throw error;
    }
  }

  /**
   * Get monitoring data
   * @returns {Promise<Object>} Monitoring data
   */
  async getMonitoringData() {
    try {
      const response = await axios.get(`${this.baseUrl}/monitoring`);
      return response.data;
    } catch (error) {
      console.error('Error getting monitoring data:', error);
      throw error;
    }
  }

  /**
   * Check server health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking server health:', error);
      throw error;
    }
  }
}

export default new MarketDataApiService();

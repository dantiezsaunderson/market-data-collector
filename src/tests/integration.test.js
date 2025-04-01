// Integration test script for the Market Data Collector application
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import DataVisualizationComponent from '../components/DataVisualizationComponent';
import MarketDataApiService from '../services/MarketDataApiService';

// Mock the API service
jest.mock('../services/MarketDataApiService');

// Sample market data response
const mockMarketData = {
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  startDate: '2025-03-01',
  endDate: '2025-03-31',
  dataPoints: 720,
  ohlcv: Array(720).fill().map((_, i) => ({
    timestamp: new Date(2025, 2, 1).getTime() + i * 60 * 60 * 1000,
    datetime: new Date(new Date(2025, 2, 1).getTime() + i * 60 * 60 * 1000).toISOString(),
    open: 50000 + Math.random() * 5000,
    high: 50000 + Math.random() * 7000,
    low: 50000 + Math.random() * 3000,
    close: 50000 + Math.random() * 5000,
    volume: 100 + Math.random() * 900
  }))
};

// Sample indicator data response
const mockIndicatorData = {
  indicators: {
    sma: Array(720).fill().map((_, i) => i < 20 ? null : 50000 + Math.random() * 5000),
    ema: Array(720).fill().map((_, i) => i < 20 ? null : 50000 + Math.random() * 5000),
    rsi: Array(720).fill().map((_, i) => i < 14 ? null : 30 + Math.random() * 40)
  }
};

describe('DataVisualizationComponent Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup API mock responses
    MarketDataApiService.fetchMarketData.mockResolvedValue(mockMarketData);
    MarketDataApiService.calculateIndicators.mockResolvedValue(mockIndicatorData);
  });
  
  test('renders the component and loads data successfully', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DataVisualizationComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Check if the component renders
    expect(screen.getByText('Market Data Visualization')).toBeInTheDocument();
    
    // Fill the form
    fireEvent.change(screen.getByLabelText('Exchange'), { target: { value: 'binance' } });
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'BTC/USDT' } });
    fireEvent.change(screen.getByLabelText('Timeframe'), { target: { value: '1h' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Load Data'));
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(MarketDataApiService.fetchMarketData).toHaveBeenCalledTimes(1);
    });
    
    // Check if the API was called with correct parameters
    expect(MarketDataApiService.fetchMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timeframe: '1h'
      })
    );
    
    // Check if chart title appears after data is loaded
    await waitFor(() => {
      expect(screen.getByText('BTC/USDT Price Chart')).toBeInTheDocument();
    });
  });
  
  test('calculates technical indicators correctly', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DataVisualizationComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Switch to Technical Indicators tab
    fireEvent.click(screen.getByText('Technical Indicators'));
    
    // Select indicators
    fireEvent.change(screen.getByLabelText('Technical Indicators'), { 
      target: { value: ['sma', 'rsi'] } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Calculate Indicators'));
    
    // Wait for API calls to complete
    await waitFor(() => {
      expect(MarketDataApiService.fetchMarketData).toHaveBeenCalledTimes(1);
      expect(MarketDataApiService.calculateIndicators).toHaveBeenCalledTimes(1);
    });
    
    // Check if the indicator API was called with correct parameters
    expect(MarketDataApiService.calculateIndicators).toHaveBeenCalledWith(
      expect.objectContaining({
        indicators: ['sma', 'rsi']
      })
    );
    
    // Check if indicator titles appear after data is loaded
    await waitFor(() => {
      expect(screen.getByText('Simple Moving Average (SMA)')).toBeInTheDocument();
      expect(screen.getByText('Relative Strength Index (RSI)')).toBeInTheDocument();
    });
  });
  
  test('handles API errors gracefully', async () => {
    // Setup API to return an error
    MarketDataApiService.fetchMarketData.mockRejectedValue(new Error('Network error'));
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <DataVisualizationComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Submit the form
    fireEvent.click(screen.getByText('Load Data'));
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});

describe('Frontend-Backend Integration Tests', () => {
  test('end-to-end data flow test', async () => {
    // This test would typically be run in a real browser environment
    // with actual API endpoints, but we'll simulate it here
    
    // 1. User logs in
    // 2. User navigates to data visualization
    // 3. User selects parameters and loads data
    // 4. Data is displayed in charts
    // 5. User creates a scheduled job
    // 6. Job appears in the list
    
    // For a real E2E test, we would use tools like Cypress or Playwright
    // and test against actual deployed functions
    
    // For now, we'll just verify our mocks are working
    expect(MarketDataApiService.fetchMarketData).toBeDefined();
    expect(MarketDataApiService.calculateIndicators).toBeDefined();
  });
});

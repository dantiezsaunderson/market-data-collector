import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, subDays, subMonths } from 'date-fns';
import Chart from 'react-apexcharts';
import MarketDataApiService from '../services/MarketDataApiService';

// Helper function to format OHLCV data for candlestick chart
const formatCandlestickData = (data) => {
  if (!data || !data.length) return { series: [], timestamps: [] };
  
  const series = [{
    data: data.map(candle => ({
      x: new Date(candle.timestamp),
      y: [candle.open, candle.high, candle.low, candle.close]
    }))
  }];
  
  const timestamps = data.map(candle => candle.timestamp);
  
  return { series, timestamps };
};

// Helper function to format indicator data
const formatIndicatorData = (data, indicator, timestamps) => {
  if (!data || !data[indicator] || !timestamps) return [];
  
  return [{
    name: indicator.toUpperCase(),
    data: data[indicator].map((value, index) => ({
      x: new Date(timestamps[index]),
      y: value
    }))
  }];
};

// Helper function to format volume data
const formatVolumeData = (data, timestamps) => {
  if (!data || !data.length || !timestamps) return [];
  
  return [{
    name: 'Volume',
    data: data.map((candle, index) => ({
      x: new Date(timestamps[index]),
      y: candle.volume
    }))
  }];
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function DataVisualizationComponent() {
  // State for form inputs
  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedIndicators, setSelectedIndicators] = useState(['sma', 'ema']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // State for chart data
  const [marketData, setMarketData] = useState(null);
  const [candlestickData, setCandlestickData] = useState({ series: [], timestamps: [] });
  const [indicatorData, setIndicatorData] = useState({});
  const [volumeData, setVolumeData] = useState([]);
  
  // Chart options
  const candlestickOptions = {
    chart: {
      type: 'candlestick',
      height: 350,
      id: 'candles',
      toolbar: {
        autoSelected: 'pan',
        show: true
      },
      zoom: {
        enabled: true
      },
    },
    title: {
      text: `${symbol} Price Chart`,
      align: 'left'
    },
    xaxis: {
      type: 'datetime'
    },
    yaxis: {
      tooltip: {
        enabled: true
      }
    }
  };
  
  const indicatorOptions = {
    chart: {
      type: 'line',
      height: 160,
      toolbar: {
        show: false,
      }
    },
    title: {
      text: 'Technical Indicators',
      align: 'left'
    },
    stroke: {
      width: 2
    },
    xaxis: {
      type: 'datetime',
      labels: {
        show: false
      }
    },
    yaxis: {
      labels: {
        show: true
      }
    },
    tooltip: {
      shared: true
    },
    legend: {
      position: 'top'
    }
  };
  
  const volumeOptions = {
    chart: {
      type: 'bar',
      height: 160,
      brush: {
        enabled: true,
        target: 'candles'
      },
      selection: {
        enabled: true,
        xaxis: {
          min: startDate.getTime(),
          max: endDate.getTime()
        },
        fill: {
          color: '#ccc',
          opacity: 0.4
        },
        stroke: {
          color: '#0D47A1',
        }
      },
    },
    dataLabels: {
      enabled: false
    },
    title: {
      text: 'Volume',
      align: 'left'
    },
    xaxis: {
      type: 'datetime',
      labels: {
        show: false
      }
    },
    yaxis: {
      labels: {
        show: true
      }
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    
    try {
      // Format dates
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch market data
      const data = await MarketDataApiService.fetchMarketData({
        exchange,
        symbol,
        timeframe,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        includeOrderbook: false,
        includeTickers: false
      });
      
      setMarketData(data);
      
      // Format data for charts
      const { series, timestamps } = formatCandlestickData(data.ohlcv);
      setCandlestickData({ series, timestamps });
      
      // Format volume data
      setVolumeData(formatVolumeData(data.ohlcv, timestamps));
      
      // Calculate indicators
      if (selectedIndicators.length > 0) {
        const indicatorResult = await MarketDataApiService.calculateIndicators({
          data: data.ohlcv,
          indicators: selectedIndicators
        });
        
        setIndicatorData(indicatorResult.indicators);
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err.message || 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };
  
  // Preset time ranges
  const handlePresetRange = (range) => {
    const now = new Date();
    
    switch (range) {
      case '1d':
        setStartDate(subDays(now, 1));
        break;
      case '1w':
        setStartDate(subDays(now, 7));
        break;
      case '1m':
        setStartDate(subMonths(now, 1));
        break;
      case '3m':
        setStartDate(subMonths(now, 3));
        break;
      case '6m':
        setStartDate(subMonths(now, 6));
        break;
      case '1y':
        setStartDate(subMonths(now, 12));
        break;
      default:
        setStartDate(subMonths(now, 1));
    }
    
    setEndDate(now);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Market Data Visualization" />
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="visualization tabs">
                  <Tab label="Price Chart" />
                  <Tab label="Technical Indicators" />
                  <Tab label="Volume Profile" />
                  <Tab label="Correlation Matrix" />
                </Tabs>
              </Box>
              
              {/* Price Chart Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth>
                        <InputLabel id="exchange-label">Exchange</InputLabel>
                        <Select
                          labelId="exchange-label"
                          value={exchange}
                          label="Exchange"
                          onChange={(e) => setExchange(e.target.value)}
                        >
                          <MenuItem value="binance">Binance</MenuItem>
                          <MenuItem value="bybit">Bybit</MenuItem>
                          <MenuItem value="coinbase">Coinbase</MenuItem>
                          <MenuItem value="kraken">Kraken</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Symbol"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="BTC/USDT"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth>
                        <InputLabel id="timeframe-label">Timeframe</InputLabel>
                        <Select
                          labelId="timeframe-label"
                          value={timeframe}
                          label="Timeframe"
                          onChange={(e) => setTimeframe(e.target.value)}
                        >
                          <MenuItem value="1m">1 Minute</MenuItem>
                          <MenuItem value="5m">5 Minutes</MenuItem>
                          <MenuItem value="15m">15 Minutes</MenuItem>
                          <MenuItem value="30m">30 Minutes</MenuItem>
                          <MenuItem value="1h">1 Hour</MenuItem>
                          <MenuItem value="4h">4 Hours</MenuItem>
                          <MenuItem value="1d">1 Day</MenuItem>
                          <MenuItem value="1w">1 Week</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <DatePicker
                        label="End Date"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                        minDate={startDate}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Load Data'}
                      </Button>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('1d')}>1D</Button>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('1w')}>1W</Button>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('1m')}>1M</Button>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('3m')}>3M</Button>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('6m')}>6M</Button>
                    <Button size="small" variant="outlined" onClick={() => handlePresetRange('1y')}>1Y</Button>
                  </Box>
                </Box>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
                {marketData ? (
                  <Box>
                    <Box sx={{ height: 400 }}>
                      <Chart
                        options={candlestickOptions}
                        series={candlestickData.series}
                        type="candlestick"
                        height={350}
                      />
                    </Box>
                    
                    <Box sx={{ height: 200, mt: 2 }}>
                      <Chart
                        options={volumeOptions}
                        series={volumeData}
                        type="bar"
                        height={160}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <Typography variant="body1" color="text.secondary">
                      Select parameters and click "Load Data" to view the price chart
                    </Typography>
                  </Box>
                )}
              </TabPanel>
              
              {/* Technical Indicators Tab */}
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <FormControl fullWidth>
                        <InputLabel id="indicators-label">Technical Indicators</InputLabel>
                        <Select
                          labelId="indicators-label"
                          multiple
                          value={selectedIndicators}
                          label="Technical Indicators"
                          onChange={(e) => setSelectedIndicators(e.target.value)}
                        >
                          <MenuItem value="sma">Simple Moving Average (SMA)</MenuItem>
                          <MenuItem value="ema">Exponential Moving Average (EMA)</MenuItem>
                          <MenuItem value="rsi">Relative Strength Index (RSI)</MenuItem>
                          <MenuItem value="macd">MACD</MenuItem>
                          <MenuItem value="bollinger">Bollinger Bands</MenuItem>
                          <MenuItem value="atr">Average True Range (ATR)</MenuItem>
                          <MenuItem value="stochastic">Stochastic Oscillator</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit}
                        disabled={loading}
                        sx={{ height: '56px' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Calculate Indicators'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
                {marketData ? (
                  <Box>
                    <Box sx={{ height: 400 }}>
                      <Chart
                        options={candlestickOptions}
                        series={candlestickData.series}
                        type="candlestick"
                        height={350}
                      />
                    </Box>
                    
                    {selectedIndicators.includes('sma') && indicatorData.sma && (
                      <Box sx={{ height: 200, mt: 2 }}>
                        <Chart
                          options={{
                            ...indicatorOptions,
                            title: { text: 'Simple Moving Average (SMA)', align: 'left' }
                          }}
                          series={formatIndicatorData(indicatorData, 'sma', candlestickData.timestamps)}
                          type="line"
                          height={160}
                        />
                      </Box>
                    )}
                    
                    {selectedIndicators.includes('ema') && indicatorData.ema && (
                      <Box sx={{ height: 200, mt: 2 }}>
                        <Chart
                          options={{
                            ...indicatorOptions,
                            title: { text: 'Exponential Moving Average (EMA)', align: 'left' }
                          }}
                          series={formatIndicatorData(indicatorData, 'ema', candlestickData.timestamps)}
                          type="line"
                          height={160}
                        />
                      </Box>
                    )}
                    
                    {selectedIndicators.includes('rsi') && indicatorData.rsi && (
                      <Box sx={{ height: 200, mt: 2 }}>
                        <Chart
                          options={{
                            ...indicatorOptions,
                            title: { text: 'Relative Strength Index (RSI)', align: 'left' },
                            yaxis: {
                              min: 0,
                              max: 100,
                              tickAmount: 5
                            }
                          }}
                          series={formatIndicatorData(indicatorData, 'rsi', candlestickData.timestamps)}
                          type="line"
                          height={160}
                        />
                      </Box>
                    )}
                    
                    {/* Add more indicators as needed */}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <Typography variant="body1" color="text.secondary">
                      Select parameters and click "Calculate Indicators" to view technical indicators
                    </Typography>
                  </Box>
                )}
              </TabPanel>
              
              {/* Volume Profile Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <Typography variant="body1" color="text.secondary">
                    Volume Profile analysis will be available in the next update
                  </Typography>
                </Box>
              </TabPanel>
              
              {/* Correlation Matrix Tab */}
              <TabPanel value={tabValue} index={3}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <Typography variant="body1" color="text.secondary">
                    Correlation Matrix analysis will be available in the next update
                  </Typography>
                </Box>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
}

export default DataVisualizationComponent;

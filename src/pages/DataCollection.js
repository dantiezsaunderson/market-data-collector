import React, { useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  TextField, 
  MenuItem, 
  Button, 
  FormControl, 
  FormControlLabel, 
  Checkbox,
  Divider,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';

const exchanges = [
  { value: 'binance', label: 'Binance' },
  { value: 'bybit', label: 'Bybit' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'kraken', label: 'Kraken' },
];

const timeframes = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

const popularSymbols = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
  { value: 'BNB/USDT', label: 'BNB/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'ADA/USDT', label: 'ADA/USDT' },
  { value: 'DOGE/USDT', label: 'DOGE/USDT' },
  { value: 'MATIC/USDT', label: 'MATIC/USDT' },
];

const steps = ['Configure Data Source', 'Set Parameters', 'Schedule & Run'];

function DataCollection() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    exchange: 'binance',
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    includeOrderbook: false,
    includeTickers: false,
    cleanData: true,
    addIndicators: true,
    calculateReturns: true,
    schedule: false,
    scheduleFrequency: 'hourly',
    scheduleTime: new Date(),
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setFormData({
      ...formData,
      [name]: event.target.type === 'checkbox' ? checked : value,
    });
  };

  const handleDateChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleMultiSelectChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    // Here you would typically call an API to start the data collection
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Data Collection" />
            <CardContent>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {submitted ? (
                <Box sx={{ mt: 4, mb: 2 }}>
                  <Alert severity="success">
                    Data collection job has been submitted successfully!
                  </Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button onClick={() => {
                      setSubmitted(false);
                      setActiveStep(0);
                    }}>
                      Create Another Job
                    </Button>
                  </Box>
                </Box>
              ) : (
                <form onSubmit={handleSubmit}>
                  {activeStep === 0 && (
                    <Box sx={{ mt: 4, mb: 2 }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            fullWidth
                            label="Exchange"
                            name="exchange"
                            value={formData.exchange}
                            onChange={handleChange}
                            required
                          >
                            {exchanges.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            fullWidth
                            label="Symbols"
                            name="symbols"
                            value={formData.symbols}
                            onChange={handleMultiSelectChange}
                            required
                            SelectProps={{
                              multiple: true,
                            }}
                          >
                            {popularSymbols.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            fullWidth
                            label="Timeframes"
                            name="timeframes"
                            value={formData.timeframes}
                            onChange={handleMultiSelectChange}
                            required
                            SelectProps={{
                              multiple: true,
                            }}
                          >
                            {timeframes.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {activeStep === 1 && (
                    <Box sx={{ mt: 4, mb: 2 }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <DateTimePicker
                            label="Start Date"
                            value={formData.startDate}
                            onChange={(newValue) => handleDateChange('startDate', newValue)}
                            slotProps={{ textField: { fullWidth: true } }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <DateTimePicker
                            label="End Date"
                            value={formData.endDate}
                            onChange={(newValue) => handleDateChange('endDate', newValue)}
                            slotProps={{ textField: { fullWidth: true } }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" gutterBottom>
                            Additional Data
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.includeOrderbook}
                                onChange={handleChange}
                                name="includeOrderbook"
                              />
                            }
                            label="Include Order Book Data"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.includeTickers}
                                onChange={handleChange}
                                name="includeTickers"
                              />
                            }
                            label="Include Ticker Data"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" gutterBottom>
                            Processing Options
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.cleanData}
                                onChange={handleChange}
                                name="cleanData"
                              />
                            }
                            label="Clean Data"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.addIndicators}
                                onChange={handleChange}
                                name="addIndicators"
                              />
                            }
                            label="Add Technical Indicators"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.calculateReturns}
                                onChange={handleChange}
                                name="calculateReturns"
                              />
                            }
                            label="Calculate Returns"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {activeStep === 2 && (
                    <Box sx={{ mt: 4, mb: 2 }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.schedule}
                                onChange={handleChange}
                                name="schedule"
                              />
                            }
                            label="Schedule this job to run periodically"
                          />
                        </Grid>
                        {formData.schedule && (
                          <>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                fullWidth
                                label="Frequency"
                                name="scheduleFrequency"
                                value={formData.scheduleFrequency}
                                onChange={handleChange}
                              >
                                <MenuItem value="hourly">Hourly</MenuItem>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <DateTimePicker
                                label="First Run Time"
                                value={formData.scheduleTime}
                                onChange={(newValue) => handleDateChange('scheduleTime', newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                              />
                            </Grid>
                          </>
                        )}
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" gutterBottom>
                            Job Summary
                          </Typography>
                          <Typography variant="body2">
                            Exchange: {exchanges.find(e => e.value === formData.exchange)?.label}
                          </Typography>
                          <Typography variant="body2">
                            Symbols: {formData.symbols.join(', ')}
                          </Typography>
                          <Typography variant="body2">
                            Timeframes: {formData.timeframes.join(', ')}
                          </Typography>
                          <Typography variant="body2">
                            Date Range: {formData.startDate.toLocaleDateString()} to {formData.endDate.toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2">
                            Additional Data: {formData.includeOrderbook ? 'Order Book, ' : ''}{formData.includeTickers ? 'Tickers' : ''}
                            {!formData.includeOrderbook && !formData.includeTickers && 'None'}
                          </Typography>
                          <Typography variant="body2">
                            Processing: {formData.cleanData ? 'Clean Data, ' : ''}{formData.addIndicators ? 'Technical Indicators, ' : ''}
                            {formData.calculateReturns ? 'Returns' : ''}
                          </Typography>
                          {formData.schedule && (
                            <Typography variant="body2">
                              Schedule: {formData.scheduleFrequency} starting at {formData.scheduleTime.toLocaleString()}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    {activeStep > 0 && (
                      <Button onClick={handleBack} sx={{ mr: 1 }}>
                        Back
                      </Button>
                    )}
                    {activeStep < steps.length - 1 ? (
                      <Button variant="contained" onClick={handleNext}>
                        Next
                      </Button>
                    ) : (
                      <>
                        {formData.schedule ? (
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={<ScheduleIcon />}
                            color="primary"
                          >
                            Schedule Job
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            color="primary"
                          >
                            Run Now
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          sx={{ ml: 1 }}
                        >
                          Save Template
                        </Button>
                      </>
                    )}
                  </Box>
                </form>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
}

export default DataCollection;

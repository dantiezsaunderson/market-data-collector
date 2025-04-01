import React, { useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`management-tabpanel-${index}`}
      aria-labelledby={`management-tab-${index}`}
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

function a11yProps(index) {
  return {
    id: `management-tab-${index}`,
    'aria-controls': `management-tabpanel-${index}`,
  };
}

// Sample data for demonstration
const sampleDatasets = [
  { 
    id: 'ds-001', 
    name: 'BTC/USDT Hourly Data', 
    symbol: 'BTC/USDT', 
    timeframe: '1h', 
    startDate: '2025-01-01', 
    endDate: '2025-03-31', 
    records: 2160,
    size: '4.2 MB',
    format: 'parquet',
    lastUpdated: '2025-03-30',
    status: 'complete'
  },
  { 
    id: 'ds-002', 
    name: 'ETH/USDT Daily Data', 
    symbol: 'ETH/USDT', 
    timeframe: '1d', 
    startDate: '2024-01-01', 
    endDate: '2025-03-31', 
    records: 456,
    size: '0.9 MB',
    format: 'parquet',
    lastUpdated: '2025-03-30',
    status: 'complete'
  },
  { 
    id: 'ds-003', 
    name: 'Multi-Symbol 15m Data', 
    symbol: 'Multiple', 
    timeframe: '15m', 
    startDate: '2025-03-01', 
    endDate: '2025-03-31', 
    records: 8640,
    size: '16.8 MB',
    format: 'hdf5',
    lastUpdated: '2025-03-31',
    status: 'complete'
  },
  { 
    id: 'ds-004', 
    name: 'SOL/USDT Order Book', 
    symbol: 'SOL/USDT', 
    timeframe: 'snapshot', 
    startDate: '2025-03-30', 
    endDate: '2025-03-31', 
    records: 1440,
    size: '28.5 MB',
    format: 'parquet',
    lastUpdated: '2025-03-31',
    status: 'complete'
  },
  { 
    id: 'ds-005', 
    name: 'BNB/USDT Hourly Data', 
    symbol: 'BNB/USDT', 
    timeframe: '1h', 
    startDate: '2025-01-01', 
    endDate: '2025-03-31', 
    records: 2160,
    size: '4.1 MB',
    format: 'parquet',
    lastUpdated: '2025-03-30',
    status: 'processing'
  },
];

const sampleJobs = [
  {
    id: 'job-001',
    name: 'Daily OHLCV Collection',
    type: 'collection',
    schedule: 'Daily at 00:00',
    lastRun: '2025-03-31 00:00',
    nextRun: '2025-04-01 00:00',
    status: 'active',
    targets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']
  },
  {
    id: 'job-002',
    name: 'Hourly Order Book Snapshot',
    type: 'collection',
    schedule: 'Hourly',
    lastRun: '2025-03-31 15:00',
    nextRun: '2025-03-31 16:00',
    status: 'active',
    targets: ['BTC/USDT']
  },
  {
    id: 'job-003',
    name: 'Weekly Data Cleanup',
    type: 'maintenance',
    schedule: 'Weekly on Sunday',
    lastRun: '2025-03-30 01:00',
    nextRun: '2025-04-06 01:00',
    status: 'active',
    targets: ['All datasets']
  },
  {
    id: 'job-004',
    name: 'Monthly Correlation Analysis',
    type: 'analysis',
    schedule: 'Monthly on 1st',
    lastRun: '2025-03-01 02:00',
    nextRun: '2025-04-01 02:00',
    status: 'active',
    targets: ['Top 10 symbols']
  },
  {
    id: 'job-005',
    name: 'Indicator Calculation',
    type: 'processing',
    schedule: 'Daily at 01:00',
    lastRun: '2025-03-31 01:00',
    nextRun: '2025-04-01 01:00',
    status: 'paused',
    targets: ['All OHLCV datasets']
  }
];

function DataManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFormatFilterChange = (event) => {
    setFormatFilter(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    // Here you would delete the item
    console.log('Deleting item:', selectedItem);
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  // Filter datasets based on search term and filters
  const filteredDatasets = sampleDatasets.filter(dataset => {
    const matchesSearch = 
      dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFormat = formatFilter === 'all' || dataset.format === formatFilter;
    const matchesStatus = statusFilter === 'all' || dataset.status === statusFilter;
    
    return matchesSearch && matchesFormat && matchesStatus;
  });

  // Filter jobs based on search term
  const filteredJobs = sampleJobs.filter(job => 
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.targets.some(target => target.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Data Management" />
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="management tabs">
                <Tab label="Datasets" {...a11yProps(0)} />
                <Tab label="Scheduled Jobs" {...a11yProps(1)} />
                <Tab label="Storage" {...a11yProps(2)} />
              </Tabs>
            </Box>

            {/* Datasets Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    placeholder="Search datasets..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ mr: 2, width: 250 }}
                  />
                  
                  <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
                    <InputLabel id="format-filter-label">Format</InputLabel>
                    <Select
                      labelId="format-filter-label"
                      value={formatFilter}
                      label="Format"
                      onChange={handleFormatFilterChange}
                    >
                      <MenuItem value="all">All Formats</MenuItem>
                      <MenuItem value="parquet">Parquet</MenuItem>
                      <MenuItem value="hdf5">HDF5</MenuItem>
                      <MenuItem value="csv">CSV</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={statusFilter}
                      label="Status"
                      onChange={handleStatusFilterChange}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="complete">Complete</MenuItem>
                      <MenuItem value="processing">Processing</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Button variant="contained" color="primary">
                  Import Dataset
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="datasets table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Timeframe</TableCell>
                      <TableCell>Date Range</TableCell>
                      <TableCell>Records</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Format</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDatasets.map((dataset) => (
                      <TableRow key={dataset.id}>
                        <TableCell component="th" scope="row">
                          {dataset.name}
                        </TableCell>
                        <TableCell>{dataset.symbol}</TableCell>
                        <TableCell>{dataset.timeframe}</TableCell>
                        <TableCell>{`${dataset.startDate} to ${dataset.endDate}`}</TableCell>
                        <TableCell>{dataset.records.toLocaleString()}</TableCell>
                        <TableCell>{dataset.size}</TableCell>
                        <TableCell>
                          <Chip 
                            label={dataset.format.toUpperCase()} 
                            size="small"
                            color={dataset.format === 'parquet' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{dataset.lastUpdated}</TableCell>
                        <TableCell>
                          <Chip 
                            label={dataset.status} 
                            size="small"
                            color={
                              dataset.status === 'complete' ? 'success' : 
                              dataset.status === 'processing' ? 'info' : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" aria-label="view" onClick={() => console.log('View', dataset.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="download" onClick={() => console.log('Download', dataset.id)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="delete" onClick={() => handleDeleteClick(dataset)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Scheduled Jobs Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField
                  placeholder="Search jobs..."
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ width: 250 }}
                />
                
                <Button variant="contained" color="primary" onClick={() => console.log('Create new job')}>
                  Create New Job
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="scheduled jobs table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Last Run</TableCell>
                      <TableCell>Next Run</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Targets</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell component="th" scope="row">
                          {job.name}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.type} 
                            size="small"
                            color={
                              job.type === 'collection' ? 'primary' : 
                              job.type === 'processing' ? 'secondary' : 
                              job.type === 'analysis' ? 'info' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{job.schedule}</TableCell>
                        <TableCell>{job.lastRun}</TableCell>
                        <TableCell>{job.nextRun}</TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status} 
                            size="small"
                            color={job.status === 'active' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          {job.targets.length > 1 ? (
                            <Chip 
                              label={`${job.targets[0]} +${job.targets.length - 1}`} 
                              size="small"
                            />
                          ) : (
                            <Chip 
                              label={job.targets[0]} 
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" aria-label="view" onClick={() => console.log('View', job.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="delete" onClick={() => handleDeleteClick(job)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Storage Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Storage Usage" />
                    <CardContent>
                      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Storage usage chart will appear here
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body1">
                          Total Storage: <strong>54.5 MB</strong>
                        </Typography>
                        <Typography variant="body1">
                          Available Storage: <strong>10 GB</strong>
                        </Typography>
                        <Typography variant="body1">
                          Usage: <strong>0.5%</strong>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Storage by Format" />
                    <CardContent>
                      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Storage by format chart will appear here
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body1">
                          Parquet: <strong>37.7 MB</strong> (69.2%)
                        </Typography>
                        <Typography variant="body1">
                          HDF5: <strong>16.8 MB</strong> (30.8%)
                        </Typography>
                        <Typography variant="body1">
                          CSV: <strong>0 MB</strong> (0%)
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="Storage Management" 
                      action={
                        <Button variant="contained" color="primary">
                          Optimize Storage
                        </Button>
                      }
                    />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Button variant="outlined" fullWidth>
                            Export All Data
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Button variant="outlined" fullWidth>
                            Archive Old Data
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Button variant="outlined" fullWidth color="error">
                            Clear All Data
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </CardContent>
        </Card>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {selectedItem?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default DataManagement;

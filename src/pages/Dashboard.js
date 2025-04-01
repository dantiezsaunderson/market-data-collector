import React from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CardHeader, Button } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';
import StorageIcon from '@mui/icons-material/Storage';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNavigate } from 'react-router-dom';

// Placeholder component for a simple chart
const SimpleChart = () => (
  <Box
    sx={{
      height: 200,
      background: 'linear-gradient(45deg, rgba(66,66,66,1) 0%, rgba(33,33,33,1) 100%)',
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Chart visualization will appear here
    </Typography>
  </Box>
);

// Placeholder component for a status card
const StatusCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" component="div" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}22`,
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Placeholder component for a recent job card
const RecentJobCard = ({ title, time, status, symbol }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" component="div">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {symbol} • {time}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="body2"
            sx={{
              backgroundColor: 
                status === 'Completed' ? '#4caf5022' : 
                status === 'Running' ? '#2196f322' : 
                status === 'Failed' ? '#f4433622' : '#ff980022',
              color: 
                status === 'Completed' ? '#4caf50' : 
                status === 'Running' ? '#2196f3' : 
                status === 'Failed' ? '#f44336' : '#ff9800',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 'medium'
            }}
          >
            {status}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

function Dashboard() {
  const navigate = useNavigate();

  return (
    <Grid container spacing={3}>
      {/* Status Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <StatusCard 
          title="Data Collections" 
          value="24" 
          icon={<DownloadIcon sx={{ color: '#3f51b5' }} />} 
          color="#3f51b5" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatusCard 
          title="Stored Datasets" 
          value="156" 
          icon={<StorageIcon sx={{ color: '#f50057' }} />} 
          color="#f50057" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatusCard 
          title="Scheduled Jobs" 
          value="8" 
          icon={<ScheduleIcon sx={{ color: '#00bcd4' }} />} 
          color="#00bcd4" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatusCard 
          title="Data Points" 
          value="1.2M" 
          icon={<TrendingUpIcon sx={{ color: '#4caf50' }} />} 
          color="#4caf50" 
        />
      </Grid>

      {/* Market Overview */}
      <Grid item xs={12} md={8}>
        <Card sx={{ height: '100%' }}>
          <CardHeader 
            title="Market Overview" 
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/visualize')}
              >
                View Details
              </Button>
            } 
          />
          <CardContent>
            <SimpleChart />
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Jobs */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader 
            title="Recent Jobs" 
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/collect')}
              >
                New Job
              </Button>
            } 
          />
          <CardContent>
            <RecentJobCard 
              title="OHLCV Data Collection" 
              time="2 hours ago" 
              status="Completed" 
              symbol="BTC/USDT" 
            />
            <RecentJobCard 
              title="Order Book Snapshot" 
              time="1 hour ago" 
              status="Running" 
              symbol="ETH/USDT" 
            />
            <RecentJobCard 
              title="Technical Indicators" 
              time="3 hours ago" 
              status="Failed" 
              symbol="SOL/USDT" 
            />
            <RecentJobCard 
              title="Historical Data" 
              time="5 hours ago" 
              status="Completed" 
              symbol="Multiple" 
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Quick Actions" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<DownloadIcon />}
                  onClick={() => navigate('/collect')}
                >
                  Collect Data
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<TrendingUpIcon />}
                  onClick={() => navigate('/visualize')}
                >
                  Visualize Data
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<StorageIcon />}
                  onClick={() => navigate('/manage')}
                >
                  Manage Datasets
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<ScheduleIcon />}
                  onClick={() => navigate('/collect')}
                >
                  Schedule Job
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default Dashboard;

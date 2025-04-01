import React, { useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Divider,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import ApiIcon from '@mui/icons-material/Api';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import ScheduleIcon from '@mui/icons-material/Schedule';

function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    jobCompletion: true,
    jobFailure: true,
    datasetUpdates: false,
    systemAlerts: true
  });
  const [storageSettings, setStorageSettings] = useState({
    autoCleanup: true,
    compressionLevel: 'medium',
    retentionPeriod: 90
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleApiKeyChange = (event) => {
    setApiKey(event.target.value);
  };

  const handleApiSecretChange = (event) => {
    setApiSecret(event.target.value);
  };

  const handleNotificationChange = (event) => {
    setNotifications({
      ...notifications,
      [event.target.name]: event.target.checked
    });
  };

  const handleStorageSettingChange = (event) => {
    const { name, value, type, checked } = event.target;
    setStorageSettings({
      ...storageSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveSettings = () => {
    // Here you would save the settings to the backend
    console.log('Saving settings:', {
      apiKey,
      apiSecret,
      notifications,
      storageSettings
    });
    
    // Show success message
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <Grid container spacing={3}>
      {/* API Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="API Settings" 
            avatar={<ApiIcon />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure your exchange API credentials for data collection.
            </Typography>
            
            <TextField
              fullWidth
              label="API Key"
              variant="outlined"
              margin="normal"
              value={apiKey}
              onChange={handleApiKeyChange}
            />
            
            <TextField
              fullWidth
              label="API Secret"
              variant="outlined"
              margin="normal"
              type={showSecret ? "text" : "password"}
              value={apiSecret}
              onChange={handleApiSecretChange}
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={showSecret} 
                  onChange={(e) => setShowSecret(e.target.checked)} 
                  name="showSecret"
                />
              }
              label="Show Secret"
            />
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => console.log('Test API connection')}
              >
                Test Connection
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Notification Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="Notification Settings" 
            avatar={<NotificationsIcon />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure how and when you receive notifications.
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications.email} 
                  onChange={handleNotificationChange} 
                  name="email"
                />
              }
              label="Email Notifications"
            />
            
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Notification Events
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications.jobCompletion} 
                  onChange={handleNotificationChange} 
                  name="jobCompletion"
                />
              }
              label="Job Completion"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications.jobFailure} 
                  onChange={handleNotificationChange} 
                  name="jobFailure"
                />
              }
              label="Job Failure"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications.datasetUpdates} 
                  onChange={handleNotificationChange} 
                  name="datasetUpdates"
                />
              }
              label="Dataset Updates"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications.systemAlerts} 
                  onChange={handleNotificationChange} 
                  name="systemAlerts"
                />
              }
              label="System Alerts"
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Storage Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="Storage Settings" 
            avatar={<StorageIcon />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure how your data is stored and managed.
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={storageSettings.autoCleanup} 
                  onChange={handleStorageSettingChange} 
                  name="autoCleanup"
                />
              }
              label="Automatic Data Cleanup"
            />
            
            <FormControl fullWidth margin="normal">
              <TextField
                select
                label="Compression Level"
                name="compressionLevel"
                value={storageSettings.compressionLevel}
                onChange={handleStorageSettingChange}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </TextField>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <TextField
                label="Data Retention Period (days)"
                name="retentionPeriod"
                type="number"
                value={storageSettings.retentionPeriod}
                onChange={handleStorageSettingChange}
                InputProps={{ inputProps: { min: 1, max: 365 } }}
              />
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      {/* Security Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="Security Settings" 
            avatar={<SecurityIcon />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure security settings for your account.
            </Typography>
            
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              sx={{ mb: 2 }}
            >
              Change Password
            </Button>
            
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              sx={{ mb: 2 }}
            >
              Enable Two-Factor Authentication
            </Button>
            
            <Button 
              variant="outlined" 
              color="error" 
              fullWidth
            >
              Revoke All API Sessions
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Scheduled Jobs */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Scheduled Jobs Settings" 
            avatar={<ScheduleIcon />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure default settings for scheduled jobs.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Active Scheduled Jobs
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Daily OHLCV Collection" 
                        secondary="Daily at 00:00" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Hourly Order Book Snapshot" 
                        secondary="Hourly" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Weekly Data Cleanup" 
                        secondary="Weekly on Sunday" 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Default Job Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch 
                        defaultChecked 
                        name="retryFailedJobs"
                      />
                    }
                    label="Retry Failed Jobs"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        defaultChecked 
                        name="notifyOnCompletion"
                      />
                    }
                    label="Notify on Completion"
                  />
                  <FormControl fullWidth margin="normal">
                    <TextField
                      label="Max Retries"
                      type="number"
                      defaultValue={3}
                      InputProps={{ inputProps: { min: 0, max: 10 } }}
                    />
                  </FormControl>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Save Button */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {saveSuccess && (
            <Alert severity="success" sx={{ mr: 2 }}>
              Settings saved successfully!
            </Alert>
          )}
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={handleSaveSettings}
          >
            Save All Settings
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

export default Settings;

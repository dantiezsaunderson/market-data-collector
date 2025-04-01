// Monitoring and alerts setup for Market Data Collector application
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error('Error parsing Firebase service account:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Alert recipients
const alertRecipients = (process.env.ALERT_RECIPIENTS || '').split(',');

// Monitoring thresholds
const thresholds = {
  errorRate: parseInt(process.env.THRESHOLD_ERROR_RATE || '10'), // Errors per hour
  jobFailureRate: parseInt(process.env.THRESHOLD_JOB_FAILURE_RATE || '20'), // Percentage
  storageUsage: parseInt(process.env.THRESHOLD_STORAGE_USAGE || '80'), // Percentage
  responseTime: parseInt(process.env.THRESHOLD_RESPONSE_TIME || '2000') // Milliseconds
};

// Send alert email
async function sendAlertEmail(subject, message, priority = 'medium') {
  if (!alertRecipients.length) {
    console.warn('No alert recipients configured');
    return;
  }

  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: alertRecipients.join(','),
      subject: `[${priority.toUpperCase()}] Market Data Collector Alert: ${subject}`,
      html: `
        <h2>Market Data Collector Alert</h2>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Please check the application dashboard for more details.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Alert email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending alert email:', error);
  }
}

// Log monitoring function
async function monitorErrorLogs() {
  try {
    const db = admin.firestore();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Query error logs from the last hour
    const logsRef = db.collection('logs');
    const query = logsRef
      .where('level', '==', 'error')
      .where('timestamp', '>=', oneHourAgo.toISOString())
      .where('timestamp', '<=', now.toISOString());
    
    const snapshot = await query.get();
    const errorCount = snapshot.size;
    
    console.log(`Found ${errorCount} errors in the last hour`);
    
    // Check if error count exceeds threshold
    if (errorCount >= thresholds.errorRate) {
      await sendAlertEmail(
        'High Error Rate Detected',
        `Detected ${errorCount} errors in the last hour, which exceeds the threshold of ${thresholds.errorRate}.`,
        errorCount >= thresholds.errorRate * 2 ? 'high' : 'medium'
      );
    }
    
    return errorCount;
  } catch (error) {
    console.error('Error monitoring logs:', error);
    await sendAlertEmail(
      'Log Monitoring Failed',
      `Failed to monitor error logs: ${error.message}`,
      'high'
    );
  }
}

// Job monitoring function
async function monitorScheduledJobs() {
  try {
    const db = admin.firestore();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Query all active jobs
    const jobsRef = db.collection('scheduledJobs');
    const activeJobsQuery = jobsRef.where('status', '==', 'active');
    const activeJobsSnapshot = await activeJobsQuery.get();
    
    // Query job executions from the last 24 hours
    const jobExecutionsRef = db.collection('jobExecutions');
    const executionsQuery = jobExecutionsRef
      .where('timestamp', '>=', oneDayAgo.toISOString())
      .where('timestamp', '<=', now.toISOString());
    
    const executionsSnapshot = await executionsQuery.get();
    
    // Count successful and failed executions
    let successCount = 0;
    let failureCount = 0;
    
    executionsSnapshot.forEach(doc => {
      const execution = doc.data();
      if (execution.status === 'completed') {
        successCount++;
      } else if (execution.status === 'failed') {
        failureCount++;
      }
    });
    
    const totalExecutions = successCount + failureCount;
    const failureRate = totalExecutions > 0 ? (failureCount / totalExecutions) * 100 : 0;
    
    console.log(`Job executions in last 24h: ${totalExecutions} (${failureCount} failed, ${failureRate.toFixed(2)}% failure rate)`);
    
    // Check if failure rate exceeds threshold
    if (failureRate >= thresholds.jobFailureRate && totalExecutions >= 5) {
      await sendAlertEmail(
        'High Job Failure Rate',
        `Job failure rate is ${failureRate.toFixed(2)}% (${failureCount}/${totalExecutions}), which exceeds the threshold of ${thresholds.jobFailureRate}%.`,
        failureRate >= thresholds.jobFailureRate * 1.5 ? 'high' : 'medium'
      );
    }
    
    // Check for jobs that haven't run recently
    const activeJobs = [];
    activeJobsSnapshot.forEach(doc => {
      activeJobs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    for (const job of activeJobs) {
      // Skip jobs that don't have a last run time yet
      if (!job.lastRun) continue;
      
      const lastRunTime = new Date(job.lastRun.toDate ? job.lastRun.toDate() : job.lastRun);
      const timeSinceLastRun = now.getTime() - lastRunTime.getTime();
      
      // Calculate expected run interval based on schedule
      let expectedInterval;
      switch (job.schedule) {
        case 'hourly':
          expectedInterval = 60 * 60 * 1000; // 1 hour
          break;
        case 'daily':
          expectedInterval = 24 * 60 * 60 * 1000; // 24 hours
          break;
        case 'weekly':
          expectedInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
          break;
        case 'monthly':
          expectedInterval = 30 * 24 * 60 * 60 * 1000; // 30 days (approximate)
          break;
        default:
          expectedInterval = 24 * 60 * 60 * 1000; // Default to daily
      }
      
      // Add 50% buffer to expected interval
      const maxInterval = expectedInterval * 1.5;
      
      if (timeSinceLastRun > maxInterval) {
        await sendAlertEmail(
          'Job Not Running',
          `Job "${job.name}" (${job.id}) has not run since ${lastRunTime.toISOString()}, which is longer than expected for its ${job.schedule} schedule.`,
          'high'
        );
      }
    }
    
    return { totalExecutions, successCount, failureCount, failureRate };
  } catch (error) {
    console.error('Error monitoring scheduled jobs:', error);
    await sendAlertEmail(
      'Job Monitoring Failed',
      `Failed to monitor scheduled jobs: ${error.message}`,
      'high'
    );
  }
}

// Storage monitoring function
async function monitorStorage() {
  try {
    const db = admin.firestore();
    
    // Get storage statistics
    const statsRef = db.collection('system').doc('storageStats');
    const statsDoc = await statsRef.get();
    
    if (!statsDoc.exists) {
      console.log('No storage statistics found');
      return null;
    }
    
    const stats = statsDoc.data();
    const usedStorage = stats.totalSize || 0;
    const maxStorage = stats.maxSize || 1024 * 1024 * 1024; // Default to 1GB
    const usagePercentage = (usedStorage / maxStorage) * 100;
    
    console.log(`Storage usage: ${usagePercentage.toFixed(2)}% (${formatBytes(usedStorage)}/${formatBytes(maxStorage)})`);
    
    // Check if storage usage exceeds threshold
    if (usagePercentage >= thresholds.storageUsage) {
      await sendAlertEmail(
        'High Storage Usage',
        `Storage usage is at ${usagePercentage.toFixed(2)}% (${formatBytes(usedStorage)}/${formatBytes(maxStorage)}), which exceeds the threshold of ${thresholds.storageUsage}%.`,
        usagePercentage >= 95 ? 'high' : 'medium'
      );
    }
    
    return { usedStorage, maxStorage, usagePercentage };
  } catch (error) {
    console.error('Error monitoring storage:', error);
    await sendAlertEmail(
      'Storage Monitoring Failed',
      `Failed to monitor storage: ${error.message}`,
      'high'
    );
  }
}

// API performance monitoring function
async function monitorApiPerformance() {
  try {
    const db = admin.firestore();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Query API performance logs from the last 24 hours
    const logsRef = db.collection('apiLogs');
    const query = logsRef
      .where('timestamp', '>=', oneDayAgo.toISOString())
      .where('timestamp', '<=', now.toISOString());
    
    const snapshot = await query.get();
    
    // Calculate average response time
    let totalResponseTime = 0;
    let count = 0;
    let slowRequests = 0;
    
    snapshot.forEach(doc => {
      const log = doc.data();
      if (log.responseTime) {
        totalResponseTime += log.responseTime;
        count++;
        
        if (log.responseTime > thresholds.responseTime) {
          slowRequests++;
        }
      }
    });
    
    const averageResponseTime = count > 0 ? totalResponseTime / count : 0;
    const slowRequestPercentage = count > 0 ? (slowRequests / count) * 100 : 0;
    
    console.log(`API performance: ${count} requests, avg ${averageResponseTime.toFixed(2)}ms, ${slowRequestPercentage.toFixed(2)}% slow requests`);
    
    // Check if average response time exceeds threshold
    if (averageResponseTime > thresholds.responseTime && count >= 10) {
      await sendAlertEmail(
        'Slow API Response Time',
        `Average API response time is ${averageResponseTime.toFixed(2)}ms, which exceeds the threshold of ${thresholds.responseTime}ms. ${slowRequests} out of ${count} requests were slow.`,
        averageResponseTime > thresholds.responseTime * 2 ? 'high' : 'medium'
      );
    }
    
    return { count, averageResponseTime, slowRequests, slowRequestPercentage };
  } catch (error) {
    console.error('Error monitoring API performance:', error);
    await sendAlertEmail(
      'API Monitoring Failed',
      `Failed to monitor API performance: ${error.message}`,
      'high'
    );
  }
}

// System health check function
async function checkSystemHealth() {
  try {
    const db = admin.firestore();
    
    // Check if system is online
    const healthRef = db.collection('system').doc('health');
    const healthDoc = await healthRef.get();
    
    if (!healthDoc.exists) {
      console.log('No system health document found');
      return null;
    }
    
    const health = healthDoc.data();
    const lastHeartbeat = health.lastHeartbeat ? new Date(health.lastHeartbeat.toDate ? health.lastHeartbeat.toDate() : health.lastHeartbeat) : null;
    
    if (!lastHeartbeat) {
      console.log('No heartbeat data found');
      return null;
    }
    
    const now = new Date();
    const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
    const maxHeartbeatInterval = 5 * 60 * 1000; // 5 minutes
    
    console.log(`Last heartbeat: ${lastHeartbeat.toISOString()} (${Math.floor(timeSinceHeartbeat / 1000)}s ago)`);
    
    // Check if heartbeat is too old
    if (timeSinceHeartbeat > maxHeartbeatInterval) {
      await sendAlertEmail(
        'System Heartbeat Missing',
        `No system heartbeat detected in the last ${Math.floor(timeSinceHeartbeat / 1000)} seconds. The system may be offline.`,
        'high'
      );
      return { status: 'offline', lastHeartbeat };
    }
    
    return { status: 'online', lastHeartbeat };
  } catch (error) {
    console.error('Error checking system health:', error);
    await sendAlertEmail(
      'Health Check Failed',
      `Failed to check system health: ${error.message}`,
      'high'
    );
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Schedule monitoring tasks
function scheduleMonitoringTasks() {
  // Check error logs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running error log monitoring...');
    await monitorErrorLogs();
  });
  
  // Check scheduled jobs every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled job monitoring...');
    await monitorScheduledJobs();
  });
  
  // Check storage usage every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running storage monitoring...');
    await monitorStorage();
  });
  
  // Check API performance every hour
  cron.schedule('30 * * * *', async () => {
    console.log('Running API performance monitoring...');
    await monitorApiPerformance();
  });
  
  // Check system health every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running system health check...');
    await checkSystemHealth();
  });
  
  // Send daily summary report
  cron.schedule('0 8 * * *', async () => {
    console.log('Generating daily summary report...');
    await generateDailySummary();
  });
  
  console.log('Monitoring tasks scheduled');
}

// Generate daily summary report
async function generateDailySummary() {
  try {
    const errorStats = await monitorErrorLogs();
    const jobStats = await monitorScheduledJobs();
    const storageStats = await monitorStorage();
    const apiStats = await monitorApiPerformance();
    const healthStatus = await checkSystemHealth();
    
    const summaryHtml = `
      <h2>Market Data Collector - Daily Summary Report</h2>
      <p><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
      
      <h3>System Status</h3>
      <p><strong>Status:</strong> ${healthStatus?.status || 'Unknown'}</p>
      <p><strong>Last Heartbeat:</strong> ${healthStatus?.lastHeartbeat?.toISOString() || 'Unknown'}</p>
      
      <h3>Error Statistics (Last Hour)</h3>
      <p><strong>Error Count:</strong> ${errorStats || 'Unknown'}</p>
      
      <h3>Job Statistics (Last 24 Hours)</h3>
      <p><strong>Total Executions:</strong> ${jobStats?.totalExecutions || 'Unknown'}</p>
      <p><strong>Success Rate:</strong> ${jobStats ? (100 - jobStats.failureRate).toFixed(2) + '%' : 'Unknown'}</p>
      <p><strong>Failed Jobs:</strong> ${jobStats?.failureCount || 'Unknown'}</p>
      
      <h3>Storage Statistics</h3>
      <p><strong>Usage:</strong> ${storageStats ? storageStats.usagePercentage.toFixed(2) + '%' : 'Unknown'}</p>
      <p><strong>Used Space:</strong> ${storageStats ? formatBytes(storageStats.usedStorage) : 'Unknown'}</p>
      <p><strong>Total Space:</strong> ${storageStats ? formatBytes(storageStats.maxStorage) : 'Unknown'}</p>
      
      <h3>API Performance (Last 24 Hours)</h3>
      <p><strong>Request Count:</strong> ${apiStats?.count || 'Unknown'}</p>
      <p><strong>Average Response Time:</strong> ${apiStats ? apiStats.averageResponseTime.toFixed(2) + 'ms' : 'Unknown'}</p>
      <p><strong>Slow Requests:</strong> ${apiStats ? apiStats.slowRequestPercentage.toFixed(2) + '%' : 'Unknown'}</p>
      
      <p>For more details, please check the application dashboard.</p>
    `;
    
    await sendAlertEmail('Daily Summary Report', summaryHtml, 'low');
  } catch (error) {
    console.error('Error generating daily summary:', error);
    await sendAlertEmail(
      'Daily Summary Generation Failed',
      `Failed to generate daily summary report: ${error.message}`,
      'medium'
    );
  }
}

// Main function
async function main() {
  try {
    // Verify email configuration
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email configuration is incomplete. Alerts will not be sent.');
    } else {
      // Test email connection
      await transporter.verify();
      console.log('Email connection verified');
      
      // Send startup notification
      await sendAlertEmail(
        'Monitoring System Started',
        `The Market Data Collector monitoring system has been started at ${new Date().toISOString()}.`,
        'low'
      );
    }
    
    // Schedule monitoring tasks
    scheduleMonitoringTasks();
    
    // Run initial checks
    console.log('Running initial system checks...');
    await checkSystemHealth();
    await monitorErrorLogs();
    await monitorStorage();
    
    console.log('Monitoring system initialized successfully');
  } catch (error) {
    console.error('Error initializing monitoring system:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}

module.exports = {
  monitorErrorLogs,
  monitorScheduledJobs,
  monitorStorage,
  monitorApiPerformance,
  checkSystemHealth,
  sendAlertEmail,
  generateDailySummary
};

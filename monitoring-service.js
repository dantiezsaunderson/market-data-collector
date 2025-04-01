// monitoring-service.js - Enhanced monitoring service for Docker deployment
const os = require('os');
const fs = require('fs');
const { promisify } = require('util');
const axios = require('axios');
const nodemailer = require('nodemailer');
const Redis = require('redis');

// Promisify fs functions
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = Redis.createClient({
  url: redisUrl
});

redisClient.on('error', (err) => {
  console.error('Redis error in monitoring service:', err);
});

// Configure email transporter if email settings are provided
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Alert thresholds
const thresholds = {
  cpu: parseInt(process.env.ALERT_THRESHOLD_CPU || '80', 10),
  memory: parseInt(process.env.ALERT_THRESHOLD_MEMORY || '80', 10),
  disk: parseInt(process.env.ALERT_THRESHOLD_DISK || '80', 10),
  errorRate: parseInt(process.env.ALERT_THRESHOLD_ERROR_RATE || '5', 10)
};

// Monitoring class
class MonitoringService {
  constructor() {
    this.lastAlertTime = {};
    this.alertCooldown = 15 * 60 * 1000; // 15 minutes
    this.errorLogs = [];
    this.maxErrorLogs = 100;
  }

  // Get system metrics
  async getSystemMetrics() {
    try {
      // CPU usage
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg()[0];
      const cpuUsage = (loadAvg / cpuCount) * 100;

      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

      // Disk usage (for the /app directory)
      let diskUsage = 0;
      try {
        const diskStats = await stat('/app');
        // This is a simplified approach - in a real environment, you'd use a more robust method
        // like the 'diskusage' npm package or a shell command
        diskUsage = 70; // Placeholder value, would be calculated from actual disk stats
      } catch (error) {
        console.error('Error getting disk usage:', error);
      }

      // Uptime
      const uptime = os.uptime();

      return {
        cpu: {
          usage: cpuUsage.toFixed(2),
          cores: cpuCount,
          loadAverage: loadAvg.toFixed(2),
          status: cpuUsage > thresholds.cpu ? 'warning' : 'normal'
        },
        memory: {
          total: (totalMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          free: (freeMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          usage: memoryUsage.toFixed(2),
          status: memoryUsage > thresholds.memory ? 'warning' : 'normal'
        },
        disk: {
          usage: diskUsage.toFixed(2),
          status: diskUsage > thresholds.disk ? 'warning' : 'normal'
        },
        system: {
          platform: os.platform(),
          release: os.release(),
          hostname: os.hostname(),
          uptime: this.formatUptime(uptime)
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  // Get application metrics
  async getApplicationMetrics() {
    try {
      // Get Redis metrics
      let redisInfo = { status: 'disconnected' };
      try {
        const getAsync = promisify(redisClient.get).bind(redisClient);
        const pingResult = await getAsync('ping');
        redisInfo = {
          status: 'connected',
          ping: pingResult
        };
      } catch (error) {
        console.error('Error getting Redis info:', error);
      }

      // Get error rate
      const errorRate = await this.getErrorRate();

      return {
        redis: redisInfo,
        errors: {
          rate: errorRate,
          status: errorRate > thresholds.errorRate ? 'warning' : 'normal',
          recent: this.errorLogs.slice(-5) // Last 5 errors
        },
        jobs: await this.getJobMetrics(),
        api: await this.getApiMetrics()
      };
    } catch (error) {
      console.error('Error getting application metrics:', error);
      throw error;
    }
  }

  // Get job metrics from Redis
  async getJobMetrics() {
    try {
      // This would be implemented with actual Redis queries to Bull queues
      // For now, returning placeholder data
      return {
        dataCollection: {
          completed: 120,
          failed: 2,
          waiting: 1,
          status: 'normal'
        },
        monitoring: {
          completed: 480,
          failed: 0,
          waiting: 0,
          status: 'normal'
        }
      };
    } catch (error) {
      console.error('Error getting job metrics:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  // Get API metrics
  async getApiMetrics() {
    try {
      // This would be implemented with actual API metrics tracking
      // For now, returning placeholder data
      return {
        requests: {
          total: 1250,
          success: 1240,
          failed: 10,
          rate: 0.8 // requests per second
        },
        latency: {
          average: 120, // ms
          p95: 250, // ms
          p99: 450 // ms
        },
        status: 'normal'
      };
    } catch (error) {
      console.error('Error getting API metrics:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  // Get error rate
  async getErrorRate() {
    // This would be implemented with actual error tracking
    // For now, returning placeholder data
    return 2.5; // percentage
  }

  // Log an error
  logError(error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN'
    };

    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs.shift(); // Remove oldest error
    }

    // Check if we need to send an alert
    this.checkErrorAlert(errorLog);

    return errorLog;
  }

  // Check if we need to send an error alert
  async checkErrorAlert(errorLog) {
    const errorRate = await this.getErrorRate();
    if (errorRate > thresholds.errorRate) {
      const alertKey = 'error-rate';
      const now = Date.now();
      
      // Check if we're in cooldown period
      if (!this.lastAlertTime[alertKey] || (now - this.lastAlertTime[alertKey]) > this.alertCooldown) {
        this.lastAlertTime[alertKey] = now;
        this.sendAlert('Error Rate Alert', `Error rate (${errorRate}%) exceeds threshold (${thresholds.errorRate}%)`, {
          errorRate,
          threshold: thresholds.errorRate,
          recentErrors: this.errorLogs.slice(-5)
        });
      }
    }
  }

  // Check system metrics and send alerts if needed
  async checkSystemAlerts() {
    const metrics = await this.getSystemMetrics();
    const now = Date.now();

    // Check CPU
    if (parseFloat(metrics.cpu.usage) > thresholds.cpu) {
      const alertKey = 'cpu';
      if (!this.lastAlertTime[alertKey] || (now - this.lastAlertTime[alertKey]) > this.alertCooldown) {
        this.lastAlertTime[alertKey] = now;
        this.sendAlert('CPU Usage Alert', `CPU usage (${metrics.cpu.usage}%) exceeds threshold (${thresholds.cpu}%)`, metrics.cpu);
      }
    }

    // Check Memory
    if (parseFloat(metrics.memory.usage) > thresholds.memory) {
      const alertKey = 'memory';
      if (!this.lastAlertTime[alertKey] || (now - this.lastAlertTime[alertKey]) > this.alertCooldown) {
        this.lastAlertTime[alertKey] = now;
        this.sendAlert('Memory Usage Alert', `Memory usage (${metrics.memory.usage}%) exceeds threshold (${thresholds.memory}%)`, metrics.memory);
      }
    }

    // Check Disk
    if (parseFloat(metrics.disk.usage) > thresholds.disk) {
      const alertKey = 'disk';
      if (!this.lastAlertTime[alertKey] || (now - this.lastAlertTime[alertKey]) > this.alertCooldown) {
        this.lastAlertTime[alertKey] = now;
        this.sendAlert('Disk Usage Alert', `Disk usage (${metrics.disk.usage}%) exceeds threshold (${thresholds.disk}%)`, metrics.disk);
      }
    }
  }

  // Send an alert
  async sendAlert(subject, message, data) {
    console.warn(`ALERT: ${subject} - ${message}`);
    console.warn('Alert data:', JSON.stringify(data, null, 2));

    // Send email alert if configured
    if (emailTransporter && process.env.ALERT_RECIPIENTS) {
      try {
        const recipients = process.env.ALERT_RECIPIENTS.split(',');
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: recipients.join(','),
          subject: `[Market Data Collector] ${subject}`,
          text: `${message}\n\nTimestamp: ${new Date().toISOString()}\n\nDetails:\n${JSON.stringify(data, null, 2)}`,
          html: `
            <h2>${subject}</h2>
            <p>${message}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <h3>Details:</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`Alert email sent to ${recipients.join(', ')}`);
      } catch (error) {
        console.error('Error sending alert email:', error);
      }
    }

    // Store alert in Redis for dashboard display
    try {
      const alert = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        subject,
        message,
        data
      };

      const setAsync = promisify(redisClient.set).bind(redisClient);
      const lpushAsync = promisify(redisClient.lpush).bind(redisClient);
      const ltrimAsync = promisify(redisClient.ltrim).bind(redisClient);

      // Store the alert
      await setAsync(`alert:${alert.id}`, JSON.stringify(alert));
      
      // Add to recent alerts list
      await lpushAsync('recent_alerts', alert.id);
      
      // Keep only the 50 most recent alerts
      await ltrimAsync('recent_alerts', 0, 49);
    } catch (error) {
      console.error('Error storing alert in Redis:', error);
    }
  }

  // Format uptime in a human-readable format
  formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  // Get all monitoring data
  async getAllMetrics() {
    try {
      const systemMetrics = await this.getSystemMetrics();
      const appMetrics = await this.getApplicationMetrics();

      // Determine overall status
      const statuses = [
        systemMetrics.cpu.status,
        systemMetrics.memory.status,
        systemMetrics.disk.status,
        appMetrics.errors.status
      ];

      let overallStatus = 'normal';
      if (statuses.includes('critical')) {
        overallStatus = 'critical';
      } else if (statuses.includes('warning')) {
        overallStatus = 'warning';
      }

      return {
        timestamp: new Date().toISOString(),
        status: overallStatus,
        system: systemMetrics,
        application: appMetrics
      };
    } catch (error) {
      console.error('Error getting all metrics:', error);
      throw error;
    }
  }
}

module.exports = new MonitoringService();

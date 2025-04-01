// Error handling and logging utilities for the Market Data Collector application
import { toast } from 'react-toastify';

// Error severity levels
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  API: 'api',
  AUTH: 'authentication',
  DATA: 'data_processing',
  UI: 'user_interface',
  STORAGE: 'storage',
  NETWORK: 'network',
  UNKNOWN: 'unknown'
};

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {string} options.category - Error category
   * @param {string} options.severity - Error severity
   * @param {Error} options.originalError - Original error that caused this error
   * @param {Object} options.context - Additional context information
   */
  constructor(message, { category = ErrorCategory.UNKNOWN, severity = ErrorSeverity.ERROR, originalError = null, context = {} } = {}) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.severity = severity;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Get error details as an object
   * @returns {Object} Error details
   */
  toObject() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Logger class for application logging
 */
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Maximum number of logs to keep in memory
    this.listeners = [];
    
    // Configure remote logging if available
    this.remoteLoggingEnabled = process.env.REACT_APP_REMOTE_LOGGING_ENABLED === 'true';
    this.remoteLoggingEndpoint = process.env.REACT_APP_REMOTE_LOGGING_ENDPOINT;
    
    // Configure console logging
    this.consoleLoggingEnabled = process.env.NODE_ENV !== 'production';
  }

  /**
   * Add a log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @private
   */
  _addLog(level, message, data = {}) {
    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Trim logs if exceeding max size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(logEntry));
    
    // Console logging if enabled
    if (this.consoleLoggingEnabled) {
      switch (level) {
        case 'info':
          console.info(`[INFO] ${message}`, data);
          break;
        case 'warn':
          console.warn(`[WARN] ${message}`, data);
          break;
        case 'error':
          console.error(`[ERROR] ${message}`, data);
          break;
        case 'debug':
          console.debug(`[DEBUG] ${message}`, data);
          break;
        default:
          console.log(`[${level.toUpperCase()}] ${message}`, data);
      }
    }
    
    // Remote logging if enabled
    if (this.remoteLoggingEnabled && this.remoteLoggingEndpoint) {
      this._sendRemoteLog(logEntry);
    }
    
    return logEntry;
  }

  /**
   * Send log to remote logging service
   * @param {Object} logEntry - Log entry to send
   * @private
   */
  async _sendRemoteLog(logEntry) {
    try {
      await fetch(this.remoteLoggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Don't log this error to avoid infinite loops
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Add a listener for new log entries
   * @param {Function} listener - Listener function
   * @returns {Function} Function to remove the listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    return this._addLog('info', message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    return this._addLog('warn', message, data);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or additional data
   */
  error(message, error = {}) {
    let data = {};
    
    if (error instanceof Error) {
      data = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      
      // If it's an AppError, include additional metadata
      if (error instanceof AppError) {
        data = {
          ...data,
          category: error.category,
          severity: error.severity,
          context: error.context,
          originalError: error.originalError ? {
            name: error.originalError.name,
            message: error.originalError.message,
            stack: error.originalError.stack
          } : null
        };
      }
    } else {
      data = error;
    }
    
    return this._addLog('error', message, data);
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    return this._addLog('debug', message, data);
  }

  /**
   * Get all logs
   * @returns {Array} Array of log entries
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get logs filtered by level
   * @param {string} level - Log level to filter by
   * @returns {Array} Filtered log entries
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by search term
   * @param {string} searchTerm - Search term
   * @returns {Array} Filtered log entries
   */
  searchLogs(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(term) || 
      JSON.stringify(log.data).toLowerCase().includes(term)
    );
  }
}

// Create singleton logger instance
export const logger = new Logger();

/**
 * Error handler for API errors
 * @param {Error} error - Error object
 * @param {Object} options - Error handling options
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.throwError - Whether to throw the error
 * @returns {AppError} Processed error
 */
export const handleApiError = (error, { showToast = true, throwError = false } = {}) => {
  let appError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Convert to AppError
    const message = error.response?.data?.message || error.message || 'An unknown API error occurred';
    const status = error.response?.status;
    
    appError = new AppError(message, {
      category: ErrorCategory.API,
      severity: status >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARNING,
      originalError: error,
      context: {
        status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      }
    });
  }
  
  // Log the error
  logger.error('API Error', appError);
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(appError.message);
  }
  
  // Throw the error if enabled
  if (throwError) {
    throw appError;
  }
  
  return appError;
};

/**
 * Error handler for authentication errors
 * @param {Error} error - Error object
 * @param {Object} options - Error handling options
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.throwError - Whether to throw the error
 * @returns {AppError} Processed error
 */
export const handleAuthError = (error, { showToast = true, throwError = false } = {}) => {
  let appError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Convert to AppError
    const message = error.message || 'An authentication error occurred';
    
    appError = new AppError(message, {
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.WARNING,
      originalError: error,
      context: {
        code: error.code
      }
    });
  }
  
  // Log the error
  logger.error('Authentication Error', appError);
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(appError.message);
  }
  
  // Throw the error if enabled
  if (throwError) {
    throw appError;
  }
  
  return appError;
};

/**
 * Error handler for data processing errors
 * @param {Error} error - Error object
 * @param {Object} options - Error handling options
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.throwError - Whether to throw the error
 * @returns {AppError} Processed error
 */
export const handleDataError = (error, { showToast = true, throwError = false } = {}) => {
  let appError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Convert to AppError
    const message = error.message || 'A data processing error occurred';
    
    appError = new AppError(message, {
      category: ErrorCategory.DATA,
      severity: ErrorSeverity.WARNING,
      originalError: error
    });
  }
  
  // Log the error
  logger.error('Data Processing Error', appError);
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(appError.message);
  }
  
  // Throw the error if enabled
  if (throwError) {
    throw appError;
  }
  
  return appError;
};

/**
 * Global error boundary component for React
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.error('React Error Boundary Caught Error', {
      error,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unknown error occurred'}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default {
  logger,
  AppError,
  ErrorSeverity,
  ErrorCategory,
  handleApiError,
  handleAuthError,
  handleDataError,
  ErrorBoundary
};

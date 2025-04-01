// Service for managing scheduled jobs in the Market Data Collector application
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Service for managing scheduled data collection jobs
 */
class ScheduledJobsService {
  /**
   * Create a new scheduled job
   * @param {Object} jobData - Job configuration data
   * @param {string} jobData.name - Job name
   * @param {string} jobData.description - Job description
   * @param {string} jobData.schedule - Schedule type (hourly, daily, weekly, monthly)
   * @param {Object} jobData.config - Job configuration
   * @param {string} jobData.config.exchange - Exchange name
   * @param {string} jobData.config.symbol - Trading pair symbol
   * @param {string} jobData.config.timeframe - Timeframe interval
   * @param {string} jobData.config.dataRange - Data range to collect
   * @param {Object} jobData.config.processing - Processing options
   * @param {Object} jobData.config.storage - Storage options
   * @param {string} userId - User ID who created the job
   * @returns {Promise<Object>} Created job data
   */
  async createJob(jobData, userId) {
    try {
      const jobsRef = collection(db, 'scheduledJobs');
      
      const newJob = {
        ...jobData,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        lastRun: null,
        lastStatus: null,
        lastResult: null,
        nextRun: this.calculateNextRun(jobData.schedule)
      };
      
      const docRef = await addDoc(jobsRef, newJob);
      
      return {
        id: docRef.id,
        ...newJob
      };
    } catch (error) {
      console.error('Error creating scheduled job:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled jobs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of job objects
   */
  async getJobs(userId) {
    try {
      const jobsRef = collection(db, 'scheduledJobs');
      const q = query(
        jobsRef, 
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Get a specific job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job data
   */
  async getJobById(jobId) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      return {
        id: jobId,
        ...jobSnap.data()
      };
    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update a scheduled job
   * @param {string} jobId - Job ID to update
   * @param {Object} jobData - Updated job data
   * @returns {Promise<Object>} Updated job data
   */
  async updateJob(jobId, jobData) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      
      // Get current job data
      const jobSnap = await getDoc(jobRef);
      if (!jobSnap.exists()) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      const updateData = {
        ...jobData,
        updatedAt: serverTimestamp()
      };
      
      // If schedule changed, recalculate next run
      if (jobData.schedule && jobData.schedule !== jobSnap.data().schedule) {
        updateData.nextRun = this.calculateNextRun(jobData.schedule);
      }
      
      await updateDoc(jobRef, updateData);
      
      return {
        id: jobId,
        ...jobSnap.data(),
        ...updateData
      };
    } catch (error) {
      console.error(`Error updating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a scheduled job
   * @param {string} jobId - Job ID to delete
   * @returns {Promise<void>}
   */
  async deleteJob(jobId) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      await deleteDoc(jobRef);
    } catch (error) {
      console.error(`Error deleting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Pause a scheduled job
   * @param {string} jobId - Job ID to pause
   * @returns {Promise<Object>} Updated job data
   */
  async pauseJob(jobId) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      
      await updateDoc(jobRef, {
        status: 'paused',
        updatedAt: serverTimestamp()
      });
      
      return this.getJobById(jobId);
    } catch (error) {
      console.error(`Error pausing job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused job
   * @param {string} jobId - Job ID to resume
   * @returns {Promise<Object>} Updated job data
   */
  async resumeJob(jobId) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      
      await updateDoc(jobRef, {
        status: 'active',
        updatedAt: serverTimestamp(),
        nextRun: this.calculateNextRun('now') // Schedule next run immediately
      });
      
      return this.getJobById(jobId);
    } catch (error) {
      console.error(`Error resuming job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Run a job immediately
   * @param {string} jobId - Job ID to run
   * @returns {Promise<Object>} Updated job data
   */
  async runJobNow(jobId) {
    try {
      const jobRef = doc(db, 'scheduledJobs', jobId);
      
      await updateDoc(jobRef, {
        nextRun: this.calculateNextRun('now'), // Schedule next run immediately
        updatedAt: serverTimestamp()
      });
      
      return this.getJobById(jobId);
    } catch (error) {
      console.error(`Error running job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job execution history
   * @param {string} jobId - Job ID
   * @param {number} limit - Maximum number of history entries to return
   * @returns {Promise<Array>} Array of job execution history entries
   */
  async getJobHistory(jobId, limit = 10) {
    try {
      const historyRef = collection(db, 'scheduledJobs', jobId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limit));
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error fetching history for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate the next run time based on schedule
   * @param {string} schedule - Schedule type (hourly, daily, weekly, monthly, now)
   * @returns {Object} Firestore timestamp for next run
   */
  calculateNextRun(schedule) {
    const now = new Date();
    let nextRun;
    
    switch (schedule) {
      case 'now':
        // Schedule for immediate execution (1 minute from now)
        nextRun = new Date(now.getTime() + 1 * 60 * 1000);
        break;
      case 'hourly':
        // Next hour
        nextRun = new Date(now);
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
        break;
      case 'daily':
        // Next day at midnight
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
        break;
      case 'weekly':
        // Next week on Sunday
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
        nextRun.setHours(0);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
        break;
      case 'monthly':
        // First day of next month
        nextRun = new Date(now);
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
        break;
      default:
        // Default to daily
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
    }
    
    return nextRun;
  }
}

export default new ScheduledJobsService();

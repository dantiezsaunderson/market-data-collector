// Firebase storage service for the Market Data Collector application
import { db, storage } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  listAll, 
  deleteObject 
} from 'firebase/storage';

/**
 * Service for interacting with Firebase storage for market data
 */
class MarketDataStorageService {
  /**
   * Fetch all datasets from Firestore
   * @returns {Promise<Array>} Array of dataset objects
   */
  async getAllDatasets() {
    try {
      const datasetsRef = collection(db, 'datasets');
      const querySnapshot = await getDocs(datasetsRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching datasets:', error);
      throw error;
    }
  }

  /**
   * Fetch datasets filtered by symbol and/or timeframe
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.symbol] - Symbol to filter by
   * @param {string} [filters.timeframe] - Timeframe to filter by
   * @returns {Promise<Array>} Array of filtered dataset objects
   */
  async getFilteredDatasets(filters = {}) {
    try {
      const datasetsRef = collection(db, 'datasets');
      let q = query(datasetsRef);
      
      if (filters.symbol) {
        q = query(q, where('symbol', '==', filters.symbol));
      }
      
      if (filters.timeframe) {
        q = query(q, where('timeframe', '==', filters.timeframe));
      }
      
      // Add sorting by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching filtered datasets:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific dataset by ID
   * @param {string} datasetId - ID of the dataset to fetch
   * @returns {Promise<Object>} Dataset object with data
   */
  async getDatasetById(datasetId) {
    try {
      // Get dataset metadata
      const datasetRef = doc(db, 'datasets', datasetId);
      const datasetSnap = await getDoc(datasetRef);
      
      if (!datasetSnap.exists()) {
        throw new Error(`Dataset with ID ${datasetId} not found`);
      }
      
      const metadata = datasetSnap.data();
      
      // Get dataset chunks
      const chunksRef = collection(datasetRef, 'chunks');
      const chunksSnap = await getDocs(query(chunksRef, orderBy('index')));
      
      // Combine all chunks into a single data array
      let data = [];
      chunksSnap.forEach(chunkDoc => {
        const chunkData = chunkDoc.data().data;
        data = [...data, ...chunkData];
      });
      
      return {
        id: datasetId,
        ...metadata,
        data
      };
    } catch (error) {
      console.error(`Error fetching dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a dataset by ID
   * @param {string} datasetId - ID of the dataset to delete
   * @returns {Promise<void>}
   */
  async deleteDataset(datasetId) {
    try {
      // Get dataset reference
      const datasetRef = doc(db, 'datasets', datasetId);
      
      // Get and delete all chunks
      const chunksRef = collection(datasetRef, 'chunks');
      const chunksSnap = await getDocs(chunksRef);
      
      const deletePromises = chunksSnap.docs.map(chunkDoc => 
        deleteDoc(doc(chunksRef, chunkDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Delete the dataset document
      await deleteDoc(datasetRef);
      
      // Check if there's a corresponding file in storage
      const fileRef = doc(db, 'files', datasetId);
      const fileSnap = await getDoc(fileRef);
      
      if (fileSnap.exists()) {
        const filePath = fileSnap.data().filePath;
        const storageRef = ref(storage, filePath);
        
        // Delete the file from storage
        await deleteObject(storageRef);
        
        // Delete the file document
        await deleteDoc(fileRef);
      }
    } catch (error) {
      console.error(`Error deleting dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Get all files from storage
   * @returns {Promise<Array>} Array of file objects
   */
  async getAllFiles() {
    try {
      const filesRef = collection(db, 'files');
      const querySnapshot = await getDocs(filesRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  /**
   * Get files filtered by symbol and/or timeframe
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.symbol] - Symbol to filter by
   * @param {string} [filters.timeframe] - Timeframe to filter by
   * @param {string} [filters.format] - File format to filter by
   * @returns {Promise<Array>} Array of filtered file objects
   */
  async getFilteredFiles(filters = {}) {
    try {
      const filesRef = collection(db, 'files');
      let q = query(filesRef);
      
      if (filters.symbol) {
        q = query(q, where('symbol', '==', filters.symbol));
      }
      
      if (filters.timeframe) {
        q = query(q, where('timeframe', '==', filters.timeframe));
      }
      
      if (filters.format) {
        q = query(q, where('format', '==', filters.format));
      }
      
      // Add sorting by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching filtered files:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Firebase Storage
   * @param {File} file - File object to upload
   * @param {Object} metadata - Metadata for the file
   * @returns {Promise<Object>} Upload result with download URL
   */
  async uploadFile(file, metadata) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `uploads/${metadata.symbol}/${metadata.timeframe}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, filePath);
      
      // Upload the file
      const uploadResult = await uploadBytes(storageRef, file, {
        customMetadata: {
          symbol: metadata.symbol,
          timeframe: metadata.timeframe,
          uploadedBy: metadata.userId || 'anonymous'
        }
      });
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Store reference in Firestore
      const fileDoc = await addDoc(collection(db, 'files'), {
        filePath,
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
        symbol: metadata.symbol,
        timeframe: metadata.timeframe,
        createdAt: serverTimestamp(),
        userId: metadata.userId || 'anonymous'
      });
      
      return {
        id: fileDoc.id,
        filePath,
        url: downloadURL,
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage statistics
   */
  async getStorageStats() {
    try {
      // Get all datasets
      const datasets = await this.getAllDatasets();
      
      // Get all files
      const files = await this.getAllFiles();
      
      // Calculate total size of files
      const totalFileSize = files.reduce((total, file) => total + (file.size || 0), 0);
      
      // Calculate total number of records
      const totalRecords = datasets.reduce((total, dataset) => total + (dataset.recordCount || 0), 0);
      
      // Group by format
      const formatCounts = files.reduce((counts, file) => {
        const format = file.format || 'unknown';
        counts[format] = (counts[format] || 0) + 1;
        return counts;
      }, {});
      
      // Group by symbol
      const symbolCounts = datasets.reduce((counts, dataset) => {
        const symbol = dataset.symbol || 'unknown';
        counts[symbol] = (counts[symbol] || 0) + 1;
        return counts;
      }, {});
      
      return {
        totalDatasets: datasets.length,
        totalFiles: files.length,
        totalFileSize,
        totalRecords,
        formatCounts,
        symbolCounts
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }
}

export default new MarketDataStorageService();

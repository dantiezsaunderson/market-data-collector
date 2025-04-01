// Authentication service for the Market Data Collector application
import { 
  auth, 
  db 
} from '../firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Service for handling user authentication and profile management
 */
class AuthService {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise<Object>} User data
   */
  async register(email, password, displayName) {
    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: 'user',
        settings: {
          theme: 'dark',
          notifications: {
            email: true,
            jobCompletion: true,
            jobFailure: true,
            datasetUpdates: false,
            systemAlerts: true
          },
          storage: {
            autoCleanup: true,
            compressionLevel: 'medium',
            retentionPeriod: 90
          }
        }
      });
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Sign in an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login timestamp
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp()
      });
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User data or null if not authenticated
   */
  getCurrentUser() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          if (user) {
            resolve({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName
            });
          } else {
            resolve(null);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async updateUserPassword(newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} [profileData.displayName] - New display name
   * @param {Object} [profileData.settings] - User settings
   * @returns {Promise<void>}
   */
  async updateUserProfile(profileData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Update display name in Firebase Auth if provided
      if (profileData.displayName) {
        await updateProfile(user, { displayName: profileData.displayName });
      }
      
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      const userData = userDoc.data();
      
      // Prepare update data
      const updateData = {
        updatedAt: serverTimestamp()
      };
      
      if (profileData.displayName) {
        updateData.displayName = profileData.displayName;
      }
      
      if (profileData.settings) {
        updateData.settings = {
          ...userData.settings,
          ...profileData.settings
        };
      }
      
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile data
   * @param {string} [uid] - User ID (defaults to current user)
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(uid) {
    try {
      // If no UID provided, use current user
      if (!uid) {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('No authenticated user');
        }
        uid = user.uid;
      }
      
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      return userDoc.data();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
}

export default new AuthService();

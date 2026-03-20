import admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * Uses Firebase CLI authentication (requires: firebase login)
 * @returns {admin.firestore.Firestore} Firestore database instance
 */
export function initializeFirebaseAdmin() {
  try {
    admin.initializeApp({
      projectId: 'pickleball-app-9ccf7'
    });
    console.log('✓ Firebase initialized with Firebase CLI credentials\n');
    return admin.firestore();
  } catch (error) {
    console.error('✗ Failed to initialize Firebase:', error.message);
    console.error('\nPlease ensure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

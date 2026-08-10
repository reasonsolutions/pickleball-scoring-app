/**
 * Setup script for hpl-users collection in Firebase Firestore
 * 
 * This script creates the hpl-users collection structure with sample data
 * Fields: email, password, phone_number, photo_url
 * 
 * Note: In production, passwords should be hashed and stored securely.
 * Consider using Firebase Authentication instead of storing passwords directly.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function setupHplUsersCollection() {
  try {
    console.log('Setting up hpl-users collection...');

    // Sample user data structure
    const sampleUsers = [
      {
        email: 'user1@example.com',
        password: 'hashed_password_here', // In production, use bcrypt or similar
        phone_number: '+91-9876543210',
        photo_url: 'https://example.com/photos/user1.jpg',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        email: 'user2@example.com',
        password: 'hashed_password_here',
        phone_number: '+91-9876543211',
        photo_url: 'https://example.com/photos/user2.jpg',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Create the collection with sample documents
    const batch = db.batch();
    
    sampleUsers.forEach((user, index) => {
      const docRef = db.collection('hpl-users').doc(); // Auto-generate ID
      batch.set(docRef, user);
      console.log(`Added sample user ${index + 1}: ${user.email}`);
    });

    await batch.commit();
    
    console.log('\n✅ Successfully created hpl-users collection!');
    console.log('\nCollection structure:');
    console.log('- email: string');
    console.log('- password: string (should be hashed in production)');
    console.log('- phone_number: string');
    console.log('- photo_url: string');
    console.log('- created_at: timestamp');
    console.log('- updated_at: timestamp');
    
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('Consider using Firebase Authentication instead of storing passwords directly.');
    console.log('If you must store passwords, always hash them using bcrypt or similar.');
    
    // Verify the collection was created
    const snapshot = await db.collection('hpl-users').limit(5).get();
    console.log(`\nVerification: Found ${snapshot.size} documents in hpl-users collection`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up hpl-users collection:', error);
    process.exit(1);
  }
}

// Run the setup
setupHplUsersCollection();

// This script uses the admin SDK which requires service account credentials
// but works better in Node.js environment

// Import Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin with default credentials
// Note: This requires you to have service account credentials set up or be authenticated with Google Cloud
try {
  admin.initializeApp({
    projectId: 'pickleball-app-9ccf7'
  });
} catch (error) {
  // App might already be initialized
  console.log('Firebase app initialization error (might be already initialized):', error.message);
}

const db = admin.firestore();

async function checkEmail() {
  try {
    // The email to check
    const emailToCheck = "abhimanrecspofit@gmail.com";
    console.log(`Checking for email: ${emailToCheck}`);
    
    // Check the exact format as provided
    let clubsSnapshot = await db.collection('hpl-clubs')
      .where('emailId', '==', emailToCheck)
      .get();
    
    if (!clubsSnapshot.empty) {
      console.log(`Found email '${emailToCheck}' exactly as provided`);
      clubsSnapshot.forEach(doc => {
        console.log('Document ID:', doc.id);
        console.log('Document data:', doc.data());
      });
    } else {
      console.log(`No match found for '${emailToCheck}' exactly as provided`);
      
      // Try with lowercase
      clubsSnapshot = await db.collection('hpl-clubs')
        .where('emailId', '==', emailToCheck.toLowerCase())
        .get();
      
      if (!clubsSnapshot.empty) {
        console.log(`Found email when converted to lowercase '${emailToCheck.toLowerCase()}'`);
        clubsSnapshot.forEach(doc => {
          console.log('Document ID:', doc.id);
          console.log('Document data:', doc.data());
        });
      } else {
        console.log(`No match found for lowercase '${emailToCheck.toLowerCase()}'`);
        
        // List all club emails
        console.log("\nListing all emails in hpl-clubs collection for comparison:");
        
        const allClubsSnapshot = await db.collection('hpl-clubs').get();
        
        if (!allClubsSnapshot.empty) {
          console.log("Emails in hpl-clubs collection:");
          allClubsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.emailId) {
              console.log(`- ${data.emailId} (Document ID: ${doc.id})`);
            } else {
              console.log(`- Document ${doc.id} does not have an emailId field`);
              console.log('  Fields:', Object.keys(data));
              
              // Try to find any field that might contain an email
              Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'string' && value.includes('@')) {
                  console.log(`  Possible email field "${key}": ${value}`);
                }
              });
            }
          });
        } else {
          console.log("The hpl-clubs collection appears to be empty");
        }
      }
    }
  } catch (error) {
    console.error('Error checking email:', error);
  }
}

checkEmail()
  .then(() => console.log('Email check complete'))
  .catch(err => console.error('Error running script:', err))
  .finally(() => process.exit());
import { initializeApp } from 'firebase/app';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './src/utils/firebase.js';

// Define firebaseConfig directly since it's not exported from firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDFO4nUrgpBBydJoim9HFBLAOan94Bg7Fw",
  authDomain: "pickleball-app-9ccf7.firebaseapp.com",
  projectId: "pickleball-app-9ccf7",
  storageBucket: "pickleball-app-9ccf7.firebasestorage.app",
  messagingSenderId: "248577092150",
  appId: "1:248577092150:web:fb1415679f016111c2c697",
  measurementId: "G-6FRPZQJQ3B"
};


async function checkEmail() {
  try {
    // The email to check
    const emailToCheck = "abhimanrecspofit@gmail.com";
    
    // Check the exact format as provided
    let clubsQuery = query(
      collection(db, 'hpl-clubs'),
      where('emailId', '==', emailToCheck)
    );
    
    let clubsSnapshot = await getDocs(clubsQuery);
    
    if (!clubsSnapshot.empty) {
      console.log(`Found email '${emailToCheck}' exactly as provided`);
      clubsSnapshot.forEach(doc => {
        console.log('Document ID:', doc.id);
        console.log('Document data:', doc.data());
      });
    } else {
      console.log(`No match found for '${emailToCheck}' exactly as provided`);
      
      // Try with lowercase
      clubsQuery = query(
        collection(db, 'hpl-clubs'),
        where('emailId', '==', emailToCheck.toLowerCase())
      );
      
      clubsSnapshot = await getDocs(clubsQuery);
      
      if (!clubsSnapshot.empty) {
        console.log(`Found email when converted to lowercase '${emailToCheck.toLowerCase()}'`);
        clubsSnapshot.forEach(doc => {
          console.log('Document ID:', doc.id);
          console.log('Document data:', doc.data());
        });
      } else {
        console.log(`No match found for lowercase '${emailToCheck.toLowerCase()}'`);
        
        // Check if there are any similar emails
        console.log("\nChecking for similar emails in the database:");
        
        // List all club emails
        const allClubsQuery = query(collection(db, 'hpl-clubs'));
        const allClubsSnapshot = await getDocs(allClubsQuery);
        
        if (!allClubsSnapshot.empty) {
          console.log("All emails in hpl-clubs collection:");
          allClubsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.emailId} (Document ID: ${doc.id})`);
          });
        } else {
          console.log("The hpl-clubs collection appears to be empty");
        }
      }
    }
    
    // Check alternative field names that might contain email
    const alternativeFields = ['email', 'clubEmail', 'adminEmail', 'contactEmail'];
    
    for (const field of alternativeFields) {
      clubsQuery = query(
        collection(db, 'hpl-clubs'),
        where(field, '==', emailToCheck)
      );
      
      clubsSnapshot = await getDocs(clubsQuery);
      
      if (!clubsSnapshot.empty) {
        console.log(`\nFound email in field '${field}' instead of 'emailId'`);
        clubsSnapshot.forEach(doc => {
          console.log('Document ID:', doc.id);
          console.log('Document data:', doc.data());
        });
        break;
      }
    }
  } catch (error) {
    console.error('Error checking email:', error);
  }
}

// Execute the function
checkEmail().then(() => console.log('Email check complete'));
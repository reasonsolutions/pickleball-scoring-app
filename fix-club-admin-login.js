// This script fixes common issues with club admin login
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './src/utils/firebase.js';

// The email that's having issues
const emailToFix = "Abhimanrecspofit@gmail.com";

async function fixClubAdminLogin() {
  try {
    console.log(`Starting fix for ${emailToFix}`);

    // First check if the email exists with exact case
    let clubsQuery = query(
      collection(db, 'hpl-clubs'),
      where('emailId', '==', emailToFix)
    );
    
    let clubsSnapshot = await getDocs(clubsQuery);
    
    if (!clubsSnapshot.empty) {
      console.log(`✅ Found email with exact case: ${emailToFix}`);
      
      // Email exists with exact case, but login is failing
      // Fix: Update to lowercase to match login check
      clubsSnapshot.forEach(async (docSnapshot) => {
        const docId = docSnapshot.id;
        const docData = docSnapshot.data();
        console.log(`Document ID: ${docId}`);
        
        // Check if the email is not already lowercase
        if (docData.emailId !== docData.emailId.toLowerCase()) {
          console.log(`Updating email to lowercase: ${docData.emailId} → ${docData.emailId.toLowerCase()}`);
          
          try {
            // Update the document with lowercase email
            await updateDoc(doc(db, 'hpl-clubs', docId), {
              emailId: docData.emailId.toLowerCase()
            });
            console.log(`✅ Email field updated successfully!`);
          } catch (error) {
            console.error(`❌ Error updating email field: ${error.message}`);
          }
        } else {
          console.log(`Email is already lowercase, no need to update.`);
        }
        
        // Check if document has all required fields
        const requiredFields = {
          'password': 'Missing password would prevent login',
          'clubName': 'Missing club name might cause issues after login'
        };
        
        for (const [field, message] of Object.entries(requiredFields)) {
          if (!docData[field] && !docData['fullName']) {
            console.log(`⚠️ Warning: ${message}`);
            console.log(`Document is missing the "${field}" field`);
          }
        }
      });
      
      return;
    }
    
    // Email doesn't exist with exact case, check lowercase
    clubsQuery = query(
      collection(db, 'hpl-clubs'),
      where('emailId', '==', emailToFix.toLowerCase())
    );
    
    clubsSnapshot = await getDocs(clubsQuery);
    
    if (!clubsSnapshot.empty) {
      console.log(`✅ Found email with lowercase: ${emailToFix.toLowerCase()}`);
      
      // Email exists with lowercase, but login is still failing
      // Check for other issues
      clubsSnapshot.forEach((docSnapshot) => {
        const docId = docSnapshot.id;
        const docData = docSnapshot.data();
        console.log(`Document ID: ${docId}`);
        
        // Check if document has all required fields
        const requiredFields = {
          'password': 'Missing password would prevent login',
          'clubName': 'Missing club name might cause issues after login'
        };
        
        let missingFields = false;
        for (const [field, message] of Object.entries(requiredFields)) {
          if (!docData[field] && (field !== 'clubName' || !docData['fullName'])) {
            console.log(`⚠️ Warning: ${message}`);
            console.log(`Document is missing the "${field}" field`);
            missingFields = true;
          }
        }
        
        if (!missingFields) {
          console.log(`✅ Document has all required fields`);
          console.log(`⚠️ If login still fails, the password hash may be incorrect.`);
          console.log(`Try resetting your password through the forgot password feature.`);
        }
      });
      
      return;
    }
    
    // Email doesn't exist with either case, check alternative fields
    console.log(`⚠️ Email not found in 'emailId' field. Checking alternative fields...`);
    
    const alternativeFields = ['email', 'clubEmail', 'adminEmail', 'contactEmail'];
    let foundInAlt = false;
    
    for (const field of alternativeFields) {
      clubsQuery = query(
        collection(db, 'hpl-clubs'),
        where(field, '==', emailToFix)
      );
      
      clubsSnapshot = await getDocs(clubsQuery);
      
      if (!clubsSnapshot.empty) {
        console.log(`✅ Found email in field '${field}' instead of 'emailId'`);
        
        // Email exists in an alternative field
        clubsSnapshot.forEach(async (docSnapshot) => {
          const docId = docSnapshot.id;
          const docData = docSnapshot.data();
          console.log(`Document ID: ${docId}`);
          
          // Fix: Copy value to emailId field
          console.log(`Copying value from '${field}' to 'emailId': ${docData[field]}`);
          
          try {
            // Add the emailId field with lowercase value
            const updateData = {
              emailId: docData[field].toLowerCase()
            };
            
            await updateDoc(doc(db, 'hpl-clubs', docId), updateData);
            console.log(`✅ Added 'emailId' field successfully!`);
          } catch (error) {
            console.error(`❌ Error adding 'emailId' field: ${error.message}`);
          }
        });
        
        foundInAlt = true;
        break;
      }
    }
    
    if (!foundInAlt) {
      // Last resort - check for similar emails
      console.log(`⚠️ Email not found in any field. Checking for similar emails...`);
      
      const allClubsQuery = query(collection(db, 'hpl-clubs'));
      const allClubsSnapshot = await getDocs(allClubsQuery);
      
      if (!allClubsSnapshot.empty) {
        console.log(`Found ${allClubsSnapshot.size} documents in hpl-clubs collection`);
        
        let foundSimilar = false;
        allClubsSnapshot.forEach((docSnapshot) => {
          const docData = docSnapshot.data();
          
          if (docData.emailId) {
            // Simple similarity check (contains most of the email)
            const targetEmail = emailToFix.toLowerCase();
            const storedEmail = docData.emailId.toLowerCase();
            
            // Check if emails are similar (80% of characters match)
            const isEmailSimilar = 
              targetEmail.includes(storedEmail.substring(0, Math.floor(storedEmail.length * 0.8))) || 
              storedEmail.includes(targetEmail.substring(0, Math.floor(targetEmail.length * 0.8)));
            
            if (isEmailSimilar) {
              console.log(`⚠️ Found similar email: "${docData.emailId}"`);
              console.log(`Document ID: ${docSnapshot.id}`);
              foundSimilar = true;
            }
          }
        });
        
        if (!foundSimilar) {
          console.log(`❌ No similar email found in the database.`);
          console.log(`The email "${emailToFix}" does not appear to be registered in the system.`);
          console.log(`You may need to register as a new club admin.`);
        }
      } else {
        console.log(`❌ The hpl-clubs collection appears to be empty.`);
      }
    }
    
  } catch (error) {
    console.error(`Error in fixClubAdminLogin: ${error}`);
  }
}

// Run the function
fixClubAdminLogin().then(() => console.log('Fix process complete'));
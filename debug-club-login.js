// This script simulates the login process to identify why it's failing
import { initializeApp } from 'firebase/app';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './src/utils/firebase.js';

// The email that's not working
const testEmail = "Abhimanrecspofit@gmail.com";

// Function to hash a string (using the same method as the login page)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function simulateLogin() {
  console.log(`Simulating login for email: ${testEmail}`);
  
  try {
    // This is exactly what happens in the Logins.jsx handleLogin function
    // We query the hpl-clubs collection with the lowercase version of the email
    const clubsQuery = query(
      collection(db, 'hpl-clubs'),
      where('emailId', '==', testEmail.toLowerCase())
    );
    
    console.log(`Searching for: ${testEmail.toLowerCase()}`);
    const clubsSnapshot = await getDocs(clubsQuery);
    
    if (clubsSnapshot.empty) {
      console.error('❌ Login would fail: No club admin found with this email address');
      
      // Let's try without lowercase to see if that's the issue
      const exactCaseQuery = query(
        collection(db, 'hpl-clubs'),
        where('emailId', '==', testEmail)
      );
      
      const exactCaseSnapshot = await getDocs(exactCaseQuery);
      
      if (!exactCaseSnapshot.empty) {
        console.log('✅ Found with exact case, but login uses lowercase. Case sensitivity issue!');
        
        // Get the document data
        exactCaseSnapshot.forEach(doc => {
          console.log('Document ID:', doc.id);
          console.log('Document data:', doc.data());
        });
        
        console.log('\nPossible solution: Fix the case of the email in the database OR modify login code to use case-insensitive comparison');
      } else {
        console.log('❌ Not found with exact case either. Other issue detected.');
      }
      
      // Let's check all emails in the collection to see if there are any similar ones
      console.log('\nChecking all emails in hpl-clubs collection:');
      
      const allClubsQuery = query(collection(db, 'hpl-clubs'));
      const allClubsSnapshot = await getDocs(allClubsQuery);
      
      if (!allClubsSnapshot.empty) {
        let foundSimilarEmail = false;
        
        allClubsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.emailId) {
            const storedEmail = data.emailId;
            
            if (storedEmail.toLowerCase() === testEmail.toLowerCase()) {
              foundSimilarEmail = true;
              console.log(`✅ Found similar email: "${storedEmail}" (Document ID: ${doc.id})`);
              console.log('Document data:', data);
              
              console.log(`\nThe email in database is "${storedEmail}" but login looks for "${testEmail.toLowerCase()}"`);
            } else {
              console.log(`- ${storedEmail} (Document ID: ${doc.id})`);
            }
          }
        });
        
        if (!foundSimilarEmail) {
          console.log('No similar emails found in the database.');
        }
      }
    } else {
      console.log('✅ Email found in lowercase search!');
      
      // Get the document data
      clubsSnapshot.forEach(async doc => {
        console.log('Document ID:', doc.id);
        const clubData = doc.data();
        console.log('Has password field:', !!clubData.password);
        
        // Check if all required fields are present
        const requiredFields = ['emailId', 'password', 'clubName'];
        const missingFields = requiredFields.filter(field => !clubData[field]);
        
        if (missingFields.length > 0) {
          console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
        } else {
          console.log('✅ All required fields present');
        }
        
        console.log('Relevant fields:');
        console.log('- emailId:', clubData.emailId);
        console.log('- clubName:', clubData.clubName || clubData.fullName);
        
        // Try different test passwords to see if any work
        // This is for debugging only - in production, never expose password hashes
        const testPasswords = ['password123', 'password', '123456', 'admin', 'clubadmin'];
        console.log('\nAttempting sample passwords (for debug purposes only):');
        
        for (const testPwd of testPasswords) {
          const hashedTestPwd = await hashPassword(testPwd);
          const shortHash = hashedTestPwd.substring(0, 10) + '...';
          console.log(`Testing "${testPwd}" (hash starts with ${shortHash})`);
          
          if (clubData.password === hashedTestPwd) {
            console.log(`✅ Password "${testPwd}" would work!`);
          }
        }
        
        // Show the first few chars of the stored password hash for debugging
        if (clubData.password) {
          const storedHashPrefix = clubData.password.substring(0, 10);
          console.log(`Stored password hash starts with: ${storedHashPrefix}...`);
        }
      });
    }
  } catch (error) {
    console.error('Error in login simulation:', error);
  }
}

// Run the function
simulateLogin().then(() => console.log('Debug complete'));
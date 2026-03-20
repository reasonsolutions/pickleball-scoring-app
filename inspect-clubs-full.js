import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFO4nUrgpBBydJoim9HFBLAOan94Bg7Fw",
  authDomain: "pickleball-app-9ccf7.firebaseapp.com",
  projectId: "pickleball-app-9ccf7",
  storageBucket: "pickleball-app-9ccf7.firebasestorage.app",
  messagingSenderId: "248577092150",
  appId: "1:248577092150:web:fb1415679f016111c2c697",
  measurementId: "G-6FRPZQJQ3B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectClubs() {
  try {
    console.log('=== ALL HPL-CLUBS DOCUMENTS ===\n');
    const clubsRef = collection(db, 'hpl-clubs');
    const clubsSnapshot = await getDocs(clubsRef);
    
    console.log(`Total clubs: ${clubsSnapshot.size}\n`);
    clubsSnapshot.docs.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(`Full Data:`, JSON.stringify(doc.data(), null, 2));
      console.log('---\n');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectClubs().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

// This script can be pasted directly into the browser console when on the app

// Import the necessary Firebase functions first
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

// Firebase configuration from your firebase.js file
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

// Function to check if club with same email exists
async function checkExistingClub(email) {
  try {
    console.log(`Checking if club with email ${email} already exists...`);
    const clubsRef = collection(db, 'hpl-clubs');
    const q = query(clubsRef, where("emailId", "==", email));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    console.log(`Club exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error("Error checking for existing club:", error);
    return true; // Assume exists on error to prevent duplicates
  }
}

// Sample implementation of the hashPassword function for login
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Generate hashed password
const password = "clubs@2026"; // Default password
let hashedPassword;

(async () => {
  hashedPassword = await hashPassword(password);
  console.log(`Hashed password for "${password}": ${hashedPassword}`);
})();

// Gladiators PC club data
const gladiatorsClub = {
  emailId: "bothrasports@gmail.com",
  password: "426eb000e12107c4920708991314c3085a4b84bf3461b35615d09376f8c7bd91", // clubs@2026 after SHA-256 encryption
  additionalInfo: "Looking forward to participating in the league.",
  clubDescription: "independent-collective",
  clubFeeling: "People will feel welcomed, motivated, and proud—part of a disciplined yet supportive environment where improvement is encouraged, effort is respected, and everyone feels they belong to something bigger than just a game.",
  clubNamingFormat: "PC",
  clubUSP: "A strong competitive pathway, and a culture built on discipline and respect. We offer structured training, regular competitive play, performance tracking, and a professional environment that helps players improve faster while feeling valued, supported, and motivated every day.",
  communityExistence: "6-12-months",
  communityManagerName: "Sayam Bothra",
  managerEmailId: "bothrasports@gmail.com",
  finalDeclarations: [
    "application-not-guarantee",
    "uphold-rules-values",
    "governing-body-discretion",
    "pay-registration-fee",
    "pay-club-fee-if-approved"
  ],
  longTermGoals: ["player-development", "competitive-success"],
  managerPhoneNumber: "9876543210",
  otherBenefits: "Regular training sessions, equipment support",
  paymentInfo: {
    amount: 500000,
    currency: "INR",
    orderId: "test_order_id",
    paidAt: serverTimestamp(),
    paymentId: "pay_SC5YvbgUIVSF88",
    paymentMethod: "razorpay",
    signature: "test_signature"
  },
  phoneNumber: "+91 9876543210",
  playerBenefits: ["coaching", "equipment", "tournaments"],
  playerSelectionCriteria: ["performance", "attitude-team-player", "commitment"],
  primaryOwnerName: "Sayam Bothra",
  proposedClubName: "Gladiators PC",
  rolesResponsibilities: "structured",
  status: "pending",
  submittedAt: serverTimestamp(),
  uniqueCulture: "Our culture is built around high-energy sessions, friendly rivalries, and community engagement—making the club competitive yet enjoyable, where players push hard and genuinely look forward to training sessions.",
  venueAccess: "secured",
  venueName: "Gladiators Sports Complex",
  whyJoinLeague: "I want to own a team in the Hyderabad Pickleball League to help grow the sport locally, build a strong competitive culture, and create a professionally run team that represents our community with pride.",
  winningVsCulture: "Building a culture is our primary focus because a strong culture creates consistency, attracts the right talent, and leads to sustainable success—winning matches will naturally follow."
};

// Function to add the Gladiators PC club
async function addGladiatorsClub() {
  try {
    console.log("Starting the process to add Gladiators PC club...");
    
    // Check if club with this email already exists
    const exists = await checkExistingClub(gladiatorsClub.emailId);
    
    if (exists) {
      console.log(`Club with email ${gladiatorsClub.emailId} already exists. No changes made.`);
      return;
    }
    
    console.log("Adding new club document...");
    // Add new club document
    const clubsRef = collection(db, 'hpl-clubs');
    const docRef = await addDoc(clubsRef, gladiatorsClub);
    
    console.log(`Successfully added Gladiators PC club with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error adding Gladiators PC club:", error);
    return null;
  }
}

// Execute the function and return a promise for easier console use
const result = addGladiatorsClub();
console.log("Operation initiated, check console for results...");
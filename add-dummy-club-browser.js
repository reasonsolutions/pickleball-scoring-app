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

// Dummy team data
const dummyTeam = {
  emailId: "terasiddhartha@gmail.com",
  password: "426eb000e12107c4920708991314c3085a4b84bf3461b35615d09376f8c7bd91", // clubs@2026 after SHA-256 encryption
  additionalInfo: "That's about it.",
  clubDescription: "independent-collective",
  clubFeeling: "People will feel welcomed, motivated, and proud—part of a disciplined yet supportive environment where improvement is encouraged, effort is respected, and everyone feels they belong to something bigger than just a game.",
  clubNamingFormat: "PC",
  clubUSP: "a strong competitive pathway, and a culture built on discipline and respect. We offer structured training, regular competitive play, performance tracking, and a professional environment that helps players improve faster while feeling valued, supported, and motivated every day.",
  communityExistence: "6-12-months",
  communityManagerName: "Saikiran ",
  managerEmailId: "veeravallisaikiran7@gmail.com",
  finalDeclarations: [
    "application-not-guarantee",
    "uphold-rules-values",
    "governing-body-discretion",
    "pay-registration-fee",
    "pay-club-fee-if-approved"
  ],
  longTermGoals: ["other"],
  managerPhoneNumber: "9086509999",
  otherBenefits: "",
  paymentInfo: {
    amount: 500000,
    currency: "INR",
    orderId: "test_order_id",
    paidAt: serverTimestamp(),
    paymentId: "pay_SC5YvbgUIVSF88",
    paymentMethod: "razorpay",
    signature: "test_signature"
  },
  phoneNumber: "+91 81479 00900",
  playerBenefits: ["others"],
  playerSelectionCriteria: ["time-commitment"],
  primaryOwnerName: "Balaji yakkali ",
  proposedClubName: "Wolf Pack ",
  rolesResponsibilities: "formal",
  status: "pending",
  submittedAt: serverTimestamp(),
  uniqueCulture: "Our fun culture is built around high-energy sessions, friendly rivalries, and community moments—music during training, themed match days, mixed-skill play, and off-court socials—making the club competitive yet enjoyable, where players push hard, laugh often, and genuinely look forward to showing up.",
  venueAccess: "in-progress",
  venueName: "",
  whyJoinLeague: "I want to own a team in the Hyderabad Pickleball League to help grow the sport locally, build a strong competitive culture, and create a professionally run team that represents Hyderabad with pride while developing future talent",
  winningVsCulture: "Building a culture excites me more because a strong culture creates consistency, attracts the right talent, and leads to sustainable success—winning matches then becomes a natural outcome rather than the only goal."
};

// Function to add the dummy club
async function addDummyClub() {
  try {
    console.log("Starting the process to add dummy club...");
    
    // Check if club with this email already exists
    const exists = await checkExistingClub(dummyTeam.emailId);
    
    if (exists) {
      console.log(`Club with email ${dummyTeam.emailId} already exists. No changes made.`);
      return;
    }
    
    console.log("Adding new club document...");
    // Add new club document
    const clubsRef = collection(db, 'hpl-clubs');
    const docRef = await addDoc(clubsRef, dummyTeam);
    
    console.log(`Successfully added dummy team with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error adding dummy club:", error);
    return null;
  }
}

// Execute the function and return a promise for easier console use
const result = addDummyClub();
console.log("Operation initiated, check console for results...");

// You can also use this to check if login works with the added club
async function checkLogin() {
  // Sample implementation of the hashPassword function from Logins.jsx
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };
  
  const plainPassword = "clubs@2026";
  const hashedPassword = await hashPassword(plainPassword);
  console.log(`Hashed password for "${plainPassword}": ${hashedPassword}`);
  console.log(`Expected hash in database: ${dummyTeam.password}`);
  console.log(`Hashes match: ${hashedPassword === dummyTeam.password}`);
}

// Uncomment to run the check
// checkLogin();
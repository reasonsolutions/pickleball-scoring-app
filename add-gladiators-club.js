// Script to add Gladiators PC club to the hpl-clubs database
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

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

// Current timestamp for submission and payment dates
const currentTimestamp = Timestamp.now();

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
    paidAt: currentTimestamp,
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
  submittedAt: currentTimestamp,
  uniqueCulture: "Our culture is built around high-energy sessions, friendly rivalries, and community engagement—making the club competitive yet enjoyable, where players push hard and genuinely look forward to training sessions.",
  venueAccess: "secured",
  venueName: "Gladiators Sports Complex",
  whyJoinLeague: "I want to own a team in the Hyderabad Pickleball League to help grow the sport locally, build a strong competitive culture, and create a professionally run team that represents our community with pride.",
  winningVsCulture: "Building a culture is our primary focus because a strong culture creates consistency, attracts the right talent, and leads to sustainable success—winning matches will naturally follow."
};

// Function to check if club with same email exists
async function checkExistingClub(email) {
  try {
    const clubsRef = collection(db, 'hpl-clubs');
    const q = query(clubsRef, where("emailId", "==", email));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking for existing club:", error);
    return true; // Assume exists on error to prevent duplicates
  }
}

// Function to add the Gladiators PC club
async function addGladiatorsClub() {
  try {
    // Check if club with this email already exists
    const exists = await checkExistingClub(gladiatorsClub.emailId);
    
    if (exists) {
      console.log(`Club with email ${gladiatorsClub.emailId} already exists. No changes made.`);
      return;
    }
    
    // Add new club document
    const clubsRef = collection(db, 'hpl-clubs');
    const docRef = await addDoc(clubsRef, gladiatorsClub);
    
    console.log(`Successfully added Gladiators PC club with ID: ${docRef.id}`);
  } catch (error) {
    console.error("Error adding Gladiators PC club:", error);
  }
}

// Run the function
addGladiatorsClub();
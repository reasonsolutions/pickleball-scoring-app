# Pickleball Tourny App

A modern tournament management dashboard built with React, DaisyUI, and Firebase for organizing and managing pickleball tournaments.

## Features

- 🔐 **Authentication System** - Secure user registration and login with Firebase Auth
- 🏆 **Tournament Management** - Create, view, and manage tournaments
- 📱 **Responsive Design** - Mobile-first design with DaisyUI components
- 🖼️ **Image Upload** - Tournament cover image upload with Firebase Storage
- 📊 **Dashboard** - Overview of tournaments with statistics
- 🎯 **Real-time Updates** - Live data synchronization with Firestore

## Tech Stack

- **Frontend**: React 18 with Vite
- **UI Framework**: DaisyUI + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Routing**: React Router DOM
- **State Management**: React Context API

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd "Pickleball Scoring App/Pickleball app"

# Install dependencies
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Storage**

### 3. Configure Firebase

1. In Firebase Console, go to Project Settings > General
2. Scroll down to "Your apps" and click "Web app" icon
3. Register your app and copy the configuration
4. Replace the placeholder values in `src/utils/firebase.js` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Firestore Security Rules

Set up the following security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own tournaments
    match /tournaments/{tournamentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.createdBy;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
    }
    
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Storage Security Rules

Set up the following security rules in Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tournament-covers/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Run the Application

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ImageUpload.jsx     # Image upload component
│   ├── MainLayout.jsx      # Main layout wrapper
│   ├── Navbar.jsx          # Navigation bar
│   ├── ProtectedRoute.jsx  # Route protection
│   ├── Sidebar.jsx         # Sidebar navigation
│   └── TournamentCard.jsx  # Tournament display card
├── contexts/            # React contexts
│   └── AuthContext.jsx     # Authentication context
├── hooks/              # Custom hooks (future use)
├── pages/              # Page components
│   ├── CreateTournament.jsx # Tournament creation form
│   ├── Home.jsx            # Dashboard home page
│   ├── Login.jsx           # Login page
│   ├── MyTournaments.jsx   # Tournament listing page
│   └── Register.jsx        # Registration page
├── utils/              # Utility functions
│   ├── firebase.js         # Firebase configuration
│   └── firebase-config-template.js # Config template
├── App.jsx             # Main app component with routing
└── main.jsx           # App entry point
```

## Usage

### Creating Your First Tournament

1. **Register/Login**: Create an account or sign in
2. **Navigate**: Go to "My Tournaments" from the sidebar
3. **Create**: Click "Create Tournament" button
4. **Fill Details**: 
   - Add tournament name, description, and rules
   - Set prize money and optional registration fee
   - Choose start and end dates
   - Upload a cover image (optional)
5. **Submit**: Click "Create Tournament" to save

### Managing Tournaments

- **View All**: See all your tournaments in the "My Tournaments" page
- **Filter**: Use tabs to view "Current" vs "Past" tournaments
- **Statistics**: View tournament counts and status on the dashboard

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

## Deployment

### Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init hosting
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

## Environment Variables

For production, consider using environment variables for Firebase config:

```bash
# .env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Troubleshooting

### Common Issues

1. **Firebase Config Error**: Make sure you've replaced the placeholder values in `firebase.js`
2. **Authentication Issues**: Verify Email/Password provider is enabled in Firebase Console
3. **Firestore Permission Denied**: Check that security rules are properly configured
4. **Image Upload Fails**: Ensure Firebase Storage is enabled and rules allow authenticated uploads

### Development Tips

- Use browser dev tools to check for console errors
- Verify Firebase project settings match your configuration
- Test authentication flow before implementing tournament features
- Check Firestore rules in Firebase Console if data operations fail

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Firebase documentation
3. Check browser console for error messages
4. Verify all Firebase services are properly configured

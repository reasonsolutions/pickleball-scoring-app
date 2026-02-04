# Pickleball Tournament Mobile App

A React Native mobile application for managing pickleball tournaments, built with Expo and Firebase.

## Features

- **Authentication**: User login/registration with Firebase Auth
- **Tournament Management**: View and manage tournaments
- **Live Scoring**: Real-time match scoring interface
- **Admin Dashboard**: Administrative controls for tournament organizers
- **User Profiles**: Profile management and settings
- **Role-based Access**: Super admin and team admin roles

## Tech Stack

- **React Native** with Expo
- **Firebase** (Auth, Firestore, Storage, Analytics)
- **React Navigation** for navigation
- **React Native Safe Area Context** for safe area handling

## Project Structure

```
mobile-app/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx          # Authentication context
│   ├── screens/
│   │   ├── LoginScreen.jsx          # Login screen
│   │   ├── RegisterScreen.jsx       # Registration screen
│   │   ├── HomeScreen.jsx           # Dashboard/home screen
│   │   ├── TournamentsScreen.jsx    # Tournament listing
│   │   ├── ScoringScreen.jsx        # Match scoring interface
│   │   ├── AdminDashboardScreen.jsx # Admin controls
│   │   └── ProfileScreen.jsx        # User profile
│   └── utils/
│       └── firebase.js              # Firebase configuration
├── App.js                           # Main app component
└── package.json                     # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## Firebase Configuration

The app uses the same Firebase project as the web application. The configuration is already set up in `src/utils/firebase.js`.

### Firebase Services Used

- **Authentication**: User login/registration
- **Firestore**: Tournament and match data storage
- **Storage**: File uploads (future feature)
- **Analytics**: Usage tracking

## Key Features

### Authentication
- Email/password login and registration
- Role-based access control (Super Admin, Team Admin, User)
- Password change functionality
- Secure logout

### Tournament Management
- View all tournaments (role-based filtering)
- Search tournaments by name or location
- Tournament details and status tracking
- Create new tournaments (admin only)

### Live Scoring
- Real-time match scoring interface
- Update scores for scheduled and in-progress matches
- Automatic match completion detection
- Score validation and error handling

### Admin Dashboard
- Tournament statistics overview
- Quick access to admin functions
- Recent activity tracking
- Role-based feature access

### User Profile
- View and edit profile information
- Change password
- Role and team information display
- App settings and preferences

## Navigation Structure

The app uses a stack navigator with tab navigation for authenticated users:

```
Stack Navigator
├── Login Screen
├── Register Screen
└── Main Tab Navigator
    ├── Home Tab
    ├── Tournaments Tab
    ├── Scoring Tab
    ├── Admin Tab
    └── Profile Tab
```

## Styling

The app uses a dark theme with consistent styling:
- **Primary Color**: #3b82f6 (Blue)
- **Background**: #111827 (Dark Gray)
- **Cards**: #1f2937 (Medium Gray)
- **Text**: #ffffff (White) and #9ca3af (Light Gray)

## Development Notes

### State Management
- Uses React Context for authentication state
- Local state management with useState hooks
- Firebase real-time listeners for data synchronization

### Error Handling
- Comprehensive error handling for Firebase operations
- User-friendly error messages
- Loading states for async operations

### Performance Considerations
- Efficient Firebase queries with proper indexing
- Optimized re-renders with proper dependency arrays
- Image optimization for better performance

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Related Projects

This mobile app is part of a larger tournament management system:
- **Web Application**: React web app for comprehensive tournament management
- **Firebase Backend**: Shared Firestore database and authentication
- **Admin Panel**: Web-based administrative interface

## Contributing

1. Follow the existing code style and structure
2. Test on both iOS and Android platforms
3. Ensure Firebase security rules are respected
4. Update documentation for new features

## License

This project is part of the Pickleball Tournament Management System.
#!/bin/bash

# Pickleball App Client Duplication Script
# Usage: ./scripts/duplicate-for-client.sh <client-name> <firebase-project-id>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required parameters are provided
if [ $# -ne 2 ]; then
    print_error "Usage: $0 <client-name> <firebase-project-id>"
    print_error "Example: $0 'acme-sports' 'acme-pickleball-app'"
    exit 1
fi

CLIENT_NAME="$1"
FIREBASE_PROJECT_ID="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="../${CLIENT_NAME}-pickleball-app"

print_status "Starting duplication process for client: $CLIENT_NAME"
print_status "Firebase Project ID: $FIREBASE_PROJECT_ID"

# Step 1: Create client directory
print_status "Creating client directory..."
if [ -d "$CLIENT_DIR" ]; then
    print_warning "Client directory already exists. Removing..."
    rm -rf "$CLIENT_DIR"
fi

cp -r "$PROJECT_ROOT" "$CLIENT_DIR"
cd "$CLIENT_DIR"

print_success "Client directory created: $CLIENT_DIR"

# Step 2: Clean up git history
print_status "Cleaning up git history..."
rm -rf .git
git init
print_success "Git repository initialized"

# Step 3: Update package.json
print_status "Updating package.json..."
sed -i.bak "s/\"pickleball-tourney\"/\"${CLIENT_NAME}-pickleball-app\"/" package.json
rm package.json.bak
print_success "Package.json updated"

# Step 4: Update .firebaserc
print_status "Updating .firebaserc..."
cat > .firebaserc << EOF
{
  "projects": {
    "default": "$FIREBASE_PROJECT_ID"
  }
}
EOF
print_success ".firebaserc updated"

# Step 5: Create client-specific firebase config template
print_status "Creating client-specific Firebase config template..."
cat > src/utils/firebase-client-config.js << EOF
// Firebase Configuration for $CLIENT_NAME
// Replace these values with your actual Firebase project configuration

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// TODO: Replace with actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "${FIREBASE_PROJECT_ID}.firebaseapp.com",
  projectId: "${FIREBASE_PROJECT_ID}",
  storageBucket: "${FIREBASE_PROJECT_ID}.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
  measurementId: "YOUR_MEASUREMENT_ID_HERE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
EOF

print_success "Client Firebase config template created"

# Step 6: Create client-specific Cloudinary config template
print_status "Creating client-specific Cloudinary config template..."
cat > src/utils/cloudinary-client-config.js << EOF
// Cloudinary Configuration for $CLIENT_NAME
// Replace these values with your actual Cloudinary account details

export const CLOUDINARY_CONFIG = {
  cloudName: 'YOUR_CLOUD_NAME_HERE',
  apiKey: 'YOUR_API_KEY_HERE',
  // Note: API Secret should only be used server-side
  uploadPreset: '${CLIENT_NAME}_player_photos'
};

export const CLOUDINARY_UPLOAD_PRESETS = {
  playerPhotos: '${CLIENT_NAME}_player_photos',
  tournamentCovers: '${CLIENT_NAME}_tournament_covers',
  logos: '${CLIENT_NAME}_logos'
};

// Upload preset configurations to create in Cloudinary:
/*
1. ${CLIENT_NAME}_player_photos:
   - Signing Mode: Unsigned
   - Folder: ${CLIENT_NAME}/players
   - Access Mode: Public
   - Resource Type: Image
   - File size limit: 5MB

2. ${CLIENT_NAME}_tournament_covers:
   - Signing Mode: Unsigned
   - Folder: ${CLIENT_NAME}/tournaments
   - Access Mode: Public
   - Resource Type: Image
   - File size limit: 10MB

3. ${CLIENT_NAME}_logos:
   - Signing Mode: Unsigned
   - Folder: ${CLIENT_NAME}/logos
   - Access Mode: Public
   - Resource Type: Image
   - File size limit: 2MB
*/
EOF

print_success "Client Cloudinary config template created"

# Step 7: Create environment template files
print_status "Creating environment template files..."
cat > .env.template << EOF
# Environment Variables Template for $CLIENT_NAME
# Copy this to .env.local and fill in the actual values

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_API_KEY=your_api_key_here

# App Configuration
VITE_APP_TITLE="${CLIENT_NAME} Pickleball Tournament"
VITE_CLIENT_NAME="${CLIENT_NAME}"
EOF

print_success "Environment template created"

# Step 8: Update index.html title
print_status "Updating index.html title..."
sed -i.bak "s/<title>.*<\/title>/<title>${CLIENT_NAME} Pickleball Tournament<\/title>/" index.html
rm index.html.bak
print_success "Index.html title updated"

# Step 9: Create client setup checklist
print_status "Creating client setup checklist..."
cat > CLIENT_SETUP_CHECKLIST.md << EOF
# ${CLIENT_NAME} Pickleball App Setup Checklist

## Pre-requisites
- [ ] Firebase account access
- [ ] Cloudinary account created
- [ ] Domain purchased (if using custom domain)

## Firebase Setup
- [ ] Create new Firebase project: \`${FIREBASE_PROJECT_ID}\`
- [ ] Enable Authentication (Email/Password provider)
- [ ] Create Firestore database
- [ ] Enable Storage
- [ ] Enable Functions
- [ ] Enable Hosting
- [ ] Copy Firebase config to \`src/utils/firebase.js\`
- [ ] Deploy Firestore rules: \`firebase deploy --only firestore:rules\`
- [ ] Deploy Storage rules: \`firebase deploy --only storage\`
- [ ] Deploy Functions: \`firebase deploy --only functions\`

## Cloudinary Setup
- [ ] Create Cloudinary account
- [ ] Create upload presets (see \`src/utils/cloudinary-client-config.js\`)
- [ ] Update Cloudinary config in code
- [ ] Test image upload functionality

## Branding Updates
- [ ] Replace logo files in \`src/assets/\`
  - [ ] \`main_logo.png\` - Main application logo
  - [ ] \`hpl_logo.png\` - Header logo
  - [ ] \`login.jpg\` - Login page background
  - [ ] \`favicon.ico\` - Browser favicon
- [ ] Update team logos (if applicable)
- [ ] Update sponsor logos in \`src/assets/bottomlogos/\` and \`src/assets/changinglogos/\`
- [ ] Update color scheme in \`tailwind.config.js\` (if needed)

## Configuration
- [ ] Copy \`.env.template\` to \`.env.local\`
- [ ] Fill in all environment variables
- [ ] Update Firebase config in \`src/utils/firebase.js\`
- [ ] Update Cloudinary config in \`src/utils/cloudinary.js\`

## Deployment
- [ ] Install dependencies: \`npm install\`
- [ ] Test locally: \`npm run dev\`
- [ ] Build for production: \`npm run build\`
- [ ] Deploy to Firebase: \`firebase deploy\`
- [ ] Configure custom domain (if applicable)

## Initial Data Setup
- [ ] Create admin user account
- [ ] Create initial tournament (if needed)
- [ ] Set up venues
- [ ] Import player data (if available)
- [ ] Configure news/content

## Testing
- [ ] User registration/login
- [ ] Tournament creation
- [ ] Player/team management
- [ ] Match scoring
- [ ] Image uploads
- [ ] Display screens
- [ ] API endpoints

## Go-Live
- [ ] Final testing on production
- [ ] Client training
- [ ] Documentation handover
- [ ] Support contact information provided

## Notes
- Original app repository: [Add original repo URL]
- Client contact: [Add client contact info]
- Go-live date: [Add target date]
- Support contact: [Add support contact]
EOF

print_success "Client setup checklist created"

# Step 10: Create deployment script
print_status "Creating deployment script..."
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for client
set -e

echo "Building application..."
npm run build

echo "Deploying to Firebase..."
firebase deploy

echo "Deployment complete!"
echo "Your app is now live at: https://$(firebase hosting:channel:list | grep -o '[a-z0-9-]*\.web\.app' | head -1)"
EOF

chmod +x scripts/deploy.sh
print_success "Deployment script created"

# Step 11: Clean up original files that shouldn't be in client version
print_status "Cleaning up original-specific files..."
rm -f CLIENT_DUPLICATION_GUIDE.md
rm -f scripts/duplicate-for-client.sh

print_success "Cleanup completed"

# Step 12: Create initial commit
print_status "Creating initial commit..."
git add .
git commit -m "Initial commit for ${CLIENT_NAME} pickleball app

- Configured for Firebase project: ${FIREBASE_PROJECT_ID}
- Updated branding placeholders
- Created setup checklist and templates
- Ready for client-specific configuration"

print_success "Initial commit created"

# Final summary
echo ""
echo "=========================================="
print_success "CLIENT DUPLICATION COMPLETED!"
echo "=========================================="
echo ""
print_status "Client Directory: $CLIENT_DIR"
print_status "Firebase Project: $FIREBASE_PROJECT_ID"
echo ""
print_warning "NEXT STEPS:"
echo "1. cd $CLIENT_DIR"
echo "2. Follow the checklist in CLIENT_SETUP_CHECKLIST.md"
echo "3. Update Firebase configuration in src/utils/firebase.js"
echo "4. Update Cloudinary configuration in src/utils/cloudinary.js"
echo "5. Replace branding assets in src/assets/"
echo "6. Test locally with: npm run dev"
echo "7. Deploy with: ./scripts/deploy.sh"
echo ""
print_status "For detailed instructions, see CLIENT_SETUP_CHECKLIST.md"
echo ""
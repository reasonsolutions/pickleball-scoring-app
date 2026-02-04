# Quick Client Duplication Guide

## TL;DR - Fast Track Setup

### 1. Run the Automation Script
```bash
# From your current app directory
./scripts/duplicate-for-client.sh "client-name" "firebase-project-id"

# Example:
./scripts/duplicate-for-client.sh "acme-sports" "acme-pickleball-app"
```

### 2. Set Up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project with the ID you used above
3. Enable: Authentication, Firestore, Storage, Functions, Hosting
4. Copy config from Project Settings → General → Your apps

### 3. Set Up Cloudinary
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Create upload presets (see generated config file)
3. Copy Cloud Name, API Key

### 4. Configure the New App
```bash
cd ../client-name-pickleball-app

# Update Firebase config
# Edit src/utils/firebase.js with your Firebase config

# Update Cloudinary config  
# Edit src/utils/cloudinary.js with your Cloudinary details

# Install and test
npm install
npm run dev
```

### 5. Deploy
```bash
# Deploy Firebase rules and functions
firebase deploy --only firestore:rules,storage,functions

# Build and deploy app
npm run build
firebase deploy
```

## What the Script Does

✅ **Automated Tasks**:
- Creates complete copy of your app
- Updates package.json with client name
- Configures Firebase project ID
- Creates configuration templates
- Sets up environment files
- Creates deployment scripts
- Generates setup checklist
- Initializes git repository

⚠️ **Manual Tasks Required**:
- Create Firebase project
- Create Cloudinary account
- Update Firebase configuration
- Update Cloudinary configuration
- Replace branding assets
- Test functionality

## File Structure After Duplication

```
client-name-pickleball-app/
├── CLIENT_SETUP_CHECKLIST.md     # Step-by-step setup guide
├── .env.template                  # Environment variables template
├── src/utils/
│   ├── firebase-client-config.js  # Firebase config template
│   └── cloudinary-client-config.js # Cloudinary config template
├── scripts/
│   └── deploy.sh                  # Deployment script
└── [all other app files]
```

## Configuration Files to Update

### 1. Firebase Configuration
**File**: `src/utils/firebase.js`
```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### 2. Cloudinary Configuration
**File**: `src/utils/cloudinary.js`
```javascript
export const CLOUDINARY_CONFIG = {
  cloudName: 'your-cloud-name',
  apiKey: 'your-api-key',
  uploadPreset: 'client_player_photos'
};
```

## Branding Assets to Replace

### Required Assets (`src/assets/`):
- `main_logo.png` - Main app logo
- `hpl_logo.png` - Header logo  
- `login.jpg` - Login background
- `favicon.ico` - Browser icon

### Optional Assets:
- Team logos (if client has specific teams)
- Sponsor logos in `bottomlogos/` and `changinglogos/`
- Any tournament-specific imagery

## Database Considerations

### Option 1: Clean Start (Recommended)
- New client starts with empty database
- Creates their own tournaments, players, teams
- No data migration needed

### Option 2: Template Data
- Copy sample tournaments as templates
- Client can modify and use as starting point
- Good for quick demos

### Option 3: Data Migration
- Export specific data from original app
- Transform and import to new Firebase project
- More complex but preserves existing data

## Cost Estimation Per Client

### Firebase (Pay-as-you-go):
- **Free tier**: 50K reads, 20K writes, 1GB storage
- **Typical monthly cost**: $10-50 depending on usage
- **Hosting**: Free for reasonable traffic

### Cloudinary:
- **Free tier**: 25K transformations, 25GB storage
- **Paid plans**: Start at $89/month for higher usage

### Domain:
- **Annual cost**: $10-15 for standard domains

### Development Time:
- **Initial setup**: 4-8 hours
- **Customization**: 8-16 hours depending on requirements

## Security Best Practices

### Firebase Security:
- Each client has completely separate Firebase project
- No cross-client data access possible
- Independent security rules per client

### Access Control:
- Set up client-specific admin accounts
- Use role-based permissions
- Regular security audits

## Maintenance Strategy

### Shared Codebase Approach:
1. Maintain core app in main repository
2. Client-specific configurations in separate repos
3. Apply updates selectively per client
4. Use feature flags for client-specific features

### Independent Approach:
1. Each client has completely separate codebase
2. Updates applied manually to each client
3. More work but maximum flexibility
4. No risk of breaking other clients

## Support and Handover

### Client Handover Package:
- [ ] Admin credentials
- [ ] Setup documentation
- [ ] User training materials
- [ ] Support contact information
- [ ] Maintenance schedule

### Ongoing Support:
- Monthly health checks
- Security updates
- Feature requests
- Performance monitoring

## Troubleshooting Common Issues

### "Firebase project not found"
- Verify project ID in `.firebaserc`
- Ensure you have access to the Firebase project
- Check Firebase CLI login: `firebase login`

### "Upload preset not found"
- Create upload presets in Cloudinary console
- Verify preset names match configuration
- Ensure presets are set to "Unsigned" mode

### "Permission denied" errors
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check user authentication status
- Verify security rules allow the operation

### Build/deployment failures
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for environment variable issues
- Verify Firebase project configuration

## Quick Commands Reference

```bash
# Create client duplicate
./scripts/duplicate-for-client.sh "client-name" "firebase-project-id"

# Navigate to client app
cd ../client-name-pickleball-app

# Install dependencies
npm install

# Run locally
npm run dev

# Deploy rules and functions
firebase deploy --only firestore:rules,storage,functions

# Build and deploy app
npm run build
firebase deploy

# Check deployment status
firebase hosting:channel:list
```

## Need Help?

1. Check `CLIENT_SETUP_CHECKLIST.md` in the duplicated app
2. Review `CLIENT_DUPLICATION_GUIDE.md` for detailed instructions
3. Test each step locally before deploying
4. Contact support if you encounter issues

---

**Time to duplicate**: ~30 minutes with automation script
**Time to fully configure**: 2-4 hours depending on customization needs
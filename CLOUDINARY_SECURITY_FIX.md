# Cloudinary Security Fix Guide

## ⚠️ CRITICAL SECURITY ISSUE DETECTED

Your Cloudinary credentials are **exposed in the codebase**:

### Exposed Credentials Found In:
1. **`src/utils/cloudinary.js`** (Line 363)
   - API Key: `177176766543861`
   - Timestamp: Visible in delete function

2. **`src/utils/cloudinaryAdmin.js`** (Lines 3-4)
   - API Key: `177176766543861`
   - API Secret: `lPyZYWStoPEby5WRgPBag370sMQ`
   - **CRITICAL**: API Secret should NEVER be in client-side code

3. **`CLOUDINARY_SETUP.md`** (Line 33)
   - Full CLOUDINARY_URL with credentials

## 🔒 Security Risks

With exposed credentials, attackers can:
- ✗ Upload unlimited images (consume your credits)
- ✗ Delete your images
- ✗ Access your Cloudinary account
- ✗ Modify upload presets
- ✗ Access sensitive image data

## ✅ Immediate Actions Required

### Step 1: Rotate Your Credentials

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings → API Keys**
3. Click **Regenerate** next to your API Key
4. Click **Regenerate** next to your API Secret
5. Update your environment variables

### Step 2: Update Environment Variables

Create/update `.env.local`:

```bash
# .env.local (NEVER commit this file)
VITE_CLOUDINARY_CLOUD_NAME=dchlpsvwh
VITE_CLOUDINARY_UPLOAD_PRESET=player_photos
```

**Important:** API Key and Secret should ONLY be in backend/server code, never in frontend.

### Step 3: Update Frontend Code

Replace hardcoded credentials with environment variables:

```javascript
// ✅ CORRECT - Use environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ❌ WRONG - Never hardcode credentials
const API_KEY = '177176766543861'; // EXPOSED!
const API_SECRET = 'lPyZYWStoPEby5WRgPBag370sMQ'; // EXPOSED!
```

### Step 4: Remove Credentials from Git History

```bash
# Remove sensitive files from git history
git filter-branch --tree-filter 'rm -f src/utils/cloudinaryAdmin.js' HEAD

# Or use git-filter-repo (recommended)
git filter-repo --path src/utils/cloudinaryAdmin.js --invert-paths

# Force push (only if you own the repo)
git push origin --force --all
```

### Step 5: Update .gitignore

```bash
# .gitignore
.env
.env.local
.env.*.local
src/utils/cloudinaryAdmin.js
```

## 🛠️ Secure Implementation

### For Client-Side (Frontend)

Only use **unsigned uploads** with upload presets:

```javascript
// ✅ SECURE - Unsigned upload with preset
export const uploadPlayerPhoto = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/players');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  return response.json();
};
```

### For Server-Side (Backend/Firebase Functions)

Use API Key + Secret for admin operations:

```javascript
// ✅ SECURE - Server-side only
// functions/cloudinaryAdmin.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.deleteImage = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const result = await cloudinary.uploader.destroy(data.publicId);
    return result;
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## 📋 Checklist

- [ ] Regenerate API Key in Cloudinary Console
- [ ] Regenerate API Secret in Cloudinary Console
- [ ] Create `.env.local` with new credentials
- [ ] Update `src/utils/cloudinary.js` to use environment variables
- [ ] Delete `src/utils/cloudinaryAdmin.js` (move to backend if needed)
- [ ] Remove credentials from `CLOUDINARY_SETUP.md`
- [ ] Update `.gitignore`
- [ ] Remove sensitive files from git history
- [ ] Commit changes
- [ ] Verify no credentials in git log: `git log -p | grep -i "api_key\|api_secret"`
- [ ] Test uploads still work with new credentials

## 🔍 Verification

### Check for Exposed Credentials

```bash
# Search for API keys in codebase
grep -r "177176766543861" .
grep -r "lPyZYWStoPEby5WRgPBag370sMQ" .
grep -r "api_key" . --include="*.js" --include="*.jsx"
grep -r "api_secret" . --include="*.js" --include="*.jsx"
```

### Check Git History

```bash
# Search git history for credentials
git log -p | grep -i "api_key\|api_secret\|177176766543861"

# Check all branches
git log --all -p | grep -i "api_key\|api_secret"
```

## 📚 Best Practices

### ✅ DO:
- ✅ Use environment variables for all credentials
- ✅ Use unsigned uploads with presets for client-side
- ✅ Keep API Secret only in backend/server code
- ✅ Rotate credentials regularly
- ✅ Use `.env.local` for local development
- ✅ Add sensitive files to `.gitignore`
- ✅ Review git history before pushing
- ✅ Use Firebase Cloud Functions for admin operations

### ❌ DON'T:
- ❌ Hardcode credentials in source code
- ❌ Commit `.env` files to git
- ❌ Expose API Secret in frontend code
- ❌ Use API Key for client-side operations
- ❌ Share credentials in chat/email
- ❌ Use same credentials across environments
- ❌ Log credentials to console in production

## 🚨 If Credentials Are Compromised

1. **Immediately regenerate** API Key and Secret in Cloudinary Console
2. **Update environment variables** in all deployments
3. **Review Cloudinary logs** for unauthorized access
4. **Check Firebase logs** for suspicious activity
5. **Audit all images** for unauthorized uploads
6. **Consider deleting** compromised images

## Resources

- [Cloudinary Security Best Practices](https://cloudinary.com/documentation/solution_overview#security)
- [Environment Variables in Vite](https://vitejs.dev/guide/env-and-modes.html)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Priority:** CRITICAL
**Action Required:** Immediately rotate credentials
**Timeline:** Complete within 24 hours

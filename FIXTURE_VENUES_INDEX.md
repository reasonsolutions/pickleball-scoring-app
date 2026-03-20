# Fixture Venues Update - Complete Index

## 📚 Overview

This is a complete solution for updating venue information in Firestore fixtures by matching `team1` with the teams collection. The solution includes multiple scripts, documentation, and tools for verification and execution.

## 🚀 Quick Start (Choose One)

### Option 1: Interactive Menu (Easiest)
```bash
node fixture-venues-menu.mjs
```
Provides an interactive menu to verify setup, run updates, and view documentation.

### Option 2: Automated Script
```bash
bash run-fixture-venue-update.sh
```
Automatically verifies setup and runs the update with confirmation.

### Option 3: Manual Steps
```bash
# Step 1: Verify setup
node verify-fixture-venues-setup.mjs

# Step 2: Run update
node update-fixture-venues.mjs
```

## 📁 Files Included

### Core Scripts

| File | Type | Purpose |
|------|------|---------|
| [`update-fixture-venues.mjs`](update-fixture-venues.mjs) | Node.js | Main update script - reads fixtures, matches teams, updates venues |
| [`verify-fixture-venues-setup.mjs`](verify-fixture-venues-setup.mjs) | Node.js | Verification script - checks setup, permissions, and data structure |
| [`fixture-venues-menu.mjs`](fixture-venues-menu.mjs) | Node.js | Interactive menu - user-friendly interface for all operations |
| [`run-fixture-venue-update.sh`](run-fixture-venue-update.sh) | Bash | Automated runner - checks prerequisites and runs update |

### Documentation

| File | Purpose |
|------|---------|
| [`FIXTURE_VENUES_QUICK_START.md`](FIXTURE_VENUES_QUICK_START.md) | 5-minute quick start guide |
| [`UPDATE_FIXTURE_VENUES_SCRIPT.md`](UPDATE_FIXTURE_VENUES_SCRIPT.md) | Detailed technical documentation |
| [`FIXTURE_VENUES_INDEX.md`](FIXTURE_VENUES_INDEX.md) | This file - complete overview |

## 🔧 Setup Requirements

### 1. Firebase Service Account Key

Download from Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select project: **pickleball-app-9ccf7**
3. Click ⚙️ (gear icon) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save as `firebase-service-account.json` in project root

### 2. Node.js Dependencies

```bash
npm install firebase-admin
```

Already included in `package.json`, but ensure it's installed:
```bash
npm install
```

## 📊 How It Works

### Data Flow

```
Fixtures Collection
    ↓
Read all fixtures
    ↓
For each fixture:
  - Extract team1 ID
  - Look up team in Teams collection
  - Get venue and venueName from team
  - Update fixture with venue data
    ↓
Updated Fixtures Collection
```

### Example

**Input Fixture:**
```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "",
  "venueName": ""
}
```

**Team Lookup:**
```json
{
  "id": "vzNaUifldcbpekMfFQa0",
  "name": "Gladiators PC",
  "venue": "Pick Paddlers",
  "venueName": "Pick Paddlers"
}
```

**Output Fixture:**
```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "Pick Paddlers",
  "venueName": "Pick Paddlers"
}
```

## 🎯 Script Details

### update-fixture-venues.mjs

**Purpose:** Main update script

**Features:**
- Fetches all fixtures from Firestore
- Matches team1 with teams collection
- Updates venue and venueName fields
- Detailed logging of all operations
- Error handling and reporting
- Summary statistics

**Usage:**
```bash
node update-fixture-venues.mjs
```

**Output:**
```
🚀 Starting fixture venue update process...

📋 Found 45 fixtures

📝 Fixture fixture_id_1 (Team Name)
   Team ID: vzNaUifldcbpekMfFQa0
   Old Venue: "" / ""
   New Venue: "Pick Paddlers" / "Pick Paddlers"
   ✅ Updated

============================================================
📊 SUMMARY
============================================================
✅ Successfully updated: 12
⏭️  Skipped: 33
❌ Errors: 0
📋 Total processed: 45
============================================================
```

### verify-fixture-venues-setup.mjs

**Purpose:** Verify setup before running update

**Checks:**
- ✅ Service account file exists
- ✅ Firebase connection works
- ✅ Firestore collections exist
- ✅ Fixture structure is valid
- ✅ Team structure is valid
- ✅ Fixtures that need updating exist

**Usage:**
```bash
node verify-fixture-venues-setup.mjs
```

### fixture-venues-menu.mjs

**Purpose:** Interactive menu interface

**Options:**
1. Verify Setup
2. Run Update
3. View Documentation
4. Check Service Account
5. Exit

**Usage:**
```bash
node fixture-venues-menu.mjs
```

### run-fixture-venue-update.sh

**Purpose:** Automated runner with prerequisites check

**Steps:**
1. Checks for service account file
2. Checks for Node.js installation
3. Installs firebase-admin if needed
4. Runs verification
5. Asks for confirmation
6. Runs update

**Usage:**
```bash
bash run-fixture-venue-update.sh
```

## 🔍 Verification Checklist

Before running the update, verify:

- [ ] Firebase service account JSON downloaded
- [ ] File saved as `firebase-service-account.json` in project root
- [ ] Node.js installed (`node --version`)
- [ ] firebase-admin installed (`npm list firebase-admin`)
- [ ] Verification script passes (`node verify-fixture-venues-setup.mjs`)
- [ ] Firestore backup created (optional but recommended)

## 🛠️ Troubleshooting

### Common Issues

**Issue:** "Service account file not found"
```bash
# Solution: Download from Firebase Console (see Setup Requirements)
ls -la firebase-service-account.json
```

**Issue:** "Permission denied" errors
```bash
# Solution: Ensure service account has Firestore permissions
# Go to Firebase Console → IAM & Admin
# Grant "Cloud Datastore User" or "Editor" role
```

**Issue:** "No fixtures are being updated"
```bash
# Check if fixtures exist
firebase firestore:inspect fixtures

# Check if team1 is populated
firebase firestore:inspect fixtures/fixture_id

# Check if teams exist
firebase firestore:inspect teams
```

**Issue:** "Team not found" warnings
```bash
# Verify team IDs in fixtures match teams collection
firebase firestore:inspect teams
```

For more troubleshooting, see [`UPDATE_FIXTURE_VENUES_SCRIPT.md`](UPDATE_FIXTURE_VENUES_SCRIPT.md#troubleshooting)

## 📈 Performance

- **Speed:** ~1-2 seconds per 100 fixtures
- **Firestore Reads:** 1 per fixture + 1 per unique team
- **Firestore Writes:** 1 per fixture that needs updating
- **Cost:** Minimal (read/write operations only)

## 🔐 Security

**Important:** Never commit the service account file to version control!

```bash
# Add to .gitignore
echo "firebase-service-account.json" >> .gitignore

# Verify it's in .gitignore
cat .gitignore | grep firebase-service-account.json
```

## 📚 Documentation

### Quick References

- **5-minute setup:** [`FIXTURE_VENUES_QUICK_START.md`](FIXTURE_VENUES_QUICK_START.md)
- **Detailed guide:** [`UPDATE_FIXTURE_VENUES_SCRIPT.md`](UPDATE_FIXTURE_VENUES_SCRIPT.md)
- **This file:** [`FIXTURE_VENUES_INDEX.md`](FIXTURE_VENUES_INDEX.md)

### Key Sections

- [Setup Requirements](#setup-requirements)
- [How It Works](#how-it-works)
- [Script Details](#script-details)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## 🚀 Getting Started

### Step 1: Download Service Account Key
See [Setup Requirements](#setup-requirements) above

### Step 2: Choose Your Method

**Easiest (Interactive Menu):**
```bash
node fixture-venues-menu.mjs
```

**Automated (Bash Script):**
```bash
bash run-fixture-venue-update.sh
```

**Manual (Step by Step):**
```bash
node verify-fixture-venues-setup.mjs
node update-fixture-venues.mjs
```

### Step 3: Monitor Progress
Watch the console output for:
- ✅ Successfully updated fixtures
- ⏭️ Skipped fixtures
- ❌ Any errors

### Step 4: Verify Results
Check Firebase Console to confirm updates:
1. Go to https://console.firebase.google.com/
2. Select project: pickleball-app-9ccf7
3. Go to Firestore Database
4. Check fixtures collection for updated venue fields

## 💡 Advanced Usage

### Dry Run (Preview Changes)

Edit `update-fixture-venues.mjs` and comment out the update:

```javascript
// await updateFixtureVenue(id, venue, venueName);
console.log(`   ✅ Would update (dry run)`);
```

### Filter by Tournament

Add to `update-fixture-venues.mjs`:

```javascript
const fixtures = await getAllFixtures();
const filtered = fixtures.filter(f => f.tournamentId === 'YOUR_TOURNAMENT_ID');
```

### Add Delay Between Updates

Add to `update-fixture-venues.mjs` in the loop:

```javascript
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
```

### Custom Logging

Modify the logging in `update-fixture-venues.mjs` to save results to a file:

```javascript
const fs = require('fs');
const logStream = fs.createWriteStream('update-results.log');
logStream.write(JSON.stringify(updates, null, 2));
```

## 📞 Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [`UPDATE_FIXTURE_VENUES_SCRIPT.md`](UPDATE_FIXTURE_VENUES_SCRIPT.md)
3. Check Firebase documentation: https://firebase.google.com/docs/firestore
4. Check Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

## 📋 Related Scripts

Other scripts in the project:
- `check-team-venue.mjs` - Check team venue information
- `add-venue-to-teams.mjs` - Add venue information to teams
- `cleanup-fixtures.js` - Clean up fixture data

## ✅ Completion Checklist

After running the update:

- [ ] Verification script passed
- [ ] Update script completed successfully
- [ ] No errors in console output
- [ ] Summary shows expected number of updates
- [ ] Verified results in Firebase Console
- [ ] Service account file added to .gitignore

## 🎉 You're All Set!

You now have a complete solution for updating fixture venues. Choose your preferred method above and get started!

---

**Last Updated:** 2026-03-11
**Project:** Pickleball Scoring App
**Firebase Project:** pickleball-app-9ccf7

# Fixture Venues Update - Quick Start Guide

## 🚀 Quick Start (2 minutes)

### Step 1: Login to Firebase CLI

```bash
firebase login
```

This will open a browser to authenticate with your Google account.

### Step 2: Run the Update Script

```bash
# Option A: Using the automated script (recommended)
bash run-fixture-venue-update.sh

# Option B: Direct execution
node update-fixture-venues.mjs
```

## 📋 What This Does

The script automatically:

1. **Reads all fixtures** from the `fixtures` collection
2. **Matches team1** with teams in the `teams` collection
3. **Copies venue data** from the matched team
4. **Updates fixtures** with the venue information
5. **Logs all changes** with detailed reporting

### Example

**Before:**
```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "",
  "venueName": ""
}
```

**After:**
```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "Pick Paddlers",
  "venueName": "Pick Paddlers"
}
```

## 📊 Expected Output

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

## 🛠️ Troubleshooting

### "Firebase CLI not found"

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version
```

### "Not logged in" error

```bash
# Login to Firebase
firebase login

# Verify you're logged in
firebase projects:list
```

### "No fixtures are being updated"

Check these:

```bash
# 1. Verify fixtures exist
firebase firestore:inspect fixtures

# 2. Check if team1 field is populated
firebase firestore:inspect fixtures/fixture_id

# 3. Verify teams exist
firebase firestore:inspect teams

# 4. Check team venue fields
firebase firestore:inspect teams/team_id
```

## 📁 Files Created

| File | Purpose |
|------|---------|
| `update-fixture-venues.mjs` | Main update script |
| `run-fixture-venue-update.sh` | Automated runner script |
| `UPDATE_FIXTURE_VENUES_SCRIPT.md` | Detailed documentation |
| `FIXTURE_VENUES_QUICK_START.md` | This file |

## 📈 Performance

- **Speed**: ~1-2 seconds per 100 fixtures
- **Firestore Reads**: 1 per fixture + 1 per unique team
- **Firestore Writes**: 1 per fixture that needs updating
- **Cost**: Minimal (read/write operations only)

## ✅ Checklist Before Running

- [ ] Firebase CLI installed (`firebase --version`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Node.js installed (`node --version`)
- [ ] node-fetch available (in package.json)
- [ ] Backup of Firestore data (optional but recommended)

## 🎯 Next Steps

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Run update: `node update-fixture-venues.mjs`
4. Check results in Firebase Console

---

**Questions?** Check the detailed documentation in [`UPDATE_FIXTURE_VENUES_SCRIPT.md`](UPDATE_FIXTURE_VENUES_SCRIPT.md)

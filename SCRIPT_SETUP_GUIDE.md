# Remove Dropped Players from Teams - Script Setup Guide

## Overview
The `remove-dropped-players-from-teams-cli.mjs` script removes player IDs from the `teams` collection when those players have been dropped from a club (indicated by the `former-club` field in the `clubs-players` collection).

This script uses the Firestore REST API with Firebase CLI authentication, similar to `add-venue-to-teams-cli.mjs`.

## Prerequisites

You need Firebase CLI installed and authenticated. Here's how to set it up:

### Setup Instructions

1. **Install Firebase CLI (if not already installed):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```
   This will open a browser window to authenticate with your Google account.

3. **Run the script:**
   ```bash
   node remove-dropped-players-from-teams-cli.mjs
   ```
   
   Or make it executable and run directly:
   ```bash
   chmod +x remove-dropped-players-from-teams-cli.mjs
   ./remove-dropped-players-from-teams-cli.mjs
   ```

## What the Script Does

1. **Fetches all players** from the `clubs-players` collection
2. **Identifies dropped players** - those with a `former-club` field set
3. **Finds corresponding teams** - uses the `former-club` ID to find the team via `hplClubId` field
4. **Removes player IDs** - removes the dropped player's ID from the team's `playerIds` array
5. **Provides detailed logging** - shows which players were removed from which teams

## Expected Output

```
🚀 Starting to remove dropped players from teams...

📊 Found 150 players in clubs-players collection

🔍 Found 5 dropped players

✅ Removed John Doe (player-123) from team Team A
✅ Removed Jane Smith (player-456) from team Team B
ℹ️  Player Mike Johnson not found in team Team C
⚠️  No team found for club club-789 (Player: Sarah Williams)

============================================================
📋 SUMMARY
============================================================
✅ Updated: 4 player removals
⚠️  Not found: 1 teams
📊 Total dropped players processed: 5
============================================================

✨ Done!
```

## Troubleshooting

### Error: "Could not load the default credentials"
- Make sure you've either:
  - Placed the service account key file in the project root, OR
  - Run `gcloud auth application-default login`

### Error: "Service account key file not found"
- This is just a warning. The script will try to use application default credentials instead.
- If you want to use a service account key, download it from Firebase Console and save it as `pickleball-app-9ccf7-firebase-adminsdk-key.json`

### Error: "No team found for club..."
- This means the club ID in the `former-club` field doesn't match any team's `hplClubId`
- Check that the club ID is correct in the player's document

## Security Notes

⚠️ **Important:** The service account key file contains sensitive credentials. 
- Never commit it to version control
- Add `pickleball-app-9ccf7-firebase-adminsdk-key.json` to `.gitignore`
- Keep it secure and don't share it

## Running the Script Safely

The script is read-safe and only performs updates on the `teams` collection. Before running:

1. **Backup your data** (optional but recommended)
2. **Review the output** - the script will show what it's about to do
3. **Run the script** - it will process all dropped players

## Firestore Rules

The Firestore rules already allow this script to:
- Read from `clubs-players` collection (public read access)
- Read from `teams` collection (public read access)
- Update `teams` collection (authenticated users can update)

No rule changes are needed.

## Questions?

If you encounter any issues:
1. Check that you have the correct Firebase project ID: `pickleball-app-9ccf7`
2. Verify your credentials are set up correctly
3. Check the Firestore console to ensure the data structure matches expectations

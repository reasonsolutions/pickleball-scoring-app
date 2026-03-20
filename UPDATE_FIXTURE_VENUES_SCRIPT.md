# Update Fixture Venues Script

This script automatically updates venue information in the `fixtures` collection by matching `team1` with the `teams` collection and copying the venue and venueName fields.

## Overview

The script performs the following operations:

1. **Fetches all fixtures** from the Firestore `fixtures` collection
2. **Matches team1** in each fixture with the corresponding team in the `teams` collection
3. **Extracts venue data** (venue and venueName) from the matched team
4. **Updates fixtures** with the venue information from the team
5. **Provides detailed logging** of all operations and changes

## Prerequisites

### 1. Firebase Service Account Key

You need a Firebase service account JSON file to authenticate with Firebase Admin SDK.

**Steps to get the service account key:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pickleball-app-9ccf7`
3. Click the gear icon (⚙️) → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file as `firebase-service-account.json` in the project root directory

### 2. Node.js Dependencies

Ensure `firebase-admin` is installed:

```bash
npm install firebase-admin
```

The script uses the following dependencies (already in package.json):
- `firebase-admin` - Firebase Admin SDK for server-side operations

## Setup

### Option 1: Using Environment Variable (Recommended)

```bash
export FIREBASE_SERVICE_ACCOUNT=/path/to/firebase-service-account.json
node update-fixture-venues.mjs
```

### Option 2: Default Location

Place `firebase-service-account.json` in the project root directory:

```bash
cp /path/to/your/firebase-service-account.json ./firebase-service-account.json
node update-fixture-venues.mjs
```

## Usage

### Run the Script

```bash
node update-fixture-venues.mjs
```

### Expected Output

```
🚀 Starting fixture venue update process...

📋 Found 45 fixtures

📝 Fixture fixture_id_1 (Team Name)
   Team ID: vzNaUifldcbpekMfFQa0
   Old Venue: "" / ""
   New Venue: "Pick Paddlers" / "Pick Paddlers"
   ✅ Updated

⏭️  Skipping fixture fixture_id_2 - team1 is empty

✓ Fixture fixture_id_3 (Team Name) - Already up to date

============================================================
📊 SUMMARY
============================================================
✅ Successfully updated: 12
⏭️  Skipped: 33
❌ Errors: 0
📋 Total processed: 45
============================================================
```

## Data Flow

### Input (Fixtures Collection)

```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "",
  "venueName": "",
  "date": "2026-04-17T00:00:00Z",
  "matchNumber": 7,
  "status": "scheduled"
}
```

### Lookup (Teams Collection)

```json
{
  "id": "vzNaUifldcbpekMfFQa0",
  "name": "Gladiators PC",
  "venue": "Pick Paddlers",
  "venueName": "Pick Paddlers",
  "tournamentId": "nKAu6TNNWBcSvRL14oeK"
}
```

### Output (Updated Fixtures Collection)

```json
{
  "id": "fixture_123",
  "team1": "vzNaUifldcbpekMfFQa0",
  "team1Name": "Ye",
  "venue": "Pick Paddlers",
  "venueName": "Pick Paddlers",
  "date": "2026-04-17T00:00:00Z",
  "matchNumber": 7,
  "status": "scheduled"
}
```

## Script Behavior

### What Gets Updated

- **venue**: Copied from `teams[team1].venue`
- **venueName**: Copied from `teams[team1].venueName`

### What Gets Skipped

1. **Empty team1**: Fixtures with empty or missing `team1` field
2. **Team not found**: Fixtures where `team1` doesn't match any team in the teams collection
3. **Already up to date**: Fixtures where venue and venueName already match the team's values

### Error Handling

- Individual fixture errors are logged but don't stop the script
- The script continues processing remaining fixtures
- Exit code is 1 if any errors occurred, 0 if successful

## Logging Details

The script provides detailed logging for each fixture:

- **✅ Updated**: Fixture was successfully updated with new venue data
- **⏭️ Skipping**: Fixture was skipped (empty team1, team not found, or already up to date)
- **⚠️ Warning**: Team referenced in fixture was not found in teams collection
- **❌ Error**: An error occurred while processing the fixture

## Performance Considerations

- **Batch Processing**: The script processes fixtures sequentially
- **Firestore Reads**: One read per fixture + one read per unique team
- **Firestore Writes**: One write per fixture that needs updating
- **Estimated Time**: ~1-2 seconds per 100 fixtures (depending on network)

## Troubleshooting

### Error: "Service account file not found"

**Solution**: Ensure the Firebase service account JSON file exists at the specified path.

```bash
# Check if file exists
ls -la firebase-service-account.json

# Or set the environment variable
export FIREBASE_SERVICE_ACCOUNT=/full/path/to/firebase-service-account.json
```

### Error: "Permission denied"

**Solution**: Ensure your service account has the necessary Firestore permissions:

1. Go to Firebase Console → IAM & Admin
2. Ensure the service account has "Editor" or "Cloud Datastore User" role
3. Or create a custom role with these permissions:
   - `datastore.entities.get`
   - `datastore.entities.list`
   - `datastore.entities.update`

### No fixtures are being updated

**Possible causes:**

1. **Empty fixtures collection**: Check if fixtures exist in Firestore
2. **team1 field is empty**: Verify fixtures have valid team1 IDs
3. **Teams don't exist**: Verify team IDs in fixtures match teams in the teams collection
4. **Venues already set**: Check if venue and venueName are already populated

**Debug steps:**

```bash
# Check fixtures
firebase firestore:inspect fixtures

# Check teams
firebase firestore:inspect teams

# Check specific fixture
firebase firestore:inspect fixtures/fixture_id
```

## Advanced Usage

### Dry Run (View Changes Without Updating)

To see what would be changed without actually updating, modify the script to comment out the `updateFixtureVenue()` call:

```javascript
// await updateFixtureVenue(id, venue, venueName);
console.log(`   ✅ Would update (dry run)`);
```

### Filter by Tournament

To update only fixtures from a specific tournament, add a filter:

```javascript
const fixtures = await getAllFixtures();
const filtered = fixtures.filter(f => f.tournamentId === 'nKAu6TNNWBcSvRL14oeK');
```

### Batch Updates with Delay

To avoid rate limiting, add a delay between updates:

```javascript
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
```

## Security Notes

- **Never commit** `firebase-service-account.json` to version control
- Add to `.gitignore`:
  ```
  firebase-service-account.json
  ```
- Use environment variables in production
- Restrict service account permissions to minimum required

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Firebase Admin SDK documentation: https://firebase.google.com/docs/admin/setup
3. Check Firestore documentation: https://firebase.google.com/docs/firestore

## Related Scripts

- `check-team-venue.mjs` - Check team venue information
- `add-venue-to-teams.mjs` - Add venue information to teams
- `cleanup-fixtures.js` - Clean up fixture data

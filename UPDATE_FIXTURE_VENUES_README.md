# Update Fixture Venues Script

This script updates the `venue` and `venueName` fields in the fixtures collection based on the team1's venue information from the teams collection. It follows the same pattern as `add-venue-id-to-teams.mjs` using the Firestore REST API.

## What it does

1. Fetches all teams from the teams collection
2. Creates a map of team IDs to their venue information (`venueId` and `venue` name)
3. Fetches all fixtures from the fixtures collection
4. For each fixture, looks up the team1's venue information from the map
5. Updates the fixture's `venue` field with the team's `venueId`
6. Updates the fixture's `venueName` field with the team's `venue` name
7. Skips fixtures that are already up to date
8. Provides a detailed summary of updates, skips, and errors

## Data Mapping

- Fixture `venue` field ← Team `venueId` field
- Fixture `venueName` field ← Team `venue` field

## Prerequisites

1. Firebase CLI installed and authenticated
2. Node.js with ES modules support (v14+)
3. `node-fetch` package (should be available in the project)

## Authentication

Make sure you're logged in with Firebase CLI:

```bash
firebase login
```

## Usage

```bash
node update-fixture-venues.mjs
```

## Output

The script will display:
- Verification that Firebase CLI is available
- Number of teams with venue information found
- Progress for each fixture being processed
- Summary statistics (updated, skipped, not found, permission denied)

## Example Output

```
🚀 Starting to update fixture venues...

✅ Firebase CLI is available

👥 Fetching teams...
✅ Found 25 teams with venue information

📋 Fetching fixtures...
✅ Found 45 fixtures

Processing fixtures:

✅ Updated fixture "abc123"
   Team: TRP (r2MwImQTx42L2EOCxBKo)
   Venue ID: LbTmPJ49YHkPtZM04f08
   Venue Name: 48 PicklePark

✓ Fixture "def456" already up to date (48 PicklePark)

⏭️  Fixture "ghi789" has no team1, skipping...

============================================================
📋 SUMMARY
============================================================
Total fixtures processed: 45
✅ Successfully updated: 42
⏭️  Already up to date: 2
❌ Failed to match: 1
🔒 Permission denied: 0
============================================================

✨ Done!
```

## Notes

- The script uses the Firestore REST API with Firebase CLI authentication
- Only updates fixtures where the venue information differs from the team's venue
- Fixtures without a team1 are skipped
- If a team is not found in the venue map, the fixture is skipped
- All updates are logged for audit purposes
- The script is idempotent - running it multiple times is safe

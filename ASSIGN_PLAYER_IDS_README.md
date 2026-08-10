# Assign Player IDs to Fixtures Script

## Overview

This script matches player names in fixtures with their corresponding player IDs from the `players` collection and adds ID fields to the fixture documents.

## What It Does

1. **Fetches all fixtures** from the `fixtures` collection
2. **Fetches all players** from the `players` collection
3. **Matches player names** to player IDs, ensuring tournament IDs match
4. **Adds new ID fields** to fixtures:
   - `player1Team1Id` - ID for player1Team1
   - `player2Team1Id` - ID for player2Team1
   - `player1Team2Id` - ID for player1Team2
   - `player2Team2Id` - ID for player2Team2
   - `gameBreakerPlayersTeam1Ids` - Array of IDs for dream breaker team 1
   - `gameBreakerPlayersTeam2Ids` - Array of IDs for dream breaker team 2

## Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - You need a `serviceAccountKey.json` file in the project root
   - Download from Firebase Console → Project Settings → Service Accounts

2. **Node.js** version 14 or higher

## Installation

No additional packages needed - uses existing dependencies.

## Usage

### Run the script:

```bash
node assign-player-ids-to-fixtures.mjs
```

### Make it executable (optional):

```bash
chmod +x assign-player-ids-to-fixtures.mjs
./assign-player-ids-to-fixtures.mjs
```

## How It Works

### Player Name Matching

The script normalizes player names for matching:
- Converts to lowercase
- Trims whitespace
- Replaces multiple spaces with single space

Example:
- "PRATAP RAO" matches "pratap rao" matches "Pratap  Rao"

### Tournament ID Validation

The script ensures that:
- Only players with matching `tournamentId` are considered
- Fixtures without `tournamentId` are skipped
- Players without `tournamentId` are ignored

### Multiple Matches

If multiple players have the same name in the same tournament:
- The script uses the first match
- A warning is displayed
- You may need to manually verify these cases

## Output

The script provides detailed output:

```
🚀 Starting player ID assignment to fixtures...

📥 Fetching all fixtures...
✓ Found 150 fixtures

📥 Fetching all players...
✓ Found 500 players

🔨 Building player name to ID mapping...
✓ Built mapping for 5 tournaments

🔄 Processing fixtures...

📝 Processing fixture 3vdue8XoRBqj7s4jioZd...
   ✓ player1Team1: "PRATAP RAO" → ID: abc123
   ✓ player2Team1: "G Manoj kasyap" → ID: def456
   ✓ player1Team2: "Saigopal nallamotu" → ID: ghi789
   ✓ player2Team2: "Ashleesh Koganti" → ID: jkl012
   ✅ Updated fixture 3vdue8XoRBqj7s4jioZd

======================================================================
📊 SUMMARY
======================================================================
Total fixtures processed: 150
Successfully updated: 145
Skipped (no changes needed): 3
Errors: 2
======================================================================

✅ Script completed successfully!
```

## What Gets Updated

### Before:
```javascript
{
  player1Team1: "PRATAP RAO",
  player2Team1: "G Manoj kasyap",
  player1Team2: "Saigopal nallamotu",
  player2Team2: "Ashleesh Koganti",
  tournamentId: "nKAu6TNNWBcSvRL14oeK"
}
```

### After:
```javascript
{
  player1Team1: "PRATAP RAO",
  player1Team1Id: "abc123xyz",
  player2Team1: "G Manoj kasyap",
  player2Team1Id: "def456uvw",
  player1Team2: "Saigopal nallamotu",
  player1Team2Id: "ghi789rst",
  player2Team2: "Ashleesh Koganti",
  player2Team2Id: "jkl012opq",
  tournamentId: "nKAu6TNNWBcSvRL14oeK"
}
```

## Dream Breaker Matches

For fixtures with `matchType: 'dreamBreaker'` or `fixtureType: 'dreambreaker'`:

### Before:
```javascript
{
  gameBreakerPlayersTeam1: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6", "Player 7", "Player 8"],
  gameBreakerPlayersTeam2: ["Player A", "Player B", "Player C", "Player D", "Player E", "Player F", "Player G", "Player H"]
}
```

### After:
```javascript
{
  gameBreakerPlayersTeam1: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6", "Player 7", "Player 8"],
  gameBreakerPlayersTeam1Ids: ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8"],
  gameBreakerPlayersTeam2: ["Player A", "Player B", "Player C", "Player D", "Player E", "Player F", "Player G", "Player H"],
  gameBreakerPlayersTeam2Ids: ["idA", "idB", "idC", "idD", "idE", "idF", "idG", "idH"]
}
```

## Safety Features

- **Non-destructive**: Only adds new fields, doesn't modify existing data
- **Idempotent**: Can be run multiple times safely
- **Validation**: Checks tournament IDs match before assigning
- **Detailed logging**: Shows exactly what's being updated
- **Error handling**: Continues processing even if individual updates fail

## Troubleshooting

### No matches found for player names

**Possible causes:**
1. Player name spelling differs between fixtures and players collection
2. Player doesn't exist in players collection
3. Player exists but has different tournament ID

**Solution:**
- Check the exact spelling in both collections
- Verify tournament IDs match
- Manually add missing players to players collection

### Multiple matches warning

**Cause:** Multiple players with the same name in the same tournament

**Solution:**
- Review the fixture manually
- Consider adding additional matching criteria (e.g., team ID)
- Update player names to be unique

### Script fails to start

**Possible causes:**
1. Missing `serviceAccountKey.json`
2. Invalid service account credentials
3. Network connectivity issues

**Solution:**
- Verify service account key file exists
- Check Firebase project permissions
- Test internet connection

## Notes

- The script preserves existing player name fields
- ID fields are only added/updated, never removed
- Run during off-peak hours for large datasets
- Consider backing up your database before running

## Support

For issues or questions, check the Firebase console logs or contact the development team.

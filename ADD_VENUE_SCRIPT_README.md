# Add Venue Field to Teams Script

This script adds the `venue` field to all teams in the Firestore database.

## Prerequisites

1. **Google Cloud SDK** - Install from https://cloud.google.com/sdk/docs/install
2. **Node.js** - Version 14 or higher
3. **Firebase Admin SDK** - Already installed in the project

## Setup

### Step 1: Authenticate with Google Cloud

Run the following command to authenticate:

```bash
gcloud auth application-default login
```

This will open a browser window for you to sign in with your Google account. Make sure you're using an account that has access to the `pickleball-app-9ccf7` Firebase project.

### Step 2: Run the Script

Navigate to the project root directory and run:

```bash
node add-venue-to-teams.mjs
```

## What the Script Does

1. Connects to the Firestore database using Firebase Admin SDK
2. Fetches all teams from the `teams` collection
3. Matches each team name with the venue mapping
4. Updates each team document with the `venue` field
5. Displays a summary of updates

## Venue Mapping

The script uses the following team-to-venue mapping:

| Team Name | Venue |
|-----------|-------|
| 48 | 48 PicklePark |
| The Build Crew | Pro-touch Manikonda |
| FALCONS | House of Play (HOP) |
| Bend it Club | Bend it BNR Hills |
| DRC Sports Foundation | Ready Set Pickle |
| Jubilee Hills Pickleball Club | Pickleball Collective - DMart |
| Penguin | Vanam |
| TRP | The Rooftop Pickle (TRP) |
| Racket Garden Academy | Racket Garden |
| Paddock | Paddock - Rooftop Pickle |
| Ye | Vanam |
| Courtyard Crusaders | The Pickleball Courtyard |
| Vikings Pickleball club | House of Play (HOP) |
| SOO Collective | SOO Coffee and Pickleball |
| Gladiators PC | Pick Paddlers |
| Badgers | Softserve |
| Deccan collective | Olympians arena , apollo hospital |
| The PB Social | The Pickleball Social |
| Pro-touch | Pro-touch Manikonda |
| BELLEZZA | Lodha Bellezza |

## Firestore Rules Update

The `firestore.rules` file has been updated to allow the `venue` field in team documents:

```firestore
(data.venue == null || data.venue is string) &&
```

This allows the `venue` field to be optional (null) or a string value.

## Output Example

```
🚀 Starting to add venue field to teams...

📊 Found 20 teams in database

✅ Updated 48 with venue: 48 PicklePark
✅ Updated The Build Crew with venue: Pro-touch Manikonda
✅ Updated FALCONS with venue: House of Play (HOP)
...

============================================================
📋 SUMMARY
============================================================
✅ Updated: 20 teams
❌ Not found: 0 teams
📊 Total: 20 teams
============================================================

✨ Done!
```

## Troubleshooting

### Error: "Could not load the default credentials"

Make sure you've run `gcloud auth application-default login` first.

### Error: "Permission denied"

Make sure your Google account has the necessary permissions in the Firebase project. Contact the project owner if needed.

### Some teams not updated

If some teams show "Not found", it means their names don't match the venue mapping. You can:
1. Update the team names in the database to match the mapping
2. Add new entries to the `venueMapping` object in the script

## Reverting Changes

If you need to remove the `venue` field from all teams, you can run:

```bash
firebase firestore:delete teams --recursive
```

**Warning**: This will delete all team documents. Only use if you have a backup.

## Support

For issues or questions, contact the development team.

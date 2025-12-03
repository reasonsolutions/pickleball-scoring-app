# Pickleball Match REST API Documentation

This REST API allows you to retrieve comprehensive match data including scores, team information, player names, substitutions, serve changes, and more through simple GET requests.

## Base URLs

### Direct Function URLs (Recommended for API calls)
```
https://us-central1-pickleball-app-9ccf7.cloudfunctions.net
```

### Hosted URLs (Through Firebase Hosting)
```
https://pickleball-app-9ccf7.web.app/api
```

## Authentication
Currently, the API is open and doesn't require authentication. All endpoints support CORS for cross-origin requests.

## Endpoints

### 1. Get Complete Match Data
**GET** `/api/match/{matchId}`

Retrieves comprehensive match information including all details about the match.

#### Parameters
- `matchId` (path parameter) - The unique identifier for the match

#### Response
```json
{
  "matchId": "match-123",
  "status": "live",
  "lastUpdated": "2025-01-18T11:17:54.185Z",
  "tournament": "HPL Season 1",
  "round": "Quarter Final",
  "court": "Court 1",
  "date": "2025-01-18",
  "time": "14:30",
  "gamesCount": 3,
  "pointsPerGame": [11, 11, 11],
  "isDoubles": true,
  "teams": {
    "team1": {
      "id": "team-alpha",
      "name": "Team Alpha",
      "logo": "https://example.com/logo1.png",
      "players": {
        "player1": "John Doe",
        "player2": "Jane Smith"
      }
    },
    "team2": {
      "id": "team-beta",
      "name": "Team Beta",
      "logo": "https://example.com/logo2.png",
      "players": {
        "player1": "Mike Johnson",
        "player2": "Sarah Wilson"
      }
    }
  },
  "scores": {
    "player1": {
      "game1": 11,
      "game2": 8,
      "game3": 0
    },
    "player2": {
      "game1": 9,
      "game2": 11,
      "game3": 0
    }
  },
  "currentGame": 2,
  "serving": {
    "player": "player1",
    "sequence": 0,
    "teamServeCount": 1
  },
  "events": [],
  "substitutions": [],
  "timeoutsUsed": {
    "team1": 0,
    "team2": 1
  },
  "drsReviewsLeft": {
    "team1": 1,
    "team2": 0
  },
  "youtubeLink": "https://youtube.com/watch?v=abc123",
  "youtubeLiveLink": "https://youtube.com/live/xyz789"
}
```

### 2. Get Match Score (Simplified)
**GET** `/api/match/{matchId}/score`

Retrieves current score data in a simplified format, perfect for scoreboards and displays.

#### Parameters
- `matchId` (path parameter) - The unique identifier for the match

#### Response
```json
{
  "matchId": "match-123",
  "lastUpdated": "2025-01-18T11:17:54.185Z",
  "matchStatus": "live",
  "isDoubles": true,
  "tableData": [
    {
      "playerName": "John Doe/ Jane Smith",
      "teamName": "Team Alpha",
      "teamLogoUrl": "https://example.com/logo1.png",
      "points": 19,
      "serve": "1"
    },
    {
      "playerName": "Mike Johnson/ Sarah Wilson",
      "teamName": "Team Beta",
      "teamLogoUrl": "https://example.com/logo2.png",
      "points": 20,
      "serve": ""
    }
  ],
  "substitutions": [
    {
      "team": "team1",
      "teamName": "Team Alpha",
      "playerOut": "John Doe",
      "playerIn": "Alex Brown",
      "timestamp": "2025-01-18T11:15:30.000Z",
      "game": 2,
      "score": "8-9"
    }
  ],
  "totalSubstitutions": 1
}
```

**Note:** The `playerName` field in `tableData` now shows the current players after applying all substitutions. The `substitutions` array contains the complete history of player changes.

### 3. Get Match Events
**GET** `/api/match/{matchId}/events`

Retrieves match events including substitutions, serve changes, timeouts, and DRS reviews.

#### Parameters
- `matchId` (path parameter) - The unique identifier for the match

#### Response
```json
{
  "matchId": "match-123",
  "lastUpdated": "2025-01-18T11:17:54.185Z",
  "events": [
    {
      "type": "substitution",
      "timestamp": "2025-01-18T11:15:30.000Z",
      "team": "team1",
      "playerOut": "John Doe",
      "playerIn": "Alex Brown",
      "game": 2,
      "score": "8-9"
    },
    {
      "type": "serve_change",
      "timestamp": "2025-01-18T11:16:45.000Z",
      "from": "player1",
      "to": "player2",
      "game": 2,
      "score": "10-9"
    },
    {
      "type": "timeout",
      "timestamp": "2025-01-18T11:17:00.000Z",
      "team": "team2",
      "game": 2,
      "score": "10-11"
    }
  ],
  "substitutions": [
    {
      "team": "team1",
      "playerOut": "John Doe",
      "playerIn": "Alex Brown",
      "timestamp": "2025-01-18T11:15:30.000Z",
      "game": 2
    }
  ],
  "timeouts": {
    "team1Used": 0,
    "team2Used": 1
  },
  "drsReviews": {
    "team1Left": 1,
    "team2Left": 0
  },
  "serveChanges": [
    {
      "type": "serve_change",
      "timestamp": "2025-01-18T11:16:45.000Z",
      "from": "player1",
      "to": "player2",
      "game": 2,
      "score": "10-9"
    }
  ]
}
```

### 4. Get Multiple Matches
**GET** `/api/matches`

Retrieves a list of matches with optional filtering.

#### Query Parameters
- `tournament` (optional) - Filter by tournament name
- `status` (optional) - Filter by match status (`scheduled`, `live`, `completed`)
- `date` (optional) - Filter by match date (YYYY-MM-DD format)
- `limit` (optional) - Maximum number of matches to return (default: 50)

#### Example Request
```
GET /api/matches?tournament=HPL%20Season%201&status=live&limit=10
```

#### Response
```json
{
  "matches": [
    {
      "matchId": "match-123",
      "tournament": "HPL Season 1",
      "round": "Quarter Final",
      "date": "2025-01-18",
      "time": "14:30",
      "status": "live",
      "teams": {
        "team1": {
          "name": "Team Alpha",
          "logo": "https://example.com/logo1.png"
        },
        "team2": {
          "name": "Team Beta",
          "logo": "https://example.com/logo2.png"
        }
      },
      "isDoubles": true,
      "currentScore": {
        "team1": 19,
        "team2": 20
      }
    }
  ],
  "total": 1,
  "filters": {
    "tournament": "HPL Season 1",
    "status": "live",
    "date": null,
    "limit": 10
  }
}
```

## Legacy Endpoint (Backward Compatibility)

### Get Match Data (Legacy)
**GET** `/basic-score/{matchId}.json`

This endpoint maintains backward compatibility with your existing system.

#### Response
Same format as `/api/match/{matchId}/score`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (match doesn't exist)
- `500` - Internal Server Error

## Usage Examples

### JavaScript/Fetch
```javascript
// Get complete match data
const response = await fetch('https://your-project-id.web.app/api/match/match-123');
const matchData = await response.json();

// Get current score
const scoreResponse = await fetch('https://your-project-id.web.app/api/match/match-123/score');
const scoreData = await scoreResponse.json();

// Get match events
const eventsResponse = await fetch('https://your-project-id.web.app/api/match/match-123/events');
const eventsData = await eventsResponse.json();

// Get live matches
const liveMatches = await fetch('https://your-project-id.web.app/api/matches?status=live');
const matchesList = await liveMatches.json();
```

### cURL
```bash
# Get complete match data
curl "https://your-project-id.web.app/api/match/match-123"

# Get current score
curl "https://your-project-id.web.app/api/match/match-123/score"

# Get match events
curl "https://your-project-id.web.app/api/match/match-123/events"

# Get matches by tournament
curl "https://your-project-id.web.app/api/matches?tournament=HPL%20Season%201"
```

### Python
```python
import requests

# Get complete match data
response = requests.get('https://your-project-id.web.app/api/match/match-123')
match_data = response.json()

# Get current score
score_response = requests.get('https://your-project-id.web.app/api/match/match-123/score')
score_data = score_response.json()

# Get live matches
live_matches = requests.get('https://your-project-id.web.app/api/matches?status=live')
matches_list = live_matches.json()
```

## Data Models

### Match Status Values
- `scheduled` - Match is scheduled but not started
- `live` - Match is currently in progress
- `completed` - Match has finished
- `cancelled` - Match was cancelled

### Event Types
- `substitution` - Player substitution
- `serve_change` - Serve changed between players/teams
- `timeout` - Team timeout
- `drs_review` - Decision Review System challenge
- `game_end` - End of a game
- `match_end` - End of the match

### Serve Information
- `player` - Currently serving player (`player1` or `player2`)
- `sequence` - Serve sequence number (0 or 1 for doubles)
- `teamServeCount` - Team serve count (0 = first serve, 1 = second serve)

## Rate Limiting
Currently, there are no rate limits imposed, but this may change in the future. Please use the API responsibly.

## Support
For API support or questions, please contact the development team.
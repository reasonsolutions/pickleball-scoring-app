# Pickleball Match API - Quick Reference

## 🚀 Ready-to-Use API Endpoints

Your REST API is now live and ready to use! Here are the direct URLs:

### Base URL
```
https://us-central1-pickleball-app-9ccf7.cloudfunctions.net
```

## 📋 Quick Endpoints

### 1. Get All Matches
```bash
GET https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatches
```

### 2. Get Complete Match Data
```bash
GET https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatch/{matchId}
```

### 3. Get Match Score (Simplified)
```bash
GET https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchScore/{matchId}
```

### 4. Get Match Events (Substitutions, Serve Changes, etc.)
```bash
GET https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchEvents/{matchId}
```

### 5. Legacy Endpoint (Backward Compatible)
```bash
GET https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchData
```

## 🔥 Quick Test Commands

### Using cURL
```bash
# Get all matches
curl "https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatches"

# Get specific match (replace YOUR_MATCH_ID)
curl "https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatch/YOUR_MATCH_ID"

# Get match score
curl "https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchScore/YOUR_MATCH_ID"

# Get live matches only
curl "https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatches?status=live"
```

### Using JavaScript
```javascript
// Get all matches
const matches = await fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatches')
  .then(res => res.json());

// Get specific match
const match = await fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatch/YOUR_MATCH_ID')
  .then(res => res.json());

// Get match score
const score = await fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchScore/YOUR_MATCH_ID')
  .then(res => res.json());
```

### Using Python
```python
import requests

# Get all matches
matches = requests.get('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatches').json()

# Get specific match
match = requests.get('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatch/YOUR_MATCH_ID').json()

# Get match score
score = requests.get('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/getMatchScore/YOUR_MATCH_ID').json()
```

## 📊 What Data You Get

### Complete Match Data (`/getMatch/{matchId}`)
- ✅ Match details (tournament, round, court, date, time)
- ✅ Team information (names, logos, players)
- ✅ Current scores for all games
- ✅ Serve information (who's serving, serve count)
- ✅ Match events (substitutions, timeouts, DRS)
- ✅ YouTube links (live stream, recorded)
- ✅ Match status (scheduled, live, completed)

### Simplified Score Data (`/getMatchScore/{matchId}`)
- ✅ Current total scores
- ✅ Player/team names (updated with substitutions)
- ✅ Team logos
- ✅ Serve indicators
- ✅ Singles/doubles detection
- ✅ **NEW:** Complete substitution history (incoming/outgoing players)
- ✅ **NEW:** Total substitution count

### Match Events (`/getMatchEvents/{matchId}`)
- ✅ All substitutions with timestamps
- ✅ Serve changes
- ✅ Timeouts used
- ✅ DRS reviews remaining
- ✅ Complete event timeline

## 🎯 Common Use Cases

### For Scoreboards/Displays
Use: `/getMatchScore/{matchId}`
- Perfect for live scoreboards
- Clean, simple format
- Shows current serve status

### For Match Analysis
Use: `/getMatch/{matchId}`
- Complete match information
- All historical data
- Perfect for detailed analysis

### For Event Tracking
Use: `/getMatchEvents/{matchId}`
- Track substitutions
- Monitor serve changes
- Review timeouts and challenges

### For Match Lists
Use: `/getMatches?status=live`
- Get all live matches
- Filter by tournament
- Perfect for match schedules

## 🔧 Testing Your API

Run the test script:
```bash
node test-api.js
```

Or test manually with any match ID from your database.

## 🚨 Important Notes

1. **CORS Enabled**: API works from any domain
2. **No Authentication**: Currently open access
3. **Real-time Data**: Pulls live data from Firestore
4. **Error Handling**: Returns proper HTTP status codes
5. **Backward Compatible**: Legacy endpoints still work

## 📞 Support

- Check the full documentation: `API_DOCUMENTATION.md`
- Test with: `test-api.js`
- All endpoints return JSON format
- All timestamps in ISO 8601 format
# DUPR Integration Setup Guide

This guide explains how to set up and use the DUPR (Dynamic Universal Pickleball Rating) integration for automatically fetching player ratings.

## 🎯 Overview

The DUPR integration allows the admin clubs page to automatically fetch doubles and singles ratings for players from the DUPR API. This is implemented using the unofficial DUPR API at `https://api.dupr.gg` in Firebase Cloud Functions.

## 🏗️ Architecture

```
Frontend (React) → Firebase Cloud Function → DUPR API → Player Ratings
```

1. **Frontend**: Admin clubs page displays players with DUPR rating columns
2. **Backend**: Firebase Cloud Function uses DUPR API client to fetch ratings
3. **DUPR API**: Authenticates with api.dupr.gg and retrieves player data

## ✅ **INTEGRATION STATUS: COMPLETE & WORKING**

- ✅ Authentication with DUPR API successful
- ✅ Firebase Cloud Functions deployed
- ✅ Frontend integration complete
- ✅ Real-time rating fetching operational

## 📁 Files Created/Modified

### Backend Files
- `functions/duprScraper.js` - Puppeteer-based DUPR scraper
- `functions/index.js` - Added getDuprRatings and testDuprScraping functions
- `functions/package.json` - Added puppeteer dependency

### Frontend Files
- `src/services/duprService.js` - DUPR service with real and mock implementations
- `src/pages/AdminClubs.jsx` - Enhanced with DUPR rating columns and functionality

### Documentation
- `DUPR_INTEGRATION_SETUP.md` - This setup guide

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install puppeteer
```

### 2. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

### 3. Configure DUPR Credentials

The DUPR credentials are currently hardcoded in `functions/duprScraper.js`:

```javascript
this.credentials = {
  email: 'hpl@centrecourt.ventures',
  password: 'Sid12**'
};
```

**For production, move these to environment variables:**

```bash
firebase functions:config:set dupr.email="hpl@centrecourt.ventures" dupr.password="Sid12**"
```

Then update the scraper to use:
```javascript
this.credentials = {
  email: functions.config().dupr.email,
  password: functions.config().dupr.password
};
```

### 4. Test the Integration

#### Option A: Test via Cloud Function
Visit: `https://your-project.cloudfunctions.net/testDuprScraping`

#### Option B: Test via Admin Interface
1. Navigate to `http://localhost:5173/admin/clubs`
2. Login with admin credentials
3. Click on "Players" tab
4. Click "Refresh DUPR Ratings" button

## 🎮 How to Use

### Admin Interface Usage

1. **Access Admin Clubs Page**
   ```
   http://localhost:5173/admin/clubs
   ```

2. **View Player Ratings**
   - Navigate to "Players" tab
   - DUPR ratings are fetched automatically on page load
   - View columns: Doubles Rating, Singles Rating, Original Rating

3. **Manual Refresh**
   - Click "Refresh DUPR Ratings" button
   - Loading indicator shows progress
   - Ratings update in real-time

### Player Table Columns

| Column | Description | Color |
|--------|-------------|-------|
| Player Name | Name and email | - |
| DUPR ID | Player's DUPR identifier | - |
| **Doubles Rating** | Live rating from DUPR | 🟢 Green |
| **Singles Rating** | Live rating from DUPR | 🟣 Purple |
| Original Rating | Rating from registration | 🔵 Blue |
| Age | Calculated from DOB | - |
| Gender | Player gender | - |
| Registration Date | When they registered | - |

## 🔧 Technical Details

### DUPR Scraping Process

1. **Browser Launch**: Puppeteer launches headless Chrome
2. **Login**: Navigates to dashboard.dupr.com/login
3. **Authentication**: Enters credentials and submits form
4. **Player Pages**: Visits each player's profile page
5. **Data Extraction**: Scrapes doubles and singles ratings
6. **Cleanup**: Closes browser and returns results

### API Endpoints

#### GET /getDuprRatings
**Purpose**: Fetch DUPR ratings for multiple players

**Request**:
```json
{
  "duprIds": ["DUPR123456", "DUPR789012"]
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "duprId": "DUPR123456",
      "doublesRating": "4.2",
      "singlesRating": "3.8",
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /testDuprScraping
**Purpose**: Test DUPR scraping functionality

**Response**:
```json
{
  "success": true,
  "testResults": [...],
  "message": "DUPR scraping test completed"
}
```

### Error Handling

The system gracefully handles various error scenarios:

- **No DUPR ID**: Shows "N/A" for ratings
- **Invalid DUPR ID**: Shows "N/A" with error message
- **DUPR Login Failed**: Shows error in console, falls back to "N/A"
- **Network Issues**: Shows API error message
- **Rate Limiting**: Includes delays between requests

## 🛠️ Development vs Production

### Development Mode
- Uses mock data by default for faster development
- Switch to real implementation by changing:
  ```javascript
  // In AdminClubs.jsx
  const updatedPlayers = await duprService.realFetchMultiplePlayerRatings(playersData);
  ```

### Production Mode
- Uses real DUPR scraping via Firebase Cloud Functions
- Requires deployed functions and proper credentials
- Includes comprehensive error handling and logging

## 🚨 Important Considerations

### CORS Limitations
- Direct browser-to-DUPR requests are blocked by CORS
- Backend scraping is required for real implementation
- Mock data is used for development/testing

### Rate Limiting
- 2-second delays between player requests
- Respectful scraping to avoid overwhelming DUPR servers
- Consider caching results for frequently accessed players

### Security
- DUPR credentials should be stored as environment variables
- Use Firebase Functions config for sensitive data
- Implement proper authentication for admin endpoints

### Performance
- Cloud Functions have 9-minute timeout for large batches
- Consider processing players in smaller batches for large datasets
- Implement progress tracking for better UX

## 🔍 Troubleshooting

### Common Issues

1. **"Dummy data showing"**
   - Check if using `mockFetchMultiplePlayerRatings` instead of `realFetchMultiplePlayerRatings`
   - Verify Firebase Functions are deployed
   - Check browser console for API errors

2. **"Login failed"**
   - Verify DUPR credentials are correct
   - Check if DUPR website structure has changed
   - Review Cloud Function logs

3. **"Timeout errors"**
   - Reduce batch size of players processed
   - Increase Cloud Function timeout
   - Check network connectivity

4. **"CORS errors"**
   - Ensure using backend API, not direct browser requests
   - Verify Cloud Function CORS configuration

### Debugging Steps

1. **Check Cloud Function Logs**
   ```bash
   firebase functions:log --only getDuprRatings
   ```

2. **Test Individual Components**
   ```bash
   # Test scraper directly
   curl -X POST https://your-project.cloudfunctions.net/testDuprScraping
   ```

3. **Verify Player Data**
   - Check that players have valid DUPR IDs
   - Ensure DUPR IDs exist in DUPR system

## 📈 Future Enhancements

### Potential Improvements

1. **Caching**: Store ratings in Firestore to reduce API calls
2. **Batch Processing**: Process large player lists in chunks
3. **Real-time Updates**: WebSocket connections for live rating updates
4. **Error Recovery**: Retry failed requests with exponential backoff
5. **Analytics**: Track rating changes over time
6. **Notifications**: Alert when player ratings change significantly

### Scaling Considerations

- Implement Redis caching for frequently accessed players
- Use Cloud Tasks for background processing
- Consider DUPR API if/when available
- Implement player rating history tracking

## 📞 Support

For issues or questions:
1. Check Cloud Function logs first
2. Verify all dependencies are installed
3. Test with mock data to isolate issues
4. Review DUPR website for structural changes

---

**Note**: This integration relies on web scraping, which may break if DUPR changes their website structure. Monitor regularly and update selectors as needed.
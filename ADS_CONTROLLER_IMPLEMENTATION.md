# Ads Controller Implementation

## Overview
Added an "Ads Controller" button to the Streaming Venues page that allows users to upload and manage advertisement videos. Videos are stored in Cloudinary and their URLs and order are saved in the `clubs-ads` Firestore collection.

## Changes Made

### 1. New Page: `src/pages/AdsController.jsx`
- **Purpose**: Manage video uploads and ordering globally (not tied to specific venues)
- **Features**:
  - Drag-and-drop video upload interface
  - File input selection
  - Video preview with controls
  - Reorder videos (move up/down)
  - Delete videos
  - Real-time Firestore synchronization

### 2. Updated: `src/pages/StreamingVenues.jsx`
- Added "Ads Controller" button in the top-right corner
- Button navigates to `/ads-controller`
- Button includes a video icon and is styled with primary color

### 3. Updated: `src/App.jsx`
- Imported `AdsController` component
- Added route: `/ads-controller` → `<AdsController />`

### 4. Updated: `src/utils/cloudinary.js`
- Enhanced `uploadAdsImage()` function to support both images and videos
- Automatically detects file type and uses appropriate Cloudinary endpoint
- Returns resource type information for better handling

## Firestore Collection Structure

### `clubs-ads` Collection
```javascript
{
  id: "document-id",
  videoUrl: "https://...",         // Cloudinary secure URL
  publicId: "cloudinary-public-id", // For future deletion
  fileName: "video-name.mp4",      // Original file name
  uploadedAt: Timestamp,           // Upload timestamp
  order: 0                         // Display order (0 = first)
}
```

## Usage Flow

1. **Navigate to Streaming Venues**: Visit `/streaming-venues/{tournamentId}`
2. **Click Ads Controller**: Button in top-right corner
3. **Upload Videos**: 
   - Drag and drop videos onto the upload area, OR
   - Click "Select Video" button to choose from file system
4. **Manage Videos**:
   - Preview videos with built-in player
   - Reorder using "↑ Up" and "↓ Down" buttons
   - Delete videos with "Delete" button
5. **Data Persistence**: All changes are automatically saved to Firestore

## Technical Details

### Video Upload Process
1. User selects/drops a video file
2. File is uploaded to Cloudinary using unsigned upload
3. Cloudinary returns secure URL and public ID
4. Document is created in `clubs-ads` collection with:
   - Video URL
   - Public ID (for future deletion)
   - File name
   - Upload timestamp
   - Order number

### Ordering System
- Videos are sorted by `order` field (ascending)
- Moving up/down swaps order values with adjacent videos
- Order is persisted in Firestore

### Error Handling
- User-friendly error messages for upload failures
- Validation for video file types
- Confirmation dialog before deletion
- Loading states during operations

## Dependencies
- React Router for navigation
- Firebase Firestore for data persistence
- Cloudinary for video hosting
- DaisyUI for UI components

## Notes
- Videos are stored in the `pickleball_app/ads` folder in Cloudinary
- The implementation uses unsigned uploads (no API key exposure)
- All operations are real-time with Firestore
- Ads are managed globally, not tied to specific venues

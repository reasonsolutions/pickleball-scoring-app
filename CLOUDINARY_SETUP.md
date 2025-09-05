# Cloudinary Integration Setup Guide

## What Has Been Implemented

✅ **Complete Player Photo Management System**
- CloudinaryImageUpload component for photo uploads
- Player creation with photo support
- Player editing with photo updates
- Players list displaying photos and edit/delete buttons
- Firestore rules updated to validate photo data structure
- All rules deployed to Firebase

## Required Cloudinary Configuration

### Step 1: Create Upload Preset
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings → Upload**
3. Click **"Add upload preset"**
4. Configure the preset:
   - **Preset name**: `player_photos`
   - **Signing Mode**: `Unsigned`
   - **Folder**: `pickleball_app/players`
   - **Access Mode**: `Public`
   - **Resource Type**: `Image`
   - **File size limit**: 5MB (optional)
5. Click **Save**

### Step 2: Verify Configuration
Your current Cloudinary credentials are already configured:
- **Cloud Name**: `dnfcybtnn`
- **API Key**: `286571998287272`
- **Secret Key**: `8vzJDzIyxf9S9WxqEH9Enegy26o`

## Features Implemented

### 1. Player Creation with Photos
- Add player form now includes photo upload
- Photos are uploaded to Cloudinary and URLs stored in Firestore
- Supports drag & drop and click to upload
- File validation (image types, 5MB limit)

### 2. Player Editing
- Click edit button on any player row
- Modal opens with current player data
- Can update photo, name, age, gender, DUPR ID
- Photo preview shows current image

### 3. Players List Enhancement
- Displays player photos as avatars
- Shows placeholder with initials if no photo
- Edit and delete buttons for each player
- Responsive table layout

### 4. Error Handling
- Specific error messages for upload failures
- Cloudinary configuration validation
- User-friendly error alerts

## File Structure

```
src/
├── components/
│   └── CloudinaryImageUpload.jsx    # Photo upload component
├── utils/
│   └── cloudinary.js                # Cloudinary integration
└── pages/
    └── AddPlayersTeams.jsx          # Enhanced with photo features
```

## Database Schema

Players collection now includes:
```javascript
{
  name: string,
  age: number | null,
  gender: string,
  duprId: string,
  photo: {
    url: string,        // Cloudinary URL
    publicId: string    // For deletion
  } | null,
  tournamentId: string,
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Testing Instructions

1. **Create the upload preset** (see Step 1 above)
2. **Navigate to a tournament**
3. **Go to Add Players/Teams**
4. **Try adding a player with photo**:
   - Fill in player details
   - Click the photo upload area
   - Select an image file
   - Submit the form
5. **Test editing**:
   - Click edit button on a player
   - Update photo or details
   - Save changes

## Troubleshooting

### "Upload preset not found" Error
- Ensure you've created the `player_photos` preset in Cloudinary
- Verify the preset is set to "Unsigned" mode
- Check the preset name matches exactly

### Upload Fails
- Check file size (must be under 5MB)
- Ensure file is an image type (PNG, JPG, etc.)
- Verify internet connection
- Check browser console for detailed errors

### Photos Not Displaying
- Check if Cloudinary URLs are valid
- Verify Firestore rules are deployed
- Check browser network tab for failed requests

## Next Steps

The player photo management system is now fully functional. Once you create the upload preset in Cloudinary, you can:

1. Add players with photos
2. Edit existing players and update their photos
3. View all players with their profile pictures
4. Delete players (photos remain in Cloudinary for now)

## Optional Enhancements

For production use, consider:
- Implementing photo deletion from Cloudinary when players are deleted
- Adding image transformation (resize, crop) in Cloudinary
- Implementing bulk photo upload for multiple players
- Adding photo compression before upload
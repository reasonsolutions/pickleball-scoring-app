# Team Admin Invitation Feature - Setup Guide

## Overview
This feature allows super admins to invite team admins via email. The invited users receive an email with a dynamic link to set up their password. The name and email fields are pre-filled and greyed out on the setup page.

## Components Created/Modified

### 1. Frontend Components

#### [`src/pages/AppUsers.jsx`](src/pages/AppUsers.jsx)
- Added "Invite Team Admin" button in the header
- Created invitation modal with form fields:
  - Name (text input)
  - Email (email input)
  - Phone Number (tel input)
  - Team (dropdown populated from active tournament teams)
- Implemented invitation logic that:
  - Validates form inputs
  - Checks for existing users with the same email
  - Generates a unique invite token
  - Creates a new user document in `ccpl-users` collection with `verified: false`
  - Calls the Cloud Function to send the invitation email
  - Displays success/error messages

#### [`src/pages/TeamAdminSetupPassword.jsx`](src/pages/TeamAdminSetupPassword.jsx) (NEW)
- Public page accessible via `/team-admin/setup-password?token=<invite_token>`
- Features:
  - Token validation on page load
  - Displays user information (name, email, team) - read-only
  - Password creation form with:
    - Password field (minimum 8 characters)
    - Confirm password field
    - Show/hide password toggles
  - Password validation and matching check
  - Updates user document with hashed password and sets `verified: true`
  - Redirects to login page after successful setup

#### [`src/App.jsx`](src/App.jsx)
- Added route: `/team-admin/setup-password` → `TeamAdminSetupPassword` component
- Route is public (no authentication required)

### 2. Backend Components

#### [`functions/index.js`](functions/index.js)
- Added new Cloud Function: `sendTeamAdminInvite`
- Endpoint: `https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendTeamAdminInvite`
- Method: POST
- Request body:
  ```json
  {
    "to": "user@example.com",
    "name": "User Name",
    "teamName": "Team Name",
    "setupLink": "https://yourapp.com/team-admin/setup-password?token=..."
  }
  ```
- Sends a professionally formatted HTML email with:
  - Welcome message
  - Account details (name, email, team, role)
  - Setup password button/link
  - 48-hour expiry notice

## Database Structure

### `ccpl-users` Collection
When a team admin is invited, a new document is created with the following structure:

```javascript
{
  name: "Abhishek Reddy",
  email: "abhishekreddy245@gmail.com",
  phone: "8688084300",
  teamId: "3N3lkseoEpSKq0FJLu2p",
  tournamentId: "2d9xWaLzhI5MwQPyCOfU",
  type: "team admin",
  verified: false,                    // Set to true after password setup
  inviteToken: "unique-random-token", // Removed after password setup
  inviteTokenExpiry: Timestamp,       // 48 hours from creation
  createdAt: Timestamp,
  updatedAt: Timestamp,
  password: null,                     // Set during password setup
  otp: null,
  otpCreatedAt: null
}
```

After password setup:
```javascript
{
  // ... same fields ...
  verified: true,
  password: "hashed-password-string",
  inviteToken: null,
  inviteTokenExpiry: null,
  updatedAt: Timestamp (updated)
}
```

## Deployment Steps

### 1. Deploy Firebase Cloud Function

```bash
# Navigate to the project root
cd "/Users/siddharthreddy/Desktop/Pickleball Scoring App/Pickleball app"

# Deploy only the new function
firebase deploy --only functions:sendTeamAdminInvite

# Or deploy all functions
firebase deploy --only functions
```

### 2. Verify Function Deployment

After deployment, verify the function is accessible:
- Check Firebase Console → Functions
- The function should appear as: `sendTeamAdminInvite`
- Status should be "Active"

### 3. Test the Feature

1. **Login as Super Admin**
   - Navigate to: `http://localhost:5173/admin/app-users`
   - Or production: `https://yourapp.com/admin/app-users`

2. **Click "Invite Team Admin" Button**
   - Fill in the form:
     - Name: Test User
     - Email: test@example.com
     - Phone: 1234567890
     - Team: Select from dropdown
   - Click "Send Invitation"

3. **Check Email**
   - The invited user should receive an email
   - Email contains a setup link with format:
     `https://yourapp.com/team-admin/setup-password?token=...`

4. **Setup Password**
   - Click the link in the email
   - Verify user details are displayed correctly (greyed out)
   - Enter password (minimum 8 characters)
   - Confirm password
   - Click "Complete Setup"

5. **Verify in Database**
   - Check `ccpl-users` collection
   - User document should have:
     - `verified: true`
     - `password: <hashed-value>`
     - `inviteToken: null`

6. **Login**
   - Navigate to login page
   - Use the email and password to login
   - Should successfully authenticate as team admin

## Security Considerations

1. **Token Expiry**: Invitation links expire after 48 hours
2. **One-time Use**: Tokens are removed after password setup
3. **Email Validation**: Email format is validated before sending
4. **Password Requirements**: Minimum 8 characters
5. **Password Hashing**: Passwords are hashed using SHA-256 (consider upgrading to bcrypt in production)
6. **Duplicate Prevention**: Checks for existing users before creating invitation

## Email Template

The invitation email includes:
- CCPL branding
- Personalized greeting with user's name
- Account details summary
- Prominent "Set Up Your Password" button
- Plain text link as fallback
- 48-hour expiry notice
- Support contact information

## Troubleshooting

### Issue: Email not received
- Check spam/junk folder
- Verify email address is correct
- Check Firebase Functions logs for errors
- Verify Gmail credentials in Cloud Function

### Issue: Invalid token error
- Token may have expired (48 hours)
- Token may have already been used
- Send a new invitation

### Issue: Password setup fails
- Check browser console for errors
- Verify Firestore permissions
- Check that user document exists with correct token

### Issue: Function deployment fails
- Ensure you're in the correct directory
- Check Firebase CLI is logged in: `firebase login`
- Verify project is selected: `firebase use <project-id>`

## Future Enhancements

1. **Password Strength Indicator**: Add visual feedback for password strength
2. **Resend Invitation**: Allow admins to resend invitations
3. **Bulk Invite**: Support inviting multiple team admins at once
4. **Email Templates**: Make email templates customizable
5. **Better Password Hashing**: Implement bcrypt or similar on backend
6. **Two-Factor Authentication**: Add 2FA for team admin accounts
7. **Invitation History**: Track all sent invitations and their status

## API Reference

### Cloud Function: `sendTeamAdminInvite`

**Endpoint**: `POST https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendTeamAdminInvite`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "to": "string (required) - Email address",
  "name": "string (required) - Full name",
  "teamName": "string (required) - Team name",
  "setupLink": "string (required) - Password setup URL with token"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Team admin invitation sent successfully",
  "recipient": "user@example.com",
  "teamName": "Team Name"
}
```

**Error Response** (400/500):
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Files Modified/Created

### Created:
- `src/pages/TeamAdminSetupPassword.jsx`
- `TEAM_ADMIN_INVITE_SETUP.md` (this file)

### Modified:
- `src/pages/AppUsers.jsx`
- `src/App.jsx`
- `functions/index.js`
- `package.json` (added crypto-js dependency)

## Dependencies Added

```json
{
  "crypto-js": "^latest"
}
```

Already installed in functions:
- `nodemailer`: For sending emails
- `firebase-admin`: For Firestore operations
- `firebase-functions`: For Cloud Functions

---

**Last Updated**: August 13, 2026
**Version**: 1.0.0

# HPL Users Collection Setup Guide

## Overview

This guide explains the setup and usage of the `hpl-users` collection in Firebase Firestore. This collection is designed to store user information including email, password, phone number, and photo URL.

## ⚠️ IMPORTANT SECURITY WARNING

**Storing passwords directly in Firestore is NOT recommended for production applications.**

This implementation is provided for specific use cases, but you should consider:
- Using **Firebase Authentication** instead for secure user management
- If you must store passwords, always **hash them** using bcrypt, argon2, or similar before storing
- Never store plain-text passwords in any database

## Collection Structure

### Collection Name
`hpl-users`

### Document Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password (should be hashed) |
| `phone_number` | string | Yes | User's phone number |
| `photo_url` | string | Yes | URL to user's profile photo |
| `created_at` | timestamp | Auto | Document creation timestamp |
| `updated_at` | timestamp | Auto | Last update timestamp |

### Example Document

```json
{
  "email": "user@example.com",
  "password": "$2b$10$hashed_password_here",
  "phone_number": "+91-9876543210",
  "photo_url": "https://example.com/photos/user.jpg",
  "created_at": "2026-07-22T03:00:00.000Z",
  "updated_at": "2026-07-22T03:00:00.000Z"
}
```

## Setup Instructions

### 1. Deploy Firestore Rules

The Firestore security rules have been updated in [`firestore.rules`](firestore.rules:470-490). Deploy them using:

```bash
firebase deploy --only firestore:rules
```

### 2. Create Collection with Sample Data (Optional)

Run the setup script to create the collection with sample data:

```bash
node setup-hpl-users-collection.js
```

This will:
- Create the `hpl-users` collection
- Add 2 sample user documents
- Verify the collection was created successfully

## Security Rules

The collection has the following security rules:

```javascript
match /hpl-users/{userId} {
  // Public read access (be careful with password exposure)
  allow read: if true;
  
  // Anyone can create a user (for registration)
  allow create: if request.resource.data.keys().hasAll(['email', 'password', 'phone_number', 'photo_url']);
  
  // Users can update their own data or super admins can update any user
  allow update: if request.auth != null &&
               (request.auth.token.email == resource.data.email ||
                isSuperAdminSimple());
  
  // Only super admins can delete users
  allow delete: if request.auth != null &&
               isSuperAdminSimple();
}
```

## Usage in React Application

### Import the Service

```javascript
import {
  createHplUser,
  getHplUser,
  getHplUserByEmail,
  getAllHplUsers,
  updateHplUser,
  deleteHplUser,
  searchHplUsersByPhone,
  verifyHplUserCredentials
} from './services/hplUsersService';
```

### Create a New User

```javascript
const userData = {
  email: 'newuser@example.com',
  password: 'hashed_password_here', // Hash before passing
  phone_number: '+91-9876543210',
  photo_url: 'https://example.com/photo.jpg'
};

try {
  const userId = await createHplUser(userData);
  console.log('User created with ID:', userId);
} catch (error) {
  console.error('Error creating user:', error);
}
```

### Get User by Email

```javascript
try {
  const user = await getHplUserByEmail('user@example.com');
  if (user) {
    console.log('User found:', user);
  } else {
    console.log('User not found');
  }
} catch (error) {
  console.error('Error fetching user:', error);
}
```

### Update User Information

```javascript
try {
  await updateHplUser(userId, {
    phone_number: '+91-9999999999',
    photo_url: 'https://example.com/new-photo.jpg'
  });
  console.log('User updated successfully');
} catch (error) {
  console.error('Error updating user:', error);
}
```

### Verify User Credentials (Basic Example)

```javascript
try {
  const user = await verifyHplUserCredentials(email, hashedPassword);
  if (user) {
    console.log('Login successful:', user);
    // Note: password field is removed from returned object
  } else {
    console.log('Invalid credentials');
  }
} catch (error) {
  console.error('Error verifying credentials:', error);
}
```

### Get All Users

```javascript
try {
  const users = await getAllHplUsers(50); // Get up to 50 users
  console.log('Users:', users);
} catch (error) {
  console.error('Error fetching users:', error);
}
```

### Search by Phone Number

```javascript
try {
  const users = await searchHplUsersByPhone('+91-9876543210');
  console.log('Found users:', users);
} catch (error) {
  console.error('Error searching users:', error);
}
```

## Password Hashing Example

If you must store passwords, use a library like `bcryptjs`:

```bash
npm install bcryptjs
```

```javascript
import bcrypt from 'bcryptjs';

// Hash password before storing
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Verify password during login
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Usage
const hashedPassword = await hashPassword('user_password');
await createHplUser({
  email: 'user@example.com',
  password: hashedPassword,
  phone_number: '+91-9876543210',
  photo_url: 'https://example.com/photo.jpg'
});
```

## Files Created

1. **[`setup-hpl-users-collection.js`](setup-hpl-users-collection.js)** - Admin SDK script to create the collection
2. **[`src/services/hplUsersService.js`](src/services/hplUsersService.js)** - Client-side service for CRUD operations
3. **[`firestore.rules`](firestore.rules)** - Updated with security rules for hpl-users collection
4. **[`HPL_USERS_SETUP.md`](HPL_USERS_SETUP.md)** - This documentation file

## Best Practices

### ✅ DO:
- Hash passwords before storing them
- Use HTTPS for all API calls
- Implement rate limiting for login attempts
- Add email verification
- Use Firebase Authentication for production apps
- Validate phone numbers before storing
- Sanitize user inputs

### ❌ DON'T:
- Store plain-text passwords
- Expose password fields in public queries
- Allow unlimited login attempts
- Skip input validation
- Use this for sensitive applications without proper security

## Migration to Firebase Authentication

For production applications, consider migrating to Firebase Authentication:

```javascript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './utils/firebase';

// Register user
const registerUser = async (email, password, additionalData) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Store additional data in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email: email,
    phone_number: additionalData.phone_number,
    photo_url: additionalData.photo_url,
    created_at: serverTimestamp()
  });
  
  return userCredential.user;
};

// Login user
const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
```

## Support

For issues or questions:
1. Check Firebase Console for collection data
2. Review Firestore rules in Firebase Console
3. Check browser console for errors
4. Verify Firebase configuration in [`src/utils/firebase.js`](src/utils/firebase.js)

## License

This code is part of the Pickleball Scoring App project.

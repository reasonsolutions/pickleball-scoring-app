import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Create user document in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL || '',
        role: 'super_admin', // Default role for manual signups
        createdAt: new Date()
      });
      console.log('User document created successfully in Firestore');
    } catch (error) {
      console.log('Could not create user document in Firestore:', error.message);
      console.log('User authentication still successful, but profile data not saved to database');
    }
    
    return userCredential;
  }

  // Sign in function
  function signin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign out function
  function logout() {
    return signOut(auth);
  }

  // Get user profile from Firestore
  async function getUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.log('Firestore not available:', error.message);
      return null;
    }
  }

  // Create team admin account
  async function createTeamAdmin(email, teamName, tournamentId) {
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Store current user to restore later
      const currentUserBackup = auth.currentUser;
      
      try {
        // Try to create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const user = userCredential.user;
        
        // Update profile with display name
        await updateProfile(user, { displayName: `${teamName} Admin` });
        
        // Create user document in Firestore with team admin role
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: `${teamName} Admin`,
          photoURL: user.photoURL || '',
          role: 'team_admin',
          teamName: teamName,
          tournamentId: tournamentId,
          tempPassword: tempPassword, // Store temp password for super admin to see
          createdAt: new Date()
        });
        
        // Sign out the newly created user and restore the original user
        await signOut(auth);
        
        console.log('Team admin account created successfully');
        return { success: true, tempPassword, uid: user.uid };
        
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // Email exists, try to convert existing user to team admin
          console.log('Email already exists, attempting to convert to team admin...');
          
          // Query Firestore to find the existing user by email
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // User document exists, update it to team admin
            const userDoc = querySnapshot.docs[0];
            const existingUserData = userDoc.data();
            
            await updateDoc(doc(db, 'users', userDoc.id), {
              role: 'team_admin',
              teamName: teamName,
              tournamentId: tournamentId,
              tempPassword: tempPassword,
              displayName: `${teamName} Admin`,
              updatedAt: new Date()
            });
            
            console.log('Existing user converted to team admin successfully');
            return { success: true, tempPassword, uid: userDoc.id };
          } else {
            // User exists in Auth but not in Firestore - we can't get their UID easily
            return {
              success: false,
              error: 'An account with this email already exists but is not in our system. Please contact the user to sign in first, or use a different email.'
            };
          }
        } else {
          throw authError;
        }
      }
      
    } catch (error) {
      console.error('Error creating team admin account:', error);
      return { success: false, error: error.message };
    }
  }

  // Update team admin password (super admin only)
  async function updateTeamAdminPassword(adminUid, newPassword) {
    try {
      // Update the password in Firebase Auth would require the user to be signed in
      // For now, we'll update the temp password in Firestore
      await updateDoc(doc(db, 'users', adminUid), {
        tempPassword: newPassword,
        passwordUpdatedAt: new Date()
      });
      
      console.log('Team admin password updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating team admin password:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all team admins (super admin only)
  async function getTeamAdmins() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'team_admin'));
      const querySnapshot = await getDocs(q);
      
      const teamAdmins = [];
      querySnapshot.forEach((doc) => {
        teamAdmins.push({ id: doc.id, ...doc.data() });
      });
      
      return teamAdmins;
    } catch (error) {
      console.error('Error fetching team admins:', error);
      return [];
    }
  }

  // Create super admin account (super admin only)
  async function createSuperAdmin(email, password, displayName) {
    try {
      // Store current user to restore later
      const currentUserBackup = auth.currentUser;
      
      try {
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile with display name
        await updateProfile(user, { displayName: displayName || email });
        
        // Create user document in Firestore with super admin role
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || email,
          photoURL: user.photoURL || '',
          role: 'super_admin',
          createdAt: new Date(),
          createdBy: currentUserBackup?.uid
        });
        
        // Sign out the newly created user and restore the original user
        await signOut(auth);
        
        console.log('Super admin account created successfully');
        return { success: true, uid: user.uid };
        
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          return {
            success: false,
            error: 'An account with this email already exists. Please use a different email address.'
          };
        } else {
          throw authError;
        }
      }
      
    } catch (error) {
      console.error('Error creating super admin account:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all super admins (super admin only)
  async function getSuperAdmins() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'super_admin'));
      const querySnapshot = await getDocs(q);
      
      const superAdmins = [];
      querySnapshot.forEach((doc) => {
        superAdmins.push({ id: doc.id, ...doc.data() });
      });
      
      return superAdmins;
    } catch (error) {
      console.error('Error fetching super admins:', error);
      return [];
    }
  }

  // Get all tournaments created by super admins (super admin only)
  async function getAllSuperAdminTournaments() {
    try {
      // First get all super admins
      const superAdmins = await getSuperAdmins();
      const superAdminIds = superAdmins.map(admin => admin.uid);
      
      if (superAdminIds.length === 0) {
        return [];
      }
      
      // Get tournaments created by any super admin
      const tournamentsRef = collection(db, 'tournaments');
      const q = query(
        tournamentsRef,
        where('createdBy', 'in', superAdminIds),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const tournaments = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() });
      });
      
      return tournaments;
    } catch (error) {
      console.error('Error fetching super admin tournaments:', error);
      return [];
    }
  }

  // Get all tournaments in the database (super admin only)
  async function getAllTournaments() {
    try {
      const tournamentsRef = collection(db, 'tournaments');
      const q = query(tournamentsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const tournaments = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() });
      });
      
      return tournaments;
    } catch (error) {
      console.error('Error fetching all tournaments:', error);
      return [];
    }
  }

  // Change current user's password
  async function changePassword(currentPassword, newPassword) {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No user logged in' };
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password using the fresh Firebase Auth user object
      await updatePassword(auth.currentUser, newPassword);
      
      console.log('Password updated successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, error: 'Current password is incorrect' };
      } else if (error.code === 'auth/weak-password') {
        return { success: false, error: 'New password is too weak. Please choose a stronger password.' };
      } else if (error.code === 'auth/requires-recent-login') {
        return { success: false, error: 'Please log out and log back in before changing your password' };
      } else {
        return { success: false, error: error.message };
      }
    }
  }

  // Check if current user is super admin
  function isSuperAdmin() {
    // Check if user has super_admin role in database
    if (currentUser?.role === 'super_admin') {
      return true;
    }
    
    // Backward compatibility: if no role is set for siddharth@318digital.com, assume super admin
    if (currentUser?.email === 'siddharth@318digital.com' && !currentUser?.role) {
      return true;
    }
    
    return false;
  }

  // Check if current user is team admin
  function isTeamAdmin() {
    return currentUser?.role === 'team_admin';
  }

  // Update current user role to super admin (for existing users)
  async function setSuperAdminRole() {
    if (!currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      // Create or update user document with super admin role
      const userData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email,
        photoURL: currentUser.photoURL || '',
        role: 'super_admin',
        updatedAt: new Date()
      };
      
      // Use setDoc with merge option to create document if it doesn't exist
      await setDoc(doc(db, 'users', currentUser.uid), userData, { merge: true });
      
      // Refresh user data
      const userProfile = await getUserProfile(currentUser.uid);
      setCurrentUser({ ...currentUser, ...userProfile });
      
      return { success: true };
    } catch (error) {
      console.error('Error setting super admin role:', error);
      return { success: false, error: error.message };
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get additional user data from Firestore
          const userProfile = await getUserProfile(user.uid);
          const userData = { ...user, ...userProfile };
          setCurrentUser(userData);
          
          // Ensure original superadmin has proper role set
          if (user.email === 'siddharth@318digital.com' && !userProfile?.role) {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email,
                photoURL: user.photoURL || '',
                role: 'super_admin',
                createdAt: new Date(),
                updatedAt: new Date()
              }, { merge: true });
              
              console.log('Original superadmin role set successfully');
              
              // Refresh user data
              const updatedUserProfile = await getUserProfile(user.uid);
              setCurrentUser({ ...user, ...updatedUserProfile });
            } catch (roleError) {
              console.error('Error setting original superadmin role:', roleError);
            }
          }
        } catch (error) {
          console.log('Firestore not available yet, using basic user data:', error.message);
          // If Firestore is not available, just use the basic user data
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    signin,
    logout,
    getUserProfile,
    createTeamAdmin,
    updateTeamAdminPassword,
    getTeamAdmins,
    isSuperAdmin,
    isTeamAdmin,
    setSuperAdminRole,
    createSuperAdmin,
    getSuperAdmins,
    getAllSuperAdminTournaments,
    getAllTournaments,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
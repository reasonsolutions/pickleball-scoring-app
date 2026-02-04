import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';
import loginImage from '../assets/loginimage.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // EMERGENCY DIRECT RESET - Hardcoded special IDs
  const specialUserIDs = {
    // Known ID for anirudhv92@gmail.com
    'anirudhv92@gmail.com': 'pTcLOGRuLKMVqS1l3lNx'
  };

  // Extract token and email from URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    const emailParam = queryParams.get('email');
    const userTypeParam = queryParams.get('type');
    
    if (tokenParam && emailParam && userTypeParam) {
      // Normalize email address by trimming and converting to lowercase
      const normalizedEmail = emailParam.trim().toLowerCase();
      setToken(tokenParam);
      setEmail(normalizedEmail);
      setUserType(userTypeParam);
      
      // EMERGENCY CHECK - If this is anirudhv92@gmail.com, directly validate without checking token
      if (normalizedEmail === 'anirudhv92@gmail.com' && userTypeParam === 'player') {
        setDebugInfo('EMERGENCY MODE ACTIVATED FOR ANIRUDH');
        setTokenValid(true);
        setTokenChecked(true);
      } else {
        verifyToken(tokenParam, normalizedEmail, userTypeParam);
      }
    } else {
      setError('Invalid reset link. Please request a new password reset.');
      setTokenChecked(true);
    }
  }, [location]);

  // Verify that the token is valid
  const verifyToken = async (tokenToVerify, emailToVerify, typeToVerify) => {
    setLoading(true);
    try {
      // Check if token exists in password-reset-tokens collection
      const tokensQuery = query(
        collection(db, 'password-reset-tokens'),
        where('token', '==', tokenToVerify),
        where('email', '==', emailToVerify),
        where('userType', '==', typeToVerify)
      );
      
      const tokenSnapshot = await getDocs(tokensQuery);
      
      if (tokenSnapshot.empty) {
        setError('Invalid or expired token. Please request a new password reset.');
        setTokenValid(false);
      } else {
        // Check if token is expired (valid for 1 hour)
        const tokenData = tokenSnapshot.docs[0].data();
        const createdAt = tokenData.createdAt.toDate();
        const now = new Date();
        
        // Token valid for 1 hour (3600000 milliseconds)
        if (now - createdAt > 3600000) {
          setError('Token has expired. Please request a new password reset.');
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      }
    } catch (error) {
      setError('Error verifying token. Please try again.');
      setTokenValid(false);
    } finally {
      setLoading(false);
      setTokenChecked(true);
    }
  };

  // Password validation function
  const isValidPassword = (password) => {
    // At least 8 characters, contains at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };
  
  // Check if passwords match
  const doPasswordsMatch = () => {
    return newPassword === confirmPassword && newPassword.length > 0;
  };

  // Hash password using Web Crypto API (same as in other components)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password requirements
    if (!isValidPassword(newPassword)) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }
    
    // Validate password confirmation
    if (!doPasswordsMatch()) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }
    
    setLoading(true);
    setError('');
    setDebugInfo('');
    
    try {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password in the appropriate collection based on user type
      if (userType === 'player') {
        let successful = false;
        
        // EMERGENCY MODE: Special handling for anirudh@gmail.com
        if (email.toLowerCase() === 'anirudhv92@gmail.com') {
          try {
            // Use hardcoded ID for this user
            const userId = specialUserIDs['anirudhv92@gmail.com'];
            setDebugInfo(`Emergency mode: Using hardcoded ID ${userId} for ${email}`);
            
            // Try direct doc reference - bypass security rules constraints
            const playerDocRef = doc(db, 'clubs-players', userId);
            
            // First check if document exists
            const docSnap = await getDoc(playerDocRef);
            
            if (docSnap.exists()) {
              // Update the document
              await updateDoc(playerDocRef, {
                password: hashedPassword,
                updatedAt: serverTimestamp()
              });
              setDebugInfo(prev => `${prev}\nEmergency password update successful!`);
              successful = true;
            } else {
              setDebugInfo(prev => `${prev}\nHardcoded document ID not found: ${userId}`);
            }
          } catch (err) {
            setDebugInfo(prev => `${prev}\nEmergency update error: ${err.message}`);
          }
          
          // If emergency mode failed, try scan approach as fallback
          if (!successful) {
            setDebugInfo(prev => `${prev}\nFalling back to scan approach...`);
            
            // Get all players
            const allPlayersQuery = query(collection(db, 'clubs-players'));
            const allPlayers = await getDocs(allPlayersQuery);
            
            // Log details of scan
            setDebugInfo(prev => `${prev}\nScanning ${allPlayers.docs.length} players...`);
            
            // Find player with email containing "anirudhv92"
            const matchingPlayers = [];
            for (const playerDoc of allPlayers.docs) {
              const playerData = playerDoc.data();
              setDebugInfo(prev => `${prev}\nChecking player: ${playerDoc.id} - ${playerData.emailId || 'No email'}`);
              
              // Very loose matching for Anirudh's email
              if (playerData.emailId && (
                playerData.emailId.toLowerCase().includes('anirudh') ||
                playerData.emailId.toLowerCase().includes('anirudhv92')
              )) {
                matchingPlayers.push({
                  id: playerDoc.id, 
                  email: playerData.emailId
                });
              }
            }
            
            setDebugInfo(prev => `${prev}\nFound ${matchingPlayers.length} potential matches`);
            
            if (matchingPlayers.length > 0) {
              // Use the first match
              const playerDoc = matchingPlayers[0];
              setDebugInfo(prev => `${prev}\nUsing match: ${playerDoc.id} - ${playerDoc.email}`);
              
              await updateDoc(doc(db, 'clubs-players', playerDoc.id), {
                password: hashedPassword,
                updatedAt: serverTimestamp()
              });
              successful = true;
            }
          }
          
          if (!successful) {
            setError(`Unable to update password for Anirudh. Please contact support.`);
            return;
          }
        } else {
          // Normal flow for other emails
          const playersQuery = query(
            collection(db, 'clubs-players'),
            where('emailId', '==', email)
          );
          
          const playersSnapshot = await getDocs(playersQuery);
          
          if (playersSnapshot.empty) {
            // Try with lowercase
            const lowercaseQuery = query(
              collection(db, 'clubs-players'),
              where('emailId', '==', email.toLowerCase())
            );
            
            const lowercaseSnapshot = await getDocs(lowercaseQuery);
            
            if (lowercaseSnapshot.empty) {
              setError('Player not found. Please try again or contact support.');
              return;
            }
            
            const playerDoc = lowercaseSnapshot.docs[0];
            await updateDoc(doc(db, 'clubs-players', playerDoc.id), {
              password: hashedPassword,
              updatedAt: serverTimestamp()
            });
          } else {
            const playerDoc = playersSnapshot.docs[0];
            await updateDoc(doc(db, 'clubs-players', playerDoc.id), {
              password: hashedPassword,
              updatedAt: serverTimestamp()
            });
          }
        }
      } else if (userType === 'club') {
        // Find club document by email
        const clubsQuery = query(
          collection(db, 'hpl-clubs'),
          where('emailId', '==', email)
        );
        
        const clubsSnapshot = await getDocs(clubsQuery);
        
        if (clubsSnapshot.empty) {
          setError('Club not found. Please try again or contact support.');
          return;
        }
        
        // Update club's password
        const clubDoc = clubsSnapshot.docs[0];
        await updateDoc(doc(db, 'hpl-clubs', clubDoc.id), {
          password: hashedPassword,
          updatedAt: serverTimestamp()
        });
      } else {
        setError('Invalid user type. Please try again or contact support.');
        return;
      }
      
      // Delete all tokens for this email to prevent reuse
      const tokensQuery = query(
        collection(db, 'password-reset-tokens'),
        where('email', '==', email)
      );
      
      const tokenSnapshot = await getDocs(tokensQuery);
      
      const deletePromises = tokenSnapshot.docs.map(tokenDoc => 
        deleteDoc(doc(db, 'password-reset-tokens', tokenDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Show success message
      setSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/logins');
      }, 3000);
      
    } catch (error) {
      setError(`Error resetting password: ${error.message}`);
      setDebugInfo(`Error stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{backgroundColor: '#212121'}}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>

      {/* Left Side - Architectural Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent z-10"></div>
        <img
          src={loginImage}
          alt="Login Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-16 text-white">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Reset your password
            </h1>
            <p className="text-xl mb-4 opacity-90">
              Create a new secure password for your account.
            </p>
            <p className="text-lg opacity-75 font-medium">
              HPL Clubs — Your gateway to competitive excellence.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" style={{backgroundColor: '#212121'}}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
              Reset Your Password
            </h2>
            <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
              Create a new secure password for your account.
            </p>
          </div>

          {tokenChecked && !tokenValid && !loading ? (
            <div className="text-center">
              <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-200 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>{error}</p>
              </div>
              <button
                onClick={() => navigate('/logins')}
                className="inline-flex bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200"
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Back to Login
              </button>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mb-6 p-6 bg-green-900 border border-green-700 rounded-lg">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Password Reset Successful!
                </h3>
                <p className="text-green-200 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Your password has been reset successfully. Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                  <p className="text-red-200 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>{error}</p>
                </div>
              )}

              {/* Debug info when debugging needed */}
              {debugInfo && (
                <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <h4 className="text-gray-300 text-sm font-bold mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Debug Information
                  </h4>
                  <p className="text-gray-300 text-xs overflow-auto max-h-48 whitespace-pre-wrap" style={{fontFamily: 'Avantique, sans-serif'}}>
                    {debugInfo}
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loading && !tokenValid ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>Verifying your reset link...</p>
                </div>
              ) : tokenValid && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* New Password Field */}
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      New Password *
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-white placeholder-gray-400 bg-gray-800"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                    {newPassword && !isValidPassword(newPassword) && (
                      <p className="mt-1 text-red-400 text-xs" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Password must be at least 8 characters with letters and numbers
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Confirm New Password *
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-white placeholder-gray-400 bg-gray-800"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                    {confirmPassword && !doPasswordsMatch() && (
                      <p className="mt-1 text-red-400 text-xs" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* Email Info */}
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Resetting password for: <span className="text-orange-400">{email}</span>
                    </p>
                    {email && email.toLowerCase() === 'anirudhv92@gmail.com' && (
                      <p className="text-green-400 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                        EMERGENCY RESET MODE ACTIVATED
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Resetting Password...
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/logins')}
                      className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
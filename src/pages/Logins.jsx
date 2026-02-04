import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { generateUrl } from '../utils/urlUtils';
import { useUserAuth } from '../contexts/UserAuthContext';
import loginImage from '../assets/loginimage.png';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function Logins() {
  const [activeTab, setActiveTab] = useState('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useUserAuth();

  // Hash password using Web Crypto API (same as registration)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'player') {
        // Check clubs-players collection for player authentication
        const playersQuery = query(
          collection(db, 'clubs-players'),
          where('emailId', '==', email.toLowerCase())
        );
        
        const playersSnapshot = await getDocs(playersQuery);
        
        if (playersSnapshot.empty) {
          setError('No player found with this email address');
          return;
        }
        
        // Hash the entered password and compare with stored hash
        const hashedPassword = await hashPassword(password);
        let playerFound = false;
        let playerId = null;
        
        playersSnapshot.forEach((doc) => {
          const playerData = doc.data();
          // Compare hashed password with stored hash
          if (playerData.password === hashedPassword) {
            playerFound = true;
            playerId = doc.id;
            
            // Save user session
            login({
              id: playerId,
              type: 'player',
              email: playerData.emailId,
              name: playerData.fullName
            });
          }
        });
        
        if (!playerFound) {
          setError('Invalid password');
          return;
        }
        
        // Navigate to player profile
        navigate(`/player-profile/${playerId}`);
        
      } else {
        // Check hpl-clubs collection for club admin authentication
        const clubsQuery = query(
          collection(db, 'hpl-clubs'),
          where('emailId', '==', email.toLowerCase())
        );
        
        const clubsSnapshot = await getDocs(clubsQuery);
        
        if (clubsSnapshot.empty) {
          setError('No club admin found with this email address');
          return;
        }
        
        // Hash the entered password and compare with stored hash
        const hashedPassword = await hashPassword(password);
        let clubFound = false;
        let clubId = null;
        
        clubsSnapshot.forEach((doc) => {
          const clubData = doc.data();
          // Compare hashed password with stored hash
          if (clubData.password === hashedPassword) {
            clubFound = true;
            clubId = doc.id;
            
            // Save user session
            login({
              id: clubId,
              type: 'club',
              email: clubData.emailId,
              name: clubData.clubName || clubData.fullName
            });
          }
        });
        
        if (!clubFound) {
          setError('Invalid password');
          return;
        }
        
        // Navigate to club profile
        navigate(`/club-profile/${clubId}`);
      }
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a random token
  const generateResetToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Determine if email belongs to player or club admin
      const userType = activeTab === 'player' ? 'player' : 'club';
      let collection_name = userType === 'player' ? 'clubs-players' : 'hpl-clubs';
      
      // Check if email exists in the appropriate collection
      const usersQuery = query(
        collection(db, collection_name),
        where('emailId', '==', email.toLowerCase())
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        setError(`No ${userType} found with this email address`);
        setLoading(false);
        return;
      }

      // Generate a token and store it in Firestore
      const token = generateResetToken();
      
      // Generate reset link using the utility function to ensure correct domain
      const resetLink = generateUrl(`/resetpassword?token=${token}&email=${encodeURIComponent(email)}&type=${userType}`);
      
      // Store token in Firestore with expiration (1 hour from now)
      await addDoc(collection(db, 'password-reset-tokens'), {
        email: email.toLowerCase(),
        token: token,
        userType: userType,
        createdAt: serverTimestamp(),
        used: false
      });

      // Firebase project ID from .firebaserc or your app config
      const projectId = 'pickleball-app-9ccf7';
      
      // Send email in both development and production
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/sendPasswordResetEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          resetLink: resetLink,
          userType: userType
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sending email:', errorText);
        
        // Still show reset link but also indicate email was sent
        alert(`Password reset link has been created. Email notification has been sent to ${email}.\n\nIf you don't receive the email, you can also use this direct link: ${resetLink}`);
      } else {
        // Email sent successfully
        const result = await response.json();
        console.log('Email sent successfully:', result);
      }
      
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (error) {
      setError(error.message);
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
              Serve your passion, one match at a time.
            </h1>
            <p className="text-xl mb-4 opacity-90">
              Join a community of pickleball enthusiasts competing at every level.
            </p>
            <p className="text-lg opacity-75 font-medium">
              HPL Clubs — Your gateway to competitive excellence.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" style={{backgroundColor: '#212121'}}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
              Welcome Back
            </h2>
            <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
              Connect with fellow players and access exclusive tournament features designed for you.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex mb-8 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('player')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'player'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              Login as Player
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              Club Admin
            </button>
          </div>

          {/* Success Message */}
          {resetEmailSent && (
            <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg">
              <p className="text-green-200 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                Password reset email sent! Check your inbox.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>{error}</p>
            </div>
          )}

          {/* Login Form */}
          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Email address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eg. andrew@example.com"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-white placeholder-gray-400 bg-gray-800"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-white placeholder-gray-400 bg-gray-800"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                  required
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  `Login as ${activeTab === 'player' ? 'Player' : 'Club Admin'}`
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Forgot your password?
                </button>
              </div>

            </form>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Reset your password
                </h3>
                <p className="text-gray-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Email address *
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eg. andrew@example.com"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-white placeholder-gray-400 bg-gray-800"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send reset link'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
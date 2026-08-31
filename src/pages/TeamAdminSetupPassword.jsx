import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import crypto from 'crypto-js';

export default function TeamAdminSetupPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setMessage({ 
        type: 'error', 
        text: 'Invalid invitation link. Please contact your administrator.' 
      });
      setLoading(false);
      return;
    }

    try {
      // Find user with this invite token
      const usersRef = collection(db, 'ccpl-users');
      const q = query(usersRef, where('inviteToken', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage({ 
          type: 'error', 
          text: 'Invalid or expired invitation link.' 
        });
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() };

      // Check if token is expired
      const expiryDate = user.inviteTokenExpiry?.toDate();
      if (expiryDate && expiryDate < new Date()) {
        setMessage({ 
          type: 'error', 
          text: 'This invitation link has expired. Please contact your administrator for a new invitation.' 
        });
        setLoading(false);
        return;
      }

      // Check if already verified
      if (user.verified) {
        setMessage({
          type: 'error',
          text: 'This account has already been activated. Please login instead.'
        });
        setLoading(false);
        setTimeout(() => navigate('/ccpl-login'), 3000);
        return;
      }

      // Fetch team name
      if (user.teamId) {
        const teamDoc = await getDocs(query(collection(db, 'teams'), where('__name__', '==', user.teamId)));
        if (!teamDoc.empty) {
          setTeamName(teamDoc.docs[0].data().name || 'Your Team');
        }
      }

      setUserData(user);
      setLoading(false);

    } catch (error) {
      console.error('Error validating token:', error);
      setMessage({ 
        type: 'error', 
        text: 'An error occurred. Please try again or contact support.' 
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      setSubmitting(true);

      // Hash the password (simple hash - in production, use proper backend hashing)
      const hashedPassword = crypto.SHA256(password).toString();

      // Update user document
      const userRef = doc(db, 'ccpl-users', userData.id);
      await updateDoc(userRef, {
        password: hashedPassword,
        verified: true,
        inviteToken: null,
        inviteTokenExpiry: null,
        updatedAt: new Date()
      });

      setMessage({ 
        type: 'success', 
        text: 'Password set successfully! Redirecting to login...' 
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/ccpl-login');
      }, 2000);

    } catch (error) {
      console.error('Error setting password:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to set password. Please try again.' 
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (message.type === 'error' && !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-gray-600">{message.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CCPL!</h1>
          <p className="text-gray-600 mt-2">Set up your Team Admin account</p>
        </div>

        {/* User Info Card */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Your Account Details</h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {userData?.name}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Email:</span> {userData?.email}
            </p>
            {teamName && (
              <p className="text-gray-700">
                <span className="font-medium">Team:</span> {teamName}
              </p>
            )}
            <p className="text-gray-700">
              <span className="font-medium">Role:</span> Team Admin
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-900' : 'text-red-900'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
              submitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {submitting ? 'Setting up your account...' : 'Complete Setup'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/ccpl-login" className="text-orange-500 hover:text-orange-600 font-medium">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

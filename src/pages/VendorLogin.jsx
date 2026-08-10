import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

// SHA-256 hash function (same as in VendorSetupPassword)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function VendorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      // Hash the entered password
      const hashedPassword = await hashPassword(password);

      // Query vendors collection for matching email
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Get the vendor document
      const vendorDoc = querySnapshot.docs[0];
      const vendorData = vendorDoc.data();

      // Check if vendor is active
      if (vendorData.status !== 'active') {
        setError('Your account is not active. Please complete the password setup or contact support.');
        setLoading(false);
        return;
      }

      // Verify password hash
      if (vendorData.password !== hashedPassword) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Store vendor session
      const vendorSession = {
        id: vendorDoc.id,
        email: vendorData.email,
        name: vendorData.name,
        category: vendorData.category,
        loginTime: new Date().toISOString()
      };

      // Store in sessionStorage or localStorage based on "stay logged in"
      if (stayLoggedIn) {
        localStorage.setItem('vendorSession', JSON.stringify(vendorSession));
      } else {
        sessionStorage.setItem('vendorSession', JSON.stringify(vendorSession));
      }

      // Navigate to vendor home (POS system)
      navigate('/vendor/home');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to sign in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        fontFamily: "'Manrope', sans-serif"
      }}
    >
      {/* Animated gradient orbs */}
      <div
        className="absolute"
        style={{
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(60px)',
          animation: 'float 20s ease-in-out infinite'
        }}
      ></div>
      <div
        className="absolute"
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          bottom: '-5%',
          right: '-5%',
          filter: 'blur(60px)',
          animation: 'float 15s ease-in-out infinite reverse'
        }}
      ></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div
          className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10"
          style={{
            animation: 'fadeIn 0.5s ease-out'
          }}
        >
          {/* Logo Badge */}
          <div className="flex items-center justify-center mb-8">
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.1) 100%)',
                border: '1px solid rgba(249,115,22,0.3)'
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">CCPL Vendor</span>
            </div>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-gray-400 text-sm">Sign in to manage your vendor account</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 rounded-xl backdrop-blur-sm">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                placeholder="you@vendor.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Stay logged in */}
            <div className="flex items-center justify-between text-sm pt-2">
              <label className="flex items-center text-gray-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                  className="mr-2 w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 bg-white/5"
                />
                Stay logged in
              </label>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                Back to Home
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              style={{
                background: loading ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.3)'
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account? Contact the administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

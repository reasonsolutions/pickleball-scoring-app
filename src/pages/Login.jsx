import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import hplLogoWhite from '../assets/hpllogo_white.png';
import loginBg from '../assets/login.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const { signin, currentUser } = useAuth();
  const navigate = useNavigate();

  // Handle navigation after successful authentication
  useEffect(() => {
    if (currentUser && loading) {
      // User is authenticated and we were in loading state (just logged in)
      setLoading(false);
      navigate('/admin');
    }
  }, [currentUser, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await signin(email, password);
      // Don't navigate immediately - let useEffect handle it after auth state is confirmed
    } catch (error) {
      setError('Failed to sign in: ' + error.message);
      setLoading(false);
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark blue overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 71, 161, 0.95) 0%, rgba(25, 118, 210, 0.90) 50%, rgba(13, 71, 161, 0.95) 100%)'
        }}
      ></div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={hplLogoWhite} 
            alt="HPL Logo" 
            className="mx-auto mb-6"
            style={{ height: '60px' }}
          />
        </div>

        {/* Welcome text */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Welcome Back!</h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400 rounded-lg">
            <p className="text-red-100 text-sm">{error}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full pl-12 pr-4 py-4 bg-transparent border-2 border-blue-300/50 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-300 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full pl-12 pr-4 py-4 bg-transparent border-2 border-blue-300/50 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-300 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Stay logged in and forgot password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-blue-100 cursor-pointer">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="mr-2 w-4 h-4 text-blue-600 bg-transparent border-2 border-blue-300/50 rounded focus:ring-blue-500 focus:ring-2"
              />
              Stay logged in
            </label>
            <Link to="/forgot-password" className="text-blue-200 hover:text-white transition-colors">
              I've forgotten my password
            </Link>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            className="w-full py-4 bg-transparent border-2 border-blue-300/50 rounded-lg text-white font-semibold hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 disabled:opacity-50"
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
              'SIGN IN >'
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
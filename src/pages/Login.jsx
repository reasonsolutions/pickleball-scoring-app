import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await signin(email, password);
      navigate('/admin');
    } catch (error) {
      setError('Failed to sign in: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="card w-96 shadow-xl card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-green)' }}>Pickleball Tourny</h1>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Sign in to your account</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text" style={{ color: 'var(--text-primary)' }}>Email</span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-control w-full mb-6">
              <label className="label">
                <span className="label-text" style={{ color: 'var(--text-primary)' }}>Password</span>
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="input input-bordered w-full"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={`btn w-full ${loading ? 'loading' : ''}`}
              style={{
                backgroundColor: 'var(--primary-green)',
                color: 'var(--text-primary)',
                border: 'none'
              }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="divider" style={{ color: 'var(--text-muted)' }}>OR</div>

          <div className="text-center">
            <p style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="link" style={{ color: 'var(--primary-blue)' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
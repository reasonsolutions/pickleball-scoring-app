import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { duprApiService } from '../services/duprApiService';

/**
 * DUPR API Page
 * 
 * This page provides a way to:
 * 1. Generate DUPR API access tokens
 * 2. Test the DUPR API endpoints
 * 3. View API documentation and usage examples
 */
const DuprApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [playerId, setPlayerId] = useState('');

  // Clear any previous errors when trying new actions
  const clearError = () => setError(null);
  
  // Format date in readable format
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  // Calculate remaining time until token expiry
  const getRemainingTime = () => {
    if (!tokenExpiry) return 'N/A';
    
    const remainingMs = tokenExpiry - Date.now();
    if (remainingMs <= 0) return 'Expired';
    
    // Format as mm:ss
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  /**
   * Generate a new access token
   */
  const handleGenerateToken = async () => {
    clearError();
    setLoading(true);
    
    try {
      const response = await duprApiService.generateAccessToken();
      setToken(response.accessToken);
      
      // Set expiry time (from now + expiresIn seconds)
      const expiryTime = Date.now() + (response.expiresIn || 3600) * 1000;
      setTokenExpiry(expiryTime);
      
      setApiResponse(response);
    } catch (err) {
      setError(err.message || 'Failed to generate access token');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Search players by name
   */
  const handleSearchPlayers = async (e) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    
    clearError();
    setLoading(true);
    
    try {
      const response = await duprApiService.searchPlayers(searchName);
      setApiResponse(response);
    } catch (err) {
      setError(err.message || 'Failed to search players');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Get player ratings
   */
  const handleGetRatings = async (e) => {
    e.preventDefault();
    if (!playerId.trim()) return;
    
    clearError();
    setLoading(true);
    
    try {
      const response = await duprApiService.getPlayerRatings(playerId);
      setApiResponse(response);
    } catch (err) {
      setError(err.message || 'Failed to get player ratings');
    } finally {
      setLoading(false);
    }
  };
  
  // Check token expiry and update UI
  useEffect(() => {
    if (tokenExpiry) {
      const timer = setInterval(() => {
        if (Date.now() >= tokenExpiry) {
          setToken(null);
          setTokenExpiry(null);
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [tokenExpiry]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <h1 className="text-2xl font-bold mb-6 text-blue-600">DUPR API Integration</h1>
          
          {/* API Credentials Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">API Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-medium">Client Key:</p>
                <p className="font-mono text-sm break-all">{duprApiService.clientKey}</p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-medium">Client Secret:</p>
                <p className="font-mono text-sm break-all">{duprApiService.clientSecret}</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              These credentials are used to authenticate with the DUPR API and generate access tokens.
              For security, consider storing these in environment variables for production.
            </p>
          </div>
          
          {/* Access Token Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Access Token</h2>
            
            <div className="mb-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                onClick={handleGenerateToken}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Access Token'}
              </button>
            </div>
            
            {token && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">Current Token:</p>
                  <p className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    Expires in: {getRemainingTime()}
                  </p>
                </div>
                <p className="font-mono text-sm break-all">{token}</p>
                <p className="text-xs mt-2">Expiry: {formatDate(tokenExpiry)}</p>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg mb-4">
                <p className="font-medium">Error:</p>
                <p>{error}</p>
              </div>
            )}
          </div>
          
          {/* API Testing Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Test API Endpoints</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Search Players */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="font-medium mb-3">Search Players</h3>
                <form onSubmit={handleSearchPlayers}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">
                      Player Name
                    </label>
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter player name"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    disabled={loading || !searchName.trim() || !token}
                  >
                    Search
                  </button>
                </form>
              </div>
              
              {/* Get Player Ratings */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="font-medium mb-3">Get Player Ratings</h3>
                <form onSubmit={handleGetRatings}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">
                      DUPR Player ID
                    </label>
                    <input
                      type="text"
                      value={playerId}
                      onChange={(e) => setPlayerId(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter DUPR ID"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    disabled={loading || !playerId.trim() || !token}
                  >
                    Get Ratings
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          {/* API Response Section */}
          {apiResponse && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">API Response</h2>
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {/* Documentation Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
            
            <div className="mb-4">
              <p className="mb-2">
                <strong>Base URL:</strong>{" "}
                <a 
                  href="https://uat.mydupr.com/api/swagger-ui/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://uat.mydupr.com/api
                </a>
              </p>
              <p className="mb-2">
                <strong>Swagger Documentation:</strong>{" "}
                <a 
                  href="https://uat.mydupr.com/api/swagger-ui/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://uat.mydupr.com/api/swagger-ui/index.html
                </a>
              </p>
              <p className="mb-2">This integration demonstrates:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Authenticating with the DUPR API</li>
                <li>Generating and refreshing access tokens</li>
                <li>Making authenticated API requests</li>
                <li>Handling API responses and errors</li>
              </ul>
            </div>
            
            {/* Authentication Endpoint Documentation */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg mb-4">
              <h3 className="font-medium mb-3">Authentication Endpoint</h3>
              <p className="font-mono text-sm mb-2">POST /authentication/login</p>
              <p className="text-sm mb-2"><strong>Request Body:</strong></p>
              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
{`{
  "clientKey": "test-ck-d30589e9-5a4c-4897-fa4c-c9dbaea76f72",
  "clientSecret": "test-cs-d715b452cae9403efa160b1f6bef0915"
}`}
              </pre>
              <p className="text-sm mt-3 mb-2"><strong>Response:</strong></p>
              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
{`{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshToken": "abc123..."
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DuprApi;
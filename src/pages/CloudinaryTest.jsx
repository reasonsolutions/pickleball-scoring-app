import React, { useState } from 'react';
import { listLogosFromCloudinary, searchLogos, getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

const CloudinaryTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testListLogos = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const logos = await listLogosFromCloudinary();
      setResult({
        type: 'List Logos',
        data: logos,
        count: logos.length
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testSearchLogos = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const logos = await searchLogos('logo'); // Search for files containing 'logo'
      setResult({
        type: 'Search Logos',
        data: logos,
        count: logos.length
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testOptimizedUrl = () => {
    const samplePublicId = 'LOGOS/sample-logo'; // Replace with actual public ID
    const optimizedUrl = getOptimizedLogoUrl(samplePublicId, {
      width: 150,
      height: 150,
      crop: 'fit'
    });
    
    setResult({
      type: 'Optimized URL',
      data: [{ url: optimizedUrl, publicId: samplePublicId }],
      count: 1
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cloudinary API Test</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testListLogos}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-4"
        >
          Test List LOGOS Folder
        </button>
        
        <button
          onClick={testSearchLogos}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 mr-4"
        >
          Test Search Logos
        </button>
        
        <button
          onClick={testOptimizedUrl}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Test Optimized URL
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <div className="mt-2 text-sm">
            <p><strong>Possible issues:</strong></p>
            <ul className="list-disc list-inside mt-1">
              <li>CORS policy blocking the request (most likely)</li>
              <li>Invalid API credentials</li>
              <li>LOGOS folder doesn't exist or is empty</li>
              <li>Signature generation issue (should be done server-side)</li>
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{result.type} Results ({result.count} items)</h2>
          
          <div className="space-y-4">
            {result.data.map((item, index) => (
              <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded border">
                {item.publicId && (
                  <div className="mb-2">
                    <strong>Public ID:</strong> {item.publicId}
                  </div>
                )}
                
                {item.url && (
                  <div className="mb-2">
                    <strong>URL:</strong> 
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2"
                    >
                      {item.url}
                    </a>
                  </div>
                )}
                
                {item.format && (
                  <div className="mb-2">
                    <strong>Format:</strong> {item.format}
                  </div>
                )}
                
                {item.width && item.height && (
                  <div className="mb-2">
                    <strong>Dimensions:</strong> {item.width} × {item.height}
                  </div>
                )}
                
                {item.bytes && (
                  <div className="mb-2">
                    <strong>Size:</strong> {Math.round(item.bytes / 1024)} KB
                  </div>
                )}
                
                {item.createdAt && (
                  <div className="mb-2">
                    <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <strong>Important Notes:</strong>
        <ul className="list-disc list-inside mt-2">
          <li>The Cloudinary Admin API requires server-side implementation for production use</li>
          <li>CORS policies may block these requests from the browser</li>
          <li>API secrets should never be exposed in client-side code</li>
          <li>Consider implementing these functions in your backend/serverless functions</li>
        </ul>
      </div>
    </div>
  );
};

export default CloudinaryTest;
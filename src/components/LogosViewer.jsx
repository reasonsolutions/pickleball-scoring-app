import React, { useState, useEffect } from 'react';
import { listLogosFromCloudinary, searchLogos, getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

const LogosViewer = () => {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load all logos on component mount
  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    setLoading(true);
    setError(null);
    try {
      const logosList = await listLogosFromCloudinary();
      setLogos(logosList);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load logos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      loadLogos();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const searchResults = await searchLogos(searchTerm);
      setLogos(searchResults);
    } catch (err) {
      setError(err.message);
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Cloudinary LOGOS Folder
        </h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logos by filename..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={loadLogos}
            disabled={loading}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Show All
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-600 dark:text-red-200">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
          <p className="text-sm mt-2">
            Note: This requires proper CORS configuration in Cloudinary and may need server-side implementation for production use.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading logos...</span>
        </div>
      )}

      {/* Logos Count */}
      {!loading && logos.length > 0 && (
        <div className="mb-4 text-gray-600 dark:text-gray-400">
          Found {logos.length} logo{logos.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Logos Grid */}
      {!loading && logos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {logos.map((logo) => (
            <div
              key={logo.publicId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Logo Image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center p-4">
                <img
                  src={getOptimizedLogoUrl(logo.publicId, { width: 200, height: 200 })}
                  alt={logo.publicId.split('/').pop()}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.src = logo.url; // Fallback to original URL
                  }}
                />
              </div>
              
              {/* Logo Details */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                  {logo.publicId.split('/').pop()}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="uppercase">{logo.format}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{logo.width} × {logo.height}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <span>{formatFileSize(logo.bytes)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(logo.createdAt)}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={logo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 text-center"
                  >
                    View Full
                  </a>
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(logo.url)}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && logos.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No logos found</h3>
            <p>
              {searchTerm 
                ? `No logos found matching "${searchTerm}"`
                : "No logos found in the LOGOS folder"
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogosViewer;
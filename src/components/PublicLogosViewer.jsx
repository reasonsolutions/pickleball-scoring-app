import React, { useState, useEffect } from 'react';
import { 
  getKnownLogos, 
  checkMultipleLogos, 
  generateLogoVariations, 
  getCloudinaryUrl,
  uploadLogoToFolder 
} from '../utils/cloudinaryPublic';

const PublicLogosViewer = () => {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadKnownLogos();
  }, []);

  const loadKnownLogos = async () => {
    setLoading(true);
    try {
      const knownLogos = getKnownLogos();
      // Check which logos actually exist
      const existingLogos = await checkMultipleLogos(knownLogos.map(logo => logo.publicId));
      setLogos(existingLogos.map(logo => ({
        ...logo,
        name: logo.publicId.split('/').pop(),
        thumbnailUrl: getCloudinaryUrl(logo.publicId, { width: 200, height: 200 })
      })));
    } catch (error) {
      console.error('Error loading logos:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchLogos = async () => {
    if (!searchTerm.trim()) {
      loadKnownLogos();
      return;
    }

    setLoading(true);
    try {
      const variations = generateLogoVariations(searchTerm);
      const existingLogos = await checkMultipleLogos(variations.map(v => v.publicId));
      setLogos(existingLogos.map(logo => ({
        ...logo,
        name: logo.publicId.split('/').pop(),
        thumbnailUrl: getCloudinaryUrl(logo.publicId, { width: 200, height: 200 })
      })));
    } catch (error) {
      console.error('Error searching logos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const fileName = uploadFile.name.split('.')[0]; // Remove extension
      const result = await uploadLogoToFolder(uploadFile, fileName);
      
      // Add the new logo to the list
      setLogos(prev => [...prev, {
        publicId: result.publicId,
        url: result.url,
        name: fileName,
        thumbnailUrl: result.thumbnailUrl,
        exists: true
      }]);
      
      setUploadFile(null);
      alert('Logo uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('URL copied to clipboard!');
  };

  const filteredLogos = logos.filter(logo => 
    logo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Cloudinary LOGOS Folder
        </h1>
        
        {/* Search and Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Search */}
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logos or try a team name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={searchLogos}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Search
              </button>
              <button
                onClick={loadKnownLogos}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Show All
              </button>
            </div>
          </div>

          {/* Upload */}
          <form onSubmit={handleUpload} className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading logos...</span>
        </div>
      )}

      {/* Logos Count */}
      {!loading && filteredLogos.length > 0 && (
        <div className="mb-4 text-gray-600 dark:text-gray-400">
          Found {filteredLogos.length} logo{filteredLogos.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Logos Grid */}
      {!loading && filteredLogos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLogos.map((logo) => (
            <div
              key={logo.publicId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Logo Image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center p-4">
                <img
                  src={logo.thumbnailUrl}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.src = logo.url; // Fallback to original URL
                  }}
                />
              </div>
              
              {/* Logo Details */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                  {logo.name}
                </h3>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <div className="truncate">
                    <strong>Public ID:</strong> {logo.publicId}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <a
                      href={logo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 text-center"
                    >
                      View Full
                    </a>
                    
                    <button
                      onClick={() => copyToClipboard(logo.url)}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Copy URL
                    </button>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(logo.publicId)}
                    className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Copy Public ID
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && filteredLogos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No logos found</h3>
            <p>
              {searchTerm 
                ? `No logos found matching "${searchTerm}". Try a different search term.`
                : "No logos found. Try uploading some logos or check if they exist in your Cloudinary LOGOS folder."
              }
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to use:</h3>
        <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
          <li>• <strong>Show All:</strong> Displays known logos that exist in your LOGOS folder</li>
          <li>• <strong>Search:</strong> Enter a team name or logo name to find variations</li>
          <li>• <strong>Upload:</strong> Add new logos directly to your LOGOS folder</li>
          <li>• <strong>Copy URL:</strong> Get the direct Cloudinary URL for use in your app</li>
          <li>• <strong>Copy Public ID:</strong> Get the public ID for programmatic access</li>
        </ul>
      </div>
    </div>
  );
};

export default PublicLogosViewer;
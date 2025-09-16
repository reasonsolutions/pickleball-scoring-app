import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function YouTubeUrlManager({ match, onUpdate }) {
  const [youtubeUrl, setYoutubeUrl] = useState(match?.youtubeUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!match?.id) return;

    setSaving(true);
    setMessage('');

    try {
      await updateDoc(doc(db, 'fixtures', match.id), {
        youtubeUrl: youtubeUrl.trim()
      });
      
      setMessage('YouTube URL saved successfully!');
      if (onUpdate) onUpdate();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving YouTube URL:', error);
      setMessage('Failed to save YouTube URL');
    } finally {
      setSaving(false);
    }
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const videoId = extractVideoId(youtubeUrl);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">YouTube Live Stream</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          {videoId && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Valid YouTube URL detected (Video ID: {videoId})
            </p>
          )}
          {youtubeUrl && !videoId && (
            <p className="text-sm text-red-600 mt-1">
              ⚠ Invalid YouTube URL format
            </p>
          )}
        </div>

        {videoId && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div className="relative" style={{ paddingBottom: '28.125%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded"
                src={`https://www.youtube.com/embed/${videoId}?controls=1&rel=0`}
                title="YouTube Preview"
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={saving || !youtubeUrl.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save YouTube URL'}
          </button>

          {message && (
            <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <p><strong>Supported formats:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
            <li>https://youtu.be/VIDEO_ID</li>
            <li>https://www.youtube.com/embed/VIDEO_ID</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
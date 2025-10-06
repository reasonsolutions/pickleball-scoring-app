import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function HomePageVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    youtubeUrl: '',
    description: ''
  });
  const [editingVideo, setEditingVideo] = useState(null);

  // Fetch videos from Firebase
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const videosQuery = query(
        collection(db, 'featuredVideos'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(videosQuery);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract YouTube video ID from URL
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

  // Add new video
  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.youtubeUrl) return;

    const videoId = extractVideoId(newVideo.youtubeUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'featuredVideos'), {
        ...newVideo,
        videoId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setNewVideo({ title: '', youtubeUrl: '', description: '' });
      fetchVideos();
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Error adding video. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update video
  const handleUpdateVideo = async (e) => {
    e.preventDefault();
    if (!editingVideo.title || !editingVideo.youtubeUrl) return;

    const videoId = extractVideoId(editingVideo.youtubeUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'featuredVideos', editingVideo.id), {
        title: editingVideo.title,
        youtubeUrl: editingVideo.youtubeUrl,
        description: editingVideo.description,
        videoId,
        updatedAt: new Date()
      });
      
      setEditingVideo(null);
      fetchVideos();
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Error updating video. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete video
  const handleDeleteVideo = async (videoId) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await deleteDoc(doc(db, 'featuredVideos', videoId));
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-lg">Loading videos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Featured Videos Management</h2>
        <p className="text-gray-600">Add and manage YouTube videos that appear in the Featured Videos section on the home page.</p>
      </div>

      {/* Add New Video Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Video</h3>
        <form onSubmit={handleAddVideo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter video title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                YouTube URL *
              </label>
              <input
                type="url"
                value={newVideo.youtubeUrl}
                onChange={(e) => setNewVideo({ ...newVideo, youtubeUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newVideo.description}
              onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows="3"
              placeholder="Enter video description (optional)"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Video'}
          </button>
        </form>
      </div>

      {/* Videos List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Featured Videos</h3>
        {videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No featured videos added yet. Add your first video above.
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                {editingVideo?.id === video.id ? (
                  // Edit Form
                  <form onSubmit={handleUpdateVideo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video Title *
                        </label>
                        <input
                          type="text"
                          value={editingVideo.title}
                          onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          YouTube URL *
                        </label>
                        <input
                          type="url"
                          value={editingVideo.youtubeUrl}
                          onChange={(e) => setEditingVideo({ ...editingVideo, youtubeUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editingVideo.description}
                        onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows="3"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingVideo(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Display Mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {/* Video Thumbnail */}
                        <div className="flex-shrink-0">
                          {video.videoId ? (
                            <img
                              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                              alt="Video thumbnail"
                              className="w-32 h-24 object-cover rounded"
                            />
                          ) : (
                            <div className="w-32 h-24 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-500 text-sm">No thumbnail</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Video Info */}
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">{video.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                          <a
                            href={video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {video.youtubeUrl}
                          </a>
                          <p className="text-xs text-gray-500 mt-2">
                            Added: {video.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => setEditingVideo(video)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
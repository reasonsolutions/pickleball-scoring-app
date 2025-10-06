import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CloudinaryImageUpload from './CloudinaryImageUpload';

export default function NewsManagement() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    subtext: '',
    description: '',
    featuredImage: null, // Changed to null for Cloudinary object
    publishDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    featured: false
  });
  const [editingArticle, setEditingArticle] = useState(null);

  // Fetch news from Firebase
  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const newsQuery = query(
        collection(db, 'news'),
        orderBy('publishDate', 'desc')
      );
      const snapshot = await getDocs(newsQuery);
      const newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNews(newsData);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new article
  const handleAddArticle = async (e) => {
    e.preventDefault();
    if (!newArticle.title || !newArticle.subtext) return;

    setSaving(true);
    try {
      // Ensure all required fields are present and properly formatted
      const articleData = {
        title: newArticle.title,
        subtext: newArticle.subtext,
        publishDate: new Date(newArticle.publishDate),
        description: newArticle.description || '',
        featuredImage: newArticle.featuredImage || null,
        featured: newArticle.featured || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'news'), articleData);
      
      setNewArticle({
        title: '',
        subtext: '',
        description: '',
        featuredImage: null,
        publishDate: new Date().toISOString().split('T')[0],
        featured: false
      });
      fetchNews();
    } catch (error) {
      console.error('Error adding article:', error);
      alert('Error adding article. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update article
  const handleUpdateArticle = async (e) => {
    e.preventDefault();
    if (!editingArticle.title || !editingArticle.subtext) return;

    setSaving(true);
    try {
      // Ensure all required fields are present and properly formatted
      const updateData = {
        title: editingArticle.title,
        subtext: editingArticle.subtext,
        description: editingArticle.description || '',
        featuredImage: editingArticle.featuredImage || null,
        publishDate: new Date(editingArticle.publishDate),
        featured: editingArticle.featured || false,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'news', editingArticle.id), updateData);
      
      setEditingArticle(null);
      fetchNews();
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Error updating article. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete article
  const handleDeleteArticle = async (articleId) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await deleteDoc(doc(db, 'news', articleId));
      fetchNews();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-lg">Loading news...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">News Management</h2>
        <p className="text-gray-600">Add and manage news articles that appear in the Latest News section on the home page.</p>
      </div>

      {/* Add New Article Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Article</h3>
        <form onSubmit={handleAddArticle} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter article title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publish Date *
              </label>
              <input
                type="date"
                value={newArticle.publishDate}
                onChange={(e) => setNewArticle({ ...newArticle, publishDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtext *
            </label>
            <input
              type="text"
              value={newArticle.subtext}
              onChange={(e) => setNewArticle({ ...newArticle, subtext: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter article subtext/summary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image
            </label>
            <CloudinaryImageUpload
              onImageUpload={(imageData) => setNewArticle({ ...newArticle, featuredImage: imageData })}
              currentImage={newArticle.featuredImage?.url}
              label="Featured Image"
              uploadType="news"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newArticle.description}
              onChange={(e) => setNewArticle({ ...newArticle, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows="4"
              placeholder="Enter full article description (optional)"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="featured"
              checked={newArticle.featured}
              onChange={(e) => setNewArticle({ ...newArticle, featured: e.target.checked })}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
              Mark as Featured Article (will appear in Featured Articles section)
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Article'}
          </button>
        </form>
      </div>

      {/* News List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current News Articles</h3>
        {news.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No news articles added yet. Add your first article above.
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((article) => (
              <div key={article.id} className="border border-gray-200 rounded-lg p-4">
                {editingArticle?.id === article.id ? (
                  // Edit Form
                  <form onSubmit={handleUpdateArticle} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={editingArticle.title}
                          onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Publish Date *
                        </label>
                        <input
                          type="date"
                          value={editingArticle.publishDate}
                          onChange={(e) => setEditingArticle({ ...editingArticle, publishDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtext *
                      </label>
                      <input
                        type="text"
                        value={editingArticle.subtext}
                        onChange={(e) => setEditingArticle({ ...editingArticle, subtext: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Featured Image
                      </label>
                      <CloudinaryImageUpload
                        onImageUpload={(imageData) => setEditingArticle({ ...editingArticle, featuredImage: imageData })}
                        currentImage={typeof editingArticle.featuredImage === 'string'
                          ? editingArticle.featuredImage
                          : editingArticle.featuredImage?.secure_url}
                        label="Featured Image"
                        uploadType="news"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editingArticle.description}
                        onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows="4"
                      />
                    </div>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="editFeatured"
                        checked={editingArticle.featured}
                        onChange={(e) => setEditingArticle({ ...editingArticle, featured: e.target.checked })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="editFeatured" className="ml-2 block text-sm text-gray-700">
                        Mark as Featured Article
                      </label>
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
                        onClick={() => setEditingArticle(null)}
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
                        {/* Featured Image */}
                        <div className="flex-shrink-0">
                          {article.featuredImage ? (
                            <img
                              src={typeof article.featuredImage === 'string'
                                ? article.featuredImage
                                : article.featuredImage.secure_url}
                              alt="Featured image"
                              className="w-32 h-24 object-cover rounded"
                            />
                          ) : (
                            <div className="w-32 h-24 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-500 text-sm">No image</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Article Info */}
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">{article.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{article.subtext}</p>
                          {article.description && (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-3">{article.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Publish Date: {article.publishDate?.toDate?.()?.toLocaleDateString() || 
                                         new Date(article.publishDate).toLocaleDateString() || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {article.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                            {article.featured && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Featured
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => setEditingArticle({
                          ...article,
                          publishDate: article.publishDate?.toDate?.()?.toISOString().split('T')[0] || 
                                      new Date(article.publishDate).toISOString().split('T')[0] ||
                                      new Date().toISOString().split('T')[0]
                        })}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(article.id)}
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
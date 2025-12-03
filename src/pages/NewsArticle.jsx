import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';
import Footer from '../components/Footer';
import MarkdownPreview from '@uiw/react-markdown-preview';
import '@uiw/react-md-editor/markdown-editor.css';

export default function NewsArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedNews, setRelatedNews] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);
  const [error, setError] = useState(null);

  // Detect Instagram browser and set up compatibility mode
  useEffect(() => {
    const userAgent = navigator.userAgent || '';
    const isInstagram = /Instagram/i.test(userAgent) || /FBAN|FBAV/i.test(userAgent);
    setIsInstagramBrowser(isInstagram);
    
    if (isInstagram) {
      console.log('Instagram browser detected, enabling compatibility mode');
      // Add Instagram-specific meta tags
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  }, []);

  // Fetch tournaments for the score bar with Instagram browser fallbacks
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const snapshot = await getDocs(tournamentsRef);
        const tournamentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTournaments(tournamentsList);
        
        // Set first tournament as default if available
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setError('Failed to load tournaments');
        // Fallback for Instagram browser
        if (isInstagramBrowser) {
          setTournaments([
            { id: 'fallback', name: 'Hyderabad Pickleball League' }
          ]);
          setSelectedTournament('fallback');
        } else {
          setTournaments([]);
        }
      }
    };

    fetchTournaments();
  }, [isInstagramBrowser]);

  // Fetch the specific article and related news with Instagram browser compatibility
  useEffect(() => {
    const fetchArticleAndRelated = async () => {
      try {
        // Add timeout for Instagram browser
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), isInstagramBrowser ? 10000 : 15000)
        );

        // Fetch the specific article with timeout
        const articlePromise = getDoc(doc(db, 'news', id));
        const articleDoc = await Promise.race([articlePromise, timeoutPromise]);
        
        if (articleDoc.exists()) {
          const articleData = {
            id: articleDoc.id,
            ...articleDoc.data()
          };
          setArticle(articleData);
          setError(null);

          // Fetch related news (excluding current article) with fallback for Instagram
          try {
            const relatedQuery = query(
              collection(db, 'news'),
              orderBy('publishDate', 'desc'),
              limit(5)
            );
            
            const relatedPromise = getDocs(relatedQuery);
            const relatedSnapshot = await Promise.race([relatedPromise, timeoutPromise]);
            const relatedData = relatedSnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter(item => item.id !== id); // Exclude current article
            
            setRelatedNews(relatedData.slice(0, 4)); // Show max 4 related articles
          } catch (relatedError) {
            console.warn('Could not fetch related news:', relatedError);
            setRelatedNews([]); // Continue without related news
          }
        } else {
          setArticle(null);
          setError('Article not found');
        }
      } catch (error) {
        console.error('Error fetching article:', error);
        setArticle(null);
        
        // Set specific error messages for different scenarios
        if (error.message === 'Request timeout') {
          setError('Loading timeout - please check your connection and try again');
        } else if (isInstagramBrowser) {
          setError('Unable to load article in Instagram browser. Please open in your default browser.');
        } else {
          setError('Failed to load article');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticleAndRelated();
    }
  }, [id, isInstagramBrowser]);

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    
    const publishDate = date.toDate ? date.toDate() : new Date(date);
    return publishDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to calculate time ago
  const getTimeAgo = (date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const publishDate = date.toDate ? date.toDate() : new Date(date);
    const diffInMs = now - publishDate;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="league-home min-h-screen bg-gray-50">
        {/* Live Tournament Scores Banner */}
        <div className="live-scores-banner">
          <div className="flex items-center justify-center px-4 py-2 w-full">
            <div className="text-lg">
              {isInstagramBrowser ? 'Loading in Instagram browser...' : 'Loading tournaments...'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <LeagueNavbar />

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">
              {isInstagramBrowser ? 'Loading article (this may take longer in Instagram)...' : 'Loading article...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article || error) {
    return (
      <div className="league-home min-h-screen bg-gray-50">
        {/* Live Tournament Scores Banner */}
        <div className="live-scores-banner">
          <div className="flex items-center px-4 py-2 w-full">
            <div className="flex-1 text-center">
              <span className="text-white font-semibold">
                {error ? 'Error Loading Article' : 'Article Not Found'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <LeagueNavbar />

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error ? 'Error Loading Article' : 'Article Not Found'}
            </h1>
            <p className="text-gray-600 mb-8">
              {error || 'The article you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            
            {/* Instagram browser specific help */}
            {isInstagramBrowser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Instagram Browser Issue?</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Instagram's in-app browser sometimes has trouble loading content. Try these solutions:
                </p>
                <ul className="text-blue-800 text-sm space-y-1 mb-3">
                  <li>• Tap the three dots (⋯) and select "Open in Browser"</li>
                  <li>• Copy the link and paste it in your default browser</li>
                  <li>• Try refreshing the page</li>
                </ul>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors mr-3"
                >
                  Retry Loading
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'News Article',
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            )}
            
            <Link
              to="/"
              className="bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`league-home min-h-screen bg-gray-50 ${isInstagramBrowser ? 'instagram-browser' : ''}`}>
      {/* Instagram Browser Styles */}
      {isInstagramBrowser && (
        <style jsx>{`
          .instagram-browser {
            -webkit-overflow-scrolling: touch;
            overflow-x: hidden;
          }
          .instagram-browser img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          .instagram-browser .aspect-video {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
          }
          .instagram-browser .aspect-video img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        `}</style>
      )}

      {/* Live Tournament Scores Banner */}
      <div className="live-scores-banner">
        <div className="flex items-center px-4 py-2 w-full">
          {/* Tournament Dropdown */}
          <div className="flex items-center min-w-0 mr-4">
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 max-w-xs truncate"
            >
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 text-center">
            <span className="text-white font-semibold">News Article</span>
            {isInstagramBrowser && (
              <span className="text-xs text-gray-200 block">Instagram Browser</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <LeagueNavbar />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link to="/" className="text-orange-600 hover:text-orange-700">Home</Link>
          <span className="mx-2 text-gray-500">/</span>
          <span className="text-gray-900">News</span>
        </nav>

        {/* Article Content */}
        <article className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Featured Image with Instagram browser optimizations */}
          {(article.featuredImage?.url || article.featuredImage) && (
            <div className="aspect-video w-full">
              <img
                src={article.featuredImage?.url || article.featuredImage}
                alt={article.title}
                className="w-full h-full object-cover"
                loading={isInstagramBrowser ? "eager" : "lazy"}
                onError={(e) => {
                  console.warn('Image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
                style={isInstagramBrowser ? {
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block'
                } : {}}
              />
            </div>
          )}

          {/* Article Header */}
          <div className="p-8">
            <div className="mb-4">
              <span className="text-sm text-gray-500">
                {formatDate(article.publishDate)} • {getTimeAgo(article.publishDate)}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            {article.subtext && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {article.subtext}
              </p>
            )}

            {/* Article Description */}
            {article.description && (
              <div className="prose prose-lg max-w-none">
                <MarkdownPreview
                  source={article.description}
                  style={{
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    lineHeight: '1.7',
                    color: '#374151'
                  }}
                  wrapperElement={{
                    'data-color-mode': 'light'
                  }}
                />
              </div>
            )}
          </div>
        </article>

        {/* Related News */}
        {relatedNews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related News</h2>
            <div className={`grid gap-6 ${isInstagramBrowser ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {relatedNews.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to={`/news/${relatedArticle.id}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {relatedArticle.featuredImage && (
                    <div className="aspect-video w-full">
                      <img
                        src={typeof relatedArticle.featuredImage === 'string'
                          ? relatedArticle.featuredImage
                          : relatedArticle.featuredImage.secure_url}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover"
                        loading={isInstagramBrowser ? "eager" : "lazy"}
                        onError={(e) => {
                          console.warn('Related image failed to load:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {relatedArticle.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {relatedArticle.subtext}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getTimeAgo(relatedArticle.publishDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
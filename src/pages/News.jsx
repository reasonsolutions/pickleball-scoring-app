import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';

export default function News() {
  const [news, setNews] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);
  const [error, setError] = useState(null);

  // Detect Instagram browser
  useEffect(() => {
    const userAgent = navigator.userAgent || '';
    const isInstagram = /Instagram/i.test(userAgent) || /FBAN|FBAV/i.test(userAgent);
    setIsInstagramBrowser(isInstagram);
    
    if (isInstagram) {
      console.log('Instagram browser detected, enabling compatibility mode');
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  }, []);

  // Fetch tournaments for the score bar
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
        
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
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

  // Fetch all news articles
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), isInstagramBrowser ? 10000 : 15000)
        );

        const newsQuery = query(
          collection(db, 'news'),
          orderBy('publishDate', 'desc'),
          limit(20)
        );
        
        const newsPromise = getDocs(newsQuery);
        const newsSnapshot = await Promise.race([newsPromise, timeoutPromise]);
        
        const allNews = newsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Separate featured and regular news
        const featured = allNews.filter(article => article.featured);
        const regular = allNews.filter(article => !article.featured);

        setFeaturedArticles(featured);
        setNews(regular);
        setError(null);
      } catch (error) {
        console.error('Error fetching news:', error);
        if (error.message === 'Request timeout') {
          setError('Loading timeout - please check your connection and try again');
        } else if (isInstagramBrowser) {
          setError('Unable to load news in Instagram browser. Please open in your default browser.');
        } else {
          setError('Failed to load news articles');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [isInstagramBrowser]);

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
      <>
        <style>
          {`
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Regular.woff') format('woff');
              font-weight: 400;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Medium.woff') format('woff');
              font-weight: 500;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Semibold.woff') format('woff');
              font-weight: 600;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
              font-weight: 700;
              font-style: normal;
            }
          `}
        </style>
        <div className={`league-home min-h-screen ${isInstagramBrowser ? 'instagram-browser' : ''}`} style={{ backgroundColor: '#212121' }}>
          <div className="live-scores-banner">
            <div className="flex items-center justify-center px-4 py-2 w-full">
              <div className="text-lg text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
                {isInstagramBrowser ? 'Loading news in Instagram browser...' : 'Loading news...'}
              </div>
            </div>
          </div>
          <NewHomeNavbar />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>Loading articles...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>
          {`
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Regular.woff') format('woff');
              font-weight: 400;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Medium.woff') format('woff');
              font-weight: 500;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Semibold.woff') format('woff');
              font-weight: 600;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
              font-weight: 700;
              font-style: normal;
            }
          `}
        </style>
        <div className={`league-home min-h-screen ${isInstagramBrowser ? 'instagram-browser' : ''}`} style={{ backgroundColor: '#212121' }}>
          <div className="live-scores-banner">
            <div className="flex items-center px-4 py-2 w-full">
              <div className="flex-1 text-center">
                <span className="text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>Error Loading News</span>
              </div>
            </div>
          </div>
          <NewHomeNavbar />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Avantique, sans-serif' }}>Error Loading News</h1>
              <p className="text-gray-300 mb-8" style={{ fontFamily: 'Avantique, sans-serif' }}>{error}</p>
              
              {isInstagramBrowser && (
                <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                  <h3 className="font-semibold text-blue-100 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>Instagram Browser Issue?</h3>
                  <p className="text-blue-200 text-sm mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Try opening this page in your default browser for better performance.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    style={{ fontFamily: 'Avantique, sans-serif' }}
                  >
                    Retry Loading
                  </button>
                </div>
              )}
              
              <Link
                to="/"
                className="bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 transition-colors"
                style={{ fontFamily: 'Avantique, sans-serif' }}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>
        {`
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Regular.woff') format('woff');
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Medium.woff') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Semibold.woff') format('woff');
            font-weight: 600;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
            font-weight: 700;
            font-style: normal;
          }
        `}
      </style>
      <div className={`league-home min-h-screen ${isInstagramBrowser ? 'instagram-browser' : ''}`} style={{ backgroundColor: '#212121' }}>
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
          `}</style>
        )}

        {/* Live Tournament Scores Banner */}
        <div className="live-scores-banner">
          <div className="flex items-center px-4 py-2 w-full">
            <div className="flex items-center min-w-0 mr-4">
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="px-3 py-1 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 max-w-xs truncate bg-gray-800 text-white"
                style={{ fontFamily: 'Avantique, sans-serif' }}
              >
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 text-center">
              <span className="text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>Latest News</span>
              {isInstagramBrowser && (
                <span className="text-xs text-gray-200 block" style={{ fontFamily: 'Avantique, sans-serif' }}>Instagram Browser</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <NewHomeNavbar />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>Latest News</h1>
            <p className="text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>Stay updated with the latest news from Hyderabad Pickleball League</p>
          </div>

          {/* Featured Articles Section */}
          {featuredArticles.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Avantique, sans-serif' }}>Featured Articles</h2>
              <div className={`grid gap-8 ${isInstagramBrowser ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {featuredArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group border border-gray-700"
                  >
                    {(article.featuredImage?.url || article.featuredImage) && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={article.featuredImage?.url || article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={isInstagramBrowser ? "eager" : "lazy"}
                          onError={(e) => {
                            console.warn('Featured image failed to load:', e.target.src);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center mb-3">
                        <span className="bg-orange-500 text-white text-xs font-medium px-2.5 py-0.5 rounded" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          Featured
                        </span>
                        <span className="text-sm text-gray-400 ml-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {getTimeAgo(article.publishDate)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {article.title}
                      </h3>
                      {article.subtext && (
                        <p className="text-gray-300 mb-4 line-clamp-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {article.subtext}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {formatDate(article.publishDate)}
                        </span>
                        <span className="text-orange-500 font-medium text-sm group-hover:text-orange-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          Read More →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All News Articles Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {featuredArticles.length > 0 ? 'More News' : 'All News'}
            </h2>
            
            {news.length > 0 ? (
              <div className={`grid gap-6 ${isInstagramBrowser ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {news.map((article) => (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group border border-gray-700"
                  >
                    {(article.featuredImage?.url || article.featuredImage) && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={article.featuredImage?.url || article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={isInstagramBrowser ? "eager" : "lazy"}
                          onError={(e) => {
                            console.warn('Article image failed to load:', e.target.src);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="mb-2">
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {getTimeAgo(article.publishDate)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {article.title}
                      </h3>
                      {article.subtext && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {article.subtext}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {formatDate(article.publishDate)}
                        </span>
                        <span className="text-orange-500 font-medium text-xs group-hover:text-orange-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          Read More →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>No news articles yet</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Avantique, sans-serif' }}>Check back later for the latest updates from Hyderabad Pickleball League.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
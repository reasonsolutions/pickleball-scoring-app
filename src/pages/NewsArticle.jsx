import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';

export default function NewsArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedNews, setRelatedNews] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);

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
        
        // Set first tournament as default if available
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      }
    };

    fetchTournaments();
  }, []);

  // Fetch the specific article and related news
  useEffect(() => {
    const fetchArticleAndRelated = async () => {
      try {
        // Fetch the specific article
        const articleDoc = await getDoc(doc(db, 'news', id));
        
        if (articleDoc.exists()) {
          const articleData = {
            id: articleDoc.id,
            ...articleDoc.data()
          };
          setArticle(articleData);

          // Fetch related news (excluding current article)
          const relatedQuery = query(
            collection(db, 'news'),
            orderBy('publishDate', 'desc'),
            limit(5)
          );
          
          const relatedSnapshot = await getDocs(relatedQuery);
          const relatedData = relatedSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(item => item.id !== id); // Exclude current article
          
          setRelatedNews(relatedData.slice(0, 4)); // Show max 4 related articles
        } else {
          setArticle(null);
        }
      } catch (error) {
        console.error('Error fetching article:', error);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticleAndRelated();
    }
  }, [id]);

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
            <div className="text-lg">Loading tournaments...</div>
          </div>
        </div>

        {/* Navigation */}
        <LeagueNavbar />

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading article...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="league-home min-h-screen bg-gray-50">
        {/* Live Tournament Scores Banner */}
        <div className="live-scores-banner">
          <div className="flex items-center px-4 py-2 w-full">
            <div className="flex-1 text-center">
              <span className="text-white font-semibold">Article Not Found</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <LeagueNavbar />

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
            <p className="text-gray-600 mb-8">The article you're looking for doesn't exist or has been removed.</p>
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
    <div className="league-home min-h-screen bg-gray-50">
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
          {/* Featured Image */}
          {(article.featuredImage?.url || article.featuredImage) && (
            <div className="aspect-video w-full">
              <img
                src={article.featuredImage?.url || article.featuredImage}
                alt={article.title}
                className="w-full h-full object-cover"
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
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {article.description}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Related News */}
        {relatedNews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch all featured videos
  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        // Fetch from admin-managed featured videos
        const featuredVideosQuery = query(
          collection(db, 'featuredVideos'),
          orderBy('createdAt', 'desc')
        );
        
        const featuredSnapshot = await getDocs(featuredVideosQuery);
        
        if (featuredSnapshot.docs.length > 0) {
          // Use admin-managed videos
          const videosData = featuredSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              youtubeUrl: data.youtubeUrl,
              description: data.description,
              videoId: data.videoId,
              createdAt: data.createdAt,
              type: 'featured'
            };
          });
          setVideos(videosData);
        } else {
          // Fallback to fixtures with YouTube URLs if no admin videos exist
          const fixturesRef = collection(db, 'fixtures');
          const fixturesQuery = query(
            fixturesRef,
            orderBy('createdAt', 'desc')
          );
          
          const fixturesSnapshot = await getDocs(fixturesQuery);
          const videosData = fixturesSnapshot.docs
            .map(doc => doc.data())
            .filter(data => data.youtubeUrl && data.youtubeUrl.trim() !== '')
            .map(data => ({
              id: data.id,
              title: `${data.player1Team1 || data.team1Name || 'Team 1'} vs ${data.player1Team2 || data.team2Name || 'Team 2'}`,
              youtubeUrl: data.youtubeUrl,
              description: tournaments.find(t => t.id === data.tournamentId)?.name ||
                          tournaments.find(t => t.id === data.tournamentId)?.tournamentName ||
                          'Tournament Match',
              createdAt: data.createdAt,
              type: 'match'
            }));
          setVideos(videosData);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllVideos();
  }, [tournaments]);

  // Helper function to extract YouTube video ID
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

  if (loading) {
    return (
      <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
        <style>{`
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueRegularFont}') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueMediumFont}') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueSemiboldFont}') format('woff');
            font-weight: 600;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueBoldFont}') format('woff');
            font-weight: bold;
            font-style: normal;
          }
        `}</style>
        

        {/* Navigation */}
        <NewHomeNavbar />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-white" style={{fontFamily: 'Avantique, sans-serif'}}>Loading videos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>
      
      {/* New Navigation Header */}
      <div className="new-nav-header bg-gradient-to-r from-orange-500 to-red-800 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Left Side - Navigation Buttons */}
          <div className="flex space-x-0">
            <Link to="/new-home" className="nav-button bg-white text-gray-800 px-3 sm:px-6 lg:px-8 py-2 sm:py-3 font-bold text-lg sm:text-xl lg:text-2xl hover:bg-gray-100 transition-colors border-t-4 border-b-4 border-l-4 border-r-2 border-black" style={{fontFamily: 'Avantique, sans-serif'}}>
              HPL
            </Link>
            <Link to="/hpl-clubs" className="nav-button bg-white text-gray-800 px-2 sm:px-4 lg:px-8 py-2 sm:py-3 font-bold text-lg sm:text-xl lg:text-2xl hover:bg-gray-100 transition-colors border-t-4 border-b-4 border-l-2 border-r-4 border-black" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline" style={{fontFamily: 'Avantique, sans-serif'}}>HPL Clubs</span>
              <span className="sm:hidden" style={{fontFamily: 'Avantique, sans-serif'}}>Clubs</span>
            </Link>
          </div>

          {/* Right Side - Social Media Icons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <a
              href="https://www.instagram.com/hyderabadpickleballleague"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-header bg-orange-500 p-2 sm:p-3 rounded-full hover:bg-orange-600 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@centrecourtsports"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-header bg-orange-500 p-2 sm:p-3 rounded-full hover:bg-orange-600 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <NewHomeNavbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>Featured Videos</h1>
          <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>Watch highlights and featured matches from our tournaments</p>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-300 text-lg mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>No videos available</div>
            <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>Check back later for featured videos and match highlights.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => {
              const videoId = extractVideoId(video.youtubeUrl);
              return (
                <div key={video.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all hover:transform hover:scale-105 border border-gray-700">
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video">
                    {videoId ? (
                      <div className="relative w-full h-full">
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to medium quality thumbnail if maxres fails
                            e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                          }}
                        />
                        <a
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-all group"
                        >
                          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform hover:bg-orange-600">
                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>Invalid Video</span>
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-300 mb-3 line-clamp-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="capitalize" style={{fontFamily: 'Avantique, sans-serif'}}>{video.type} Video</span>
                      {video.createdAt && (
                        <span style={{fontFamily: 'Avantique, sans-serif'}}>
                          {video.createdAt.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
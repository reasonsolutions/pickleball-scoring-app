import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import OptimizedImage from '../components/OptimizedImage';
import { getOptimizedUrlByType, optimizeCloudinaryUrl } from '../utils/imageOptimizationHelper';

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

// Import images
import hplClubsLogo from '../assets/hplclubs_logo.png';

export default function Clubs() {
  const [activeClubs, setActiveClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch active clubs
  useEffect(() => {
    const fetchActiveClubs = async () => {
      try {
        setLoading(true);
        const clubsQuery = query(
          collection(db, 'hpl-clubs'),
          where('status', '==', 'active')
        );
        
        const querySnapshot = await getDocs(clubsQuery);
        const clubsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter out "Test Team" before setting state
        const filteredClubs = clubsData.filter(club => club.proposedClubName !== "Test Team");
        setActiveClubs(filteredClubs);
      } catch (error) {
        console.error('Error fetching active clubs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveClubs();
  }, []);
  
  // Add font styles
  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
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
  `;

  return (
    <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Main Content */}
      <div className="py-16 sm:py-24">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-400 mb-4" style={{ fontFamily: 'Avantique, sans-serif' }}>
              HPL Clubs
            </h1>
            <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
          </div>
          
          {/* Clubs Grid */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : activeClubs.length === 0 ? (
            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl text-white mb-6" style={{ fontFamily: 'Avantique, sans-serif' }}>
                No Active Clubs Yet
              </h2>
              <p className="text-xl text-orange-300 mb-8" style={{ fontFamily: 'Avantique, sans-serif' }}>
                Check back soon for participating clubs
              </p>
              
              <div className="w-16 h-1 bg-orange-500 mx-auto mb-8"></div>
              
              <p className="text-gray-300 text-lg">
                Clubs will be displayed here once they become active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeClubs.map((club) => (
                <Link
                  key={club.id}
                  to={`/club-info/${club.id}`}
                  className="block overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-300 rounded-xl"
                >
                  <div className="relative" style={{ paddingBottom: "125%" }}>
                    {/* Blue geometric background */}
                    <div
                      className="absolute inset-0 z-0"
                      style={club.backgroundImage && club.backgroundImage.url ? {
                        backgroundImage: `url(${getOptimizedUrlByType(club.backgroundImage.url, 'featured')})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      } : {
                        backgroundColor: "#1e3a8a",
                        backgroundImage: `linear-gradient(135deg, rgba(59, 130, 246, 0.3) 25%, transparent 25%, transparent 50%, rgba(59, 130, 246, 0.3) 50%, rgba(59, 130, 246, 0.3) 75%, transparent 75%, transparent)`,
                        backgroundSize: "40px 40px",
                      }}
                    ></div>
                    
                    {/* Owner Images */}
                    {club.ownerImages && club.ownerImages.length > 0 ? (
                      <div className="absolute inset-0 z-10">
                        {/* Single owner case */}
                        {club.ownerImages.length === 1 && (
                          <div className="w-full h-full flex items-end justify-center">
                            <img
                              src={optimizeCloudinaryUrl(club.ownerImages[0].url, { quality: 'auto:eco', format: 'auto' })}
                              alt={`${club.primaryOwnerName}`}
                              className="w-auto h-4/5 object-contain object-bottom"
                            />
                          </div>
                        )}
                        
                        {/* Multiple owners case */}
                        {club.ownerImages.length > 1 && (
                          <div className="w-full h-full relative flex items-end justify-center overflow-hidden">
                            {club.ownerImages.map((ownerImage, index) => {
                              // Calculate center points for overlapping
                              // For 2 images: 40%, 60%
                              // For 3 images: 30%, 50%, 70%
                              // For 4 images: 25%, 40%, 60%, 75%
                              const totalImages = club.ownerImages.length;
                              const increment = 100 / (totalImages + 1);
                              const positionPercent = increment + (index * (100 - (2 * increment)) / (totalImages - 1));
                              
                              return (
                                <div
                                  key={index}
                                  className="absolute h-full flex justify-center items-end"
                                  style={{
                                    left: `${positionPercent}%`,
                                    transform: 'translateX(-50%)',
                                    zIndex: 10 - index,
                                    width: '60%'
                                  }}
                                >
                                  <img
                                    src={optimizeCloudinaryUrl(ownerImage.url, { quality: 'auto:eco', format: 'auto' })}
                                    alt={`Club owner ${index + 1}`}
                                    className="h-4/5 w-auto max-w-full object-contain object-bottom"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Gradient overlay for text visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>
                      </div>
                    ) : null}
                    
                    {/* Club logo */}
                    <div className="absolute top-6 left-6 w-32 h-32 z-20 flex items-center justify-center">
                      {club.teamLogo && club.teamLogo.url ? (
                        <OptimizedImage
                          src={club.teamLogo.url}
                          alt={`${club.proposedClubName} logo`}
                          type="logo"
                          className="w-full h-full object-contain filter drop-shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center text-4xl text-white font-bold">
                          {club.proposedClubName?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    
                    {/* Club info */}
                    <div className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-7">
                      <h2 className="text-[2.5rem] leading-tight font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {club.proposedClubName}
                      </h2>
                      <p className="text-xl text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {club.ownerNames || club.primaryOwnerName || "Club Owner"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
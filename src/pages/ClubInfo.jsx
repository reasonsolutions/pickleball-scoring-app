import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import { getOptimizedUrlByType, optimizeCloudinaryUrl } from '../utils/imageOptimizationHelper';

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function ClubInfo() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [clubData, setClubData] = useState(null);
  const [clubPlayers, setClubPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        setLoading(true);
        
        // Fetch club details
        const clubDoc = await getDoc(doc(db, 'hpl-clubs', clubId));
        if (!clubDoc.exists()) {
          throw new Error('Club not found');
        }
        
        const data = clubDoc.data();
        setClubData({
          id: clubDoc.id,
          ...data
        });
        
        // Fetch players for this club
        const playersQuery = query(
          collection(db, 'clubs-players'),
          where('recruitedBy', '==', clubId)
        );
        
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setClubPlayers(playersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching club data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (clubId) {
      fetchClubData();
    }
  }, [clubId]);

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

  // Function to get player positions
  const getPlayerPosition = (index, player) => {
    if (player.position) {
      return player.position;
    }
    
    // For Pickleball, we should use appropriate positions rather than soccer positions
    const positions = ['RIGHT', 'LEFT', 'SERVER', 'RECEIVER'];
    return positions[index % positions.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <NewHomeNavbar />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <NewHomeNavbar />
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-red-400 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
              Error
            </h2>
            <p className="text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {error}
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <NewHomeNavbar />
        <div className="container mx-auto px-4 py-16">
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
              Club Not Found
            </h2>
            <p className="text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
              The club you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Club Banner */}
      <div className="w-full bg-black py-5">
        <div className="container mx-auto px-4 flex items-center">
          {/* Club Logo */}
          <div className="w-24 h-24 flex-shrink-0">
            {clubData.teamLogo && clubData.teamLogo.url ? (
              <div className="w-full h-full">
                <OptimizedImage
                  src={clubData.teamLogo.url}
                  alt={`${clubData.proposedClubName} logo`}
                  type="logo"
                  className="w-full h-full object-contain"
                  loading="eager"
                  onError={(e) => {
                    console.log("Logo failed to load:", clubData.teamLogo.url);
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                      <span class="text-3xl font-bold text-white" style="font-family: Avantique, sans-serif">
                        ${clubData.proposedClubName?.charAt(0) || 'C'}
                      </span>
                    </div>`;
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  {clubData.proposedClubName?.charAt(0) || 'C'}
                </span>
              </div>
            )}
          </div>
          
          {/* Club Name and Founded */}
          <div className="ml-5">
            <h1 className="text-5xl font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {clubData.proposedClubName}
            </h1>
            <div className="text-gray-400">
              <span className="text-lg" style={{ fontFamily: 'Avantique, sans-serif' }}>
                Founded: {(() => {
                  // Handle different possible date formats
                  try {
                    if (clubData.submittedAt) {
                      if (clubData.submittedAt.toDate) {
                        // Firestore timestamp
                        return clubData.submittedAt.toDate().getFullYear();
                      } else if (typeof clubData.submittedAt === 'string') {
                        // Date string
                        return new Date(clubData.submittedAt).getFullYear();
                      } else if (clubData.submittedAt instanceof Date) {
                        // Already a Date object
                        return clubData.submittedAt.getFullYear();
                      }
                    }
                    // Default to current year if none of the above work
                    return new Date().getFullYear();
                  } catch (e) {
                    return new Date().getFullYear();
                  }
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
              
              {/* Club Info Section - New section added to match the design */}
              <div className="bg-[#2A2A2A] rounded-xl overflow-hidden mb-16 shadow-xl w-full">
                <div className="flex flex-col md:flex-row">
                  {/* Left side - Owner image */}
                  <div className="w-full md:w-[35%] relative" style={{ minHeight: '550px' }}>
                    {/* Background with gradient or image */}
                    <div
                      className="absolute inset-0 z-0"
                      style={clubData.backgroundImage && clubData.backgroundImage.url ? {
                        backgroundImage: `url(${getOptimizedUrlByType(clubData.backgroundImage.url, 'background')})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      } : {
                        background: 'linear-gradient(135deg, #4c1d95, #7e22ce 70%)'
                      }}
                    ></div>
                    
                    {/* Owner Image */}
                    {clubData.ownerImages && clubData.ownerImages.length > 0 ? (
                      <div className="absolute inset-0 z-10 flex items-end justify-center">
                        <img
                          src={optimizeCloudinaryUrl(clubData.ownerImages[0].url, { crop: 'fit', quality: 'auto:eco', format: 'auto' })}
                          alt={`${clubData.primaryOwnerName}`}
                          className="w-auto h-auto max-h-[95%] object-contain object-bottom"
                        />
                        {/* Gradient overlay for text visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                      </div>
                    ) : null}
                    
                    {/* Owner name at bottom */}
                    {clubData.primaryOwnerName && (
                      <div className="absolute bottom-6 left-6 z-20 text-white font-bold text-2xl" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {clubData.primaryOwnerName}
                      </div>
                    )}
                  </div>
                  
                  {/* Right side - Club information */}
                  <div className="w-full md:w-[65%] p-6 sm:p-8 md:p-10 flex flex-col justify-center relative">
                    {/* Club name - Responsive sizing */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 md:mb-8 pr-20 sm:pr-24 md:pr-0" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {clubData.proposedClubName}
                    </h1>
                    
                    {/* Club logo on right side */}
                    {clubData.teamLogo && clubData.teamLogo.url && (
                      <div className="absolute top-4 right-4 w-24 h-24 sm:w-28 sm:h-28 md:top-8 md:right-8 md:w-36 md:h-36">
                        <OptimizedImage
                          src={clubData.teamLogo.url}
                          alt={`${clubData.proposedClubName} logo`}
                          type="logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Club details */}
                    <div className="space-y-8 mt-4">
                      <div>
                        <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-1" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          PRIMARY OWNER
                        </h3>
                        <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {clubData.primaryOwnerName || "Club Owner"}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-1" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          HOME VENUE
                        </h3>
                        <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {clubData.venueName || clubData.preferredLocation || "House of Play - Kondapur"}
                        </p>
                      </div>
                      
                      {/* Always show CLUB USP section */}
                      <div>
                        <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-1" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          CLUB USP
                        </h3>
                        <p className="text-white leading-relaxed" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {clubData.clubUSP || "This isn't just a pickleball club—it's a launchpad. Train with purpose, compete with the best, and grow in a culture built on intensity, accountability, and winning together. Whether you're chasing mastery or medals, this is where serious players are forged."}
                        </p>
                      </div>
                      
                      {/* Always show CLUB CULTURE section */}
                      <div>
                        <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-1" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          CLUB CULTURE
                        </h3>
                        <p className="text-white leading-relaxed" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {clubData.uniqueCulture || "Fun in our club comes from shared wins, hard laughs, and zero ego. Music on court, friendly trash talk, team challenges, and post-game hangs are part of the routine. We train hard, but we celebrate harder—so every session feels competitive, energizing, and something you look forward to."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Squad Section Heading */}
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  THE SQUAD
                </h2>
              </div>

        {/* Players Grid */}
        {clubPlayers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
              No players registered for this club yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clubPlayers.map((player, index) => {
              // Get player photo URL
              const photoUrl = player.photoUrl || player.photo?.url;
              
              return (
                <div
                  key={player.id}
                  className="bg-gray-800 rounded-xl overflow-hidden group cursor-pointer hover:shadow-2xl transition-shadow duration-300"
                  onClick={() => navigate(`/club-info/${clubId}/player-stats/${player.id}`)}
                >
                  {/* Player Image with Hover Effect */}
                  <div className="aspect-square bg-gray-700 relative overflow-hidden flex items-center justify-center">
                    {photoUrl ? (
                       <>
                         <OptimizedImage
                           src={photoUrl}
                           alt={player.fullName}
                          type="playerPhoto"
                          responsive={true}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        
                        {/* DUPR Ratings Overlay (slides up on hover) */}
                        <div className="absolute inset-0 bg-black/75 flex flex-col justify-center items-center text-white p-4 transition-transform duration-300 transform translate-y-full group-hover:translate-y-0">
                          <div className="text-center">
                            <h4 className="font-bold mb-2 text-lg" style={{ fontFamily: 'Avantique, sans-serif' }}>DUPR RATINGS</h4>
                            <div className="flex justify-center space-x-4">
                              <div>
                                <p className="text-xs uppercase text-gray-400">Singles</p>
                                <p className="text-2xl font-bold">{player.singlesRating || "N/A"}</p>
                              </div>
                              <div className="w-px h-12 bg-gray-600"></div>
                              <div>
                                <p className="text-xs uppercase text-gray-400">Doubles</p>
                                <p className="text-2xl font-bold">{player.doublesRating || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl text-gray-500">👤</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Player Name & Team Logo */}
                  <div className="p-4 flex items-center">
                    {clubData.teamLogo && clubData.teamLogo.url && (
                      <div className="w-8 h-8 mr-2">
                        <OptimizedImage
                          src={clubData.teamLogo.url}
                          alt={clubData.proposedClubName}
                          type="logoSmall"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white uppercase" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {player.fullName}
                    </h3>
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
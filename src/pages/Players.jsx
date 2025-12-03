import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import CloudinaryImageUpload from '../components/CloudinaryImageUpload';

export default function Players() {
  const { id: tournamentId } = useParams();
  const { currentUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);

  // Use tournament ID from params or current user
  const activeTournamentId = tournamentId || currentUser?.tournamentId;

  useEffect(() => {
    fetchTeamPlayers();
  }, [activeTournamentId, currentUser]);

  const fetchTeamPlayers = async () => {
    if (!activeTournamentId || !currentUser?.teamName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, find the team that belongs to this team admin
      const teamsRef = collection(db, 'teams');
      const teamQuery = query(
        teamsRef,
        where('tournamentId', '==', activeTournamentId),
        where('name', '==', currentUser.teamName)
      );
      const teamSnapshot = await getDocs(teamQuery);
      
      if (teamSnapshot.empty) {
        console.log('No team found for team admin:', currentUser.teamName);
        setPlayers([]);
        setLoading(false);
        return;
      }

      const teamDoc = teamSnapshot.docs[0];
      const teamData = { id: teamDoc.id, ...teamDoc.data() };
      setTeamInfo(teamData);
      
      // Get the player IDs from the team
      const playerIds = teamData.playerIds || [];
      
      if (playerIds.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      // Fetch players that belong to this team
      const playersRef = collection(db, 'players');
      const playersQuery = query(playersRef, where('tournamentId', '==', activeTournamentId));
      const playersSnapshot = await getDocs(playersQuery);
      
      const allPlayers = [];
      playersSnapshot.forEach((doc) => {
        allPlayers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Filter players to only include those in the team's playerIds array
      const teamPlayers = allPlayers.filter(player => playerIds.includes(player.id));
      
      // Sort players by name
      teamPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setPlayers(teamPlayers);
    } catch (error) {
      console.error('Error fetching team players:', error);
      alert('Failed to fetch team players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setShowUploadModal(true);
  };

  const handlePhotoUpload = async (uploadResult) => {
    if (!selectedPlayer || !uploadResult) return;

    try {
      setUploadingPhoto(true);
      
      // Update player's photo in Firebase (using the correct structure)
      const playerRef = doc(db, 'players', selectedPlayer.id);
      await updateDoc(playerRef, {
        photo: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        },
        photoUrl: uploadResult.secure_url, // Keep for backward compatibility
        photoPublicId: uploadResult.public_id, // Keep for backward compatibility
        updatedAt: new Date()
      });

      // Update local state
      setPlayers(prevPlayers =>
        prevPlayers.map(player =>
          player.id === selectedPlayer.id
            ? {
                ...player,
                photo: { url: uploadResult.secure_url, publicId: uploadResult.public_id },
                photoUrl: uploadResult.secure_url,
                photoPublicId: uploadResult.public_id
              }
            : player
        )
      );

      // Update selected player
      setSelectedPlayer(prev => ({
        ...prev,
        photo: { url: uploadResult.secure_url, publicId: uploadResult.public_id },
        photoUrl: uploadResult.secure_url,
        photoPublicId: uploadResult.public_id
      }));

      alert('Player photo updated successfully!');
    } catch (error) {
      console.error('Error updating player photo:', error);
      alert('Failed to update player photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedPlayer(null);
  };

  // No need for fixed slots, just display all players in a 5-column grid

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Team Players</h1>
            {teamInfo && (
              <p className="text-lg text-gray-600 mt-1">Team: {teamInfo.name}</p>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {players.length} player{players.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {!activeTournamentId ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No Tournament Selected</h3>
            <p className="text-gray-600">Please select a tournament to view players.</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No Team Players Found</h3>
            <p className="text-gray-600">No players have been added to your team yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {players.map((player) => {
              // Get photo URL from different possible sources
              const photoUrl = player.photo?.url || player.photoUrl || null;
              
              return (
                <div
                  key={player.id}
                  className="aspect-square border-2 border-solid border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 transition-all duration-200 bg-white shadow-md hover:shadow-lg cursor-pointer hover:border-primary"
                  onClick={() => handlePlayerClick(player)}
                >
                  <div className="w-16 h-16 mb-3 relative">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={player.name}
                        className="w-full h-full object-cover rounded-full border-2 border-gray-200"
                        onError={(e) => {
                          console.log('Image failed to load:', photoUrl);
                          e.target.style.display = 'none';
                          e.target.parentNode.querySelector('.fallback-avatar').style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`fallback-avatar absolute inset-0 w-full h-full bg-gray-200 rounded-full flex items-center justify-center ${photoUrl ? 'hidden' : ''}`}>
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-center mb-2 line-clamp-2">
                    {player.name || 'Unnamed Player'}
                  </h3>
                  <div className="text-xs text-gray-600 text-center space-y-1">
                    {player.doublesRating && (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Doubles: {player.doublesRating}
                      </div>
                    )}
                    {player.singlesRating && (
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Singles: {player.singlesRating}
                      </div>
                    )}
                    {!player.doublesRating && !player.singlesRating && (
                      <div className="text-gray-400 text-xs">No rating</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo Upload Modal */}
        {showUploadModal && selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Update Player Photo</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={uploadingPhoto}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">{selectedPlayer.name}</h3>
                {selectedPlayer.rating && (
                  <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Rating: {selectedPlayer.rating}
                  </div>
                )}
              </div>

              <CloudinaryImageUpload
                onImageUpload={handlePhotoUpload}
                currentImage={selectedPlayer.photo?.url || selectedPlayer.photoUrl}
                label="Player Photo"
                uploadType="player"
                className="mb-6"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="btn btn-outline"
                  disabled={uploadingPhoto}
                >
                  Cancel
                </button>
              </div>

              {uploadingPhoto && (
                <div className="mt-4 text-center">
                  <div className="loading loading-spinner loading-sm mr-2"></div>
                  <span className="text-sm text-gray-600">Updating player photo...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function FixtureList() {
  const { id: tournamentId, fixtureId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fixtureInfo, setFixtureInfo] = useState(null);
  
  // Edit match state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    player1Team1: '',
    player2Team1: '',
    player1Team2: '',
    player2Team2: '',
    youtubeLink: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          setTournament(tournamentData);
        }

        // Fetch teams for this tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', tournamentId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeams(teamsData);

        // Fetch players for this tournament
        const playersQuery = query(
          collection(db, 'players'),
          where('tournamentId', '==', tournamentId)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playersData);

        // Fetch matches for this fixture group
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId),
          where('fixtureGroupId', '==', fixtureId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort matches by match number
        matchesData.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        setMatches(matchesData);

        // Set fixture info from first match
        if (matchesData.length > 0) {
          const firstMatch = matchesData[0];
          setFixtureInfo({
            team1Name: firstMatch.team1Name,
            team2Name: firstMatch.team2Name,
            date: firstMatch.date,
            team1: firstMatch.team1,
            team2: firstMatch.team2
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load fixture data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && fixtureId) {
      fetchData();
    }
  }, [tournamentId, fixtureId]);

  const getTeamPlayers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name } : null;
    }).filter(Boolean);
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setEditForm({
      date: match.date.toDate().toISOString().split('T')[0],
      time: match.time || '',
      player1Team1: match.player1Team1 || '',
      player2Team1: match.player2Team1 || '',
      player1Team2: match.player1Team2 || '',
      player2Team2: match.player2Team2 || '',
      youtubeLink: match.youtubeLink || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    
    try {
      const updatedMatch = {
        // Keep all existing required fields
        tournamentId: editingMatch.tournamentId,
        matchType: editingMatch.matchType,
        matchTypeLabel: editingMatch.matchTypeLabel,
        team1: editingMatch.team1,
        team2: editingMatch.team2,
        team1Name: editingMatch.team1Name,
        team2Name: editingMatch.team2Name,
        status: editingMatch.status,
        createdBy: editingMatch.createdBy,
        createdAt: editingMatch.createdAt,
        fixtureGroupId: editingMatch.fixtureGroupId,
        matchNumber: editingMatch.matchNumber,
        // Update the editable fields
        date: new Date(editForm.date),
        time: editForm.time,
        player1Team1: editForm.player1Team1,
        player2Team1: editForm.player2Team1,
        player1Team2: editForm.player1Team2,
        player2Team2: editForm.player2Team2,
        youtubeLink: editForm.youtubeLink,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', editingMatch.id), updatedMatch);
      
      // Update local state
      setMatches(prev => prev.map(match => 
        match.id === editingMatch.id 
          ? { ...match, ...updatedMatch, date: { toDate: () => new Date(editForm.date) } }
          : match
      ));
      
      setShowEditModal(false);
      setEditingMatch(null);
      setError('');
    } catch (error) {
      console.error('Error updating match:', error);
      setError('Failed to update match');
    }
  };

  const getAvailableCategories = () => {
    if (!tournament?.categories) return [];
    
    return Object.entries(tournament.categories)
      .filter(([_, selected]) => selected)
      .map(([key, _]) => {
        switch (key) {
          case 'mensSingles': return { key, label: "Men's Singles", type: 'singles' };
          case 'mensDoubles': return { key, label: "Men's Doubles", type: 'doubles' };
          case 'womensSingles': return { key, label: "Women's Singles", type: 'singles' };
          case 'womensDoubles': return { key, label: "Women's Doubles", type: 'doubles' };
          case 'mixedDoubles': return { key, label: "Mixed Doubles", type: 'doubles' };
          default: return { key, label: key, type: 'singles' };
        }
      });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error && !fixtureInfo) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="mt-6">
            <button
              className="btn btn-outline"
              onClick={() => navigate(`/tournaments/${tournamentId}/fixtures`)}
            >
              Back to Fixtures
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/tournaments/${tournamentId}/fixtures`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Fixtures
            </button>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">Fixture Matches</h1>
          {fixtureInfo && (
            <div className="flex items-center gap-4 text-lg">
              <span className="text-primary font-bold">{fixtureInfo.team1Name}</span>
              <span className="text-base-content/60">VS</span>
              <span className="text-secondary font-bold">{fixtureInfo.team2Name}</span>
              <span className="text-base-content/60">•</span>
              <span className="text-base-content/70">
                {fixtureInfo.date.toDate().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Matches List */}
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div key={match.id} className="card bg-base-100 shadow-lg">
              <div className="card-body p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold">Match {index + 1}</div>
                    <div className="badge badge-primary badge-lg">
                      {match.matchTypeLabel}
                    </div>
                    {match.time && (
                      <div className="text-lg font-bold">{match.time}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Live Video Icon */}
                    {match.youtubeLink && (
                      <div className="tooltip" data-tip="Live Stream Available">
                        <a
                          href={match.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-content transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      </div>
                    )}
                    
                    {/* Umpire Icon */}
                    <div className="tooltip" data-tip="Open Umpire Scoring">
                      <button
                        className="w-10 h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-secondary hover:text-secondary-content transition-colors"
                        onClick={() => {
                          const umpireUrl = `${window.location.origin}/umpire/${match.id}`;
                          window.open(umpireUrl, '_blank');
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </button>
                    </div>
                    
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleEditMatch(match)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xl font-bold">{match.team1Name}</div>
                  <div className="text-lg font-medium text-base-content/60">VS</div>
                  <div className="text-xl font-bold">{match.team2Name}</div>
                </div>
                
                {/* Show assigned players if any */}
                {(match.player1Team1 || match.player1Team2) ? (
                  <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-base-300">
                    <div>
                      <div className="font-semibold text-sm text-base-content/70 mb-2">
                        {match.team1Name} Players:
                      </div>
                      <div className="space-y-1">
                        {match.player1Team1 && (
                          <div className="text-sm">• {match.player1Team1}</div>
                        )}
                        {match.player2Team1 && (
                          <div className="text-sm">• {match.player2Team1}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-base-content/70 mb-2">
                        {match.team2Name} Players:
                      </div>
                      <div className="space-y-1">
                        {match.player1Team2 && (
                          <div className="text-sm">• {match.player1Team2}</div>
                        )}
                        {match.player2Team2 && (
                          <div className="text-sm">• {match.player2Team2}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-base-content/50 border-t border-base-300 mt-4">
                    Players not assigned yet - Click Edit to assign players
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Match Modal */}
        {showEditModal && editingMatch && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
              <h3 className="font-bold text-lg mb-4">
                Edit Match - {editingMatch.matchTypeLabel}
              </h3>
              
              <form onSubmit={handleUpdateMatch} className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Date *</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="input input-bordered w-full"
                      value={editForm.date}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Time</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      className="input input-bordered w-full"
                      value={editForm.time}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                {/* YouTube Live Link */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">YouTube Live Link</span>
                  </label>
                  <input
                    type="url"
                    name="youtubeLink"
                    placeholder="https://youtube.com/watch?v=..."
                    className="input input-bordered w-full"
                    value={editForm.youtubeLink}
                    onChange={handleEditFormChange}
                  />
                </div>

                {/* Player Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Player Assignment</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Team 1 Players */}
                    <div className="space-y-2">
                      <label className="label">
                        <span className="label-text font-medium">
                          {editingMatch.team1Name} Players
                        </span>
                      </label>
                      
                      <select
                        name="player1Team1"
                        className="select select-bordered w-full select-sm"
                        value={editForm.player1Team1}
                        onChange={handleEditFormChange}
                      >
                        <option value="">Select player 1</option>
                        {getTeamPlayers(editingMatch.team1).map((player) => (
                          <option key={player.id} value={player.name}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      
                      {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                        <select
                          name="player2Team1"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player2Team1}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 2</option>
                          {getTeamPlayers(editingMatch.team1).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Team 2 Players */}
                    <div className="space-y-2">
                      <label className="label">
                        <span className="label-text font-medium">
                          {editingMatch.team2Name} Players
                        </span>
                      </label>
                      
                      <select
                        name="player1Team2"
                        className="select select-bordered w-full select-sm"
                        value={editForm.player1Team2}
                        onChange={handleEditFormChange}
                      >
                        <option value="">Select player 1</option>
                        {getTeamPlayers(editingMatch.team2).map((player) => (
                          <option key={player.id} value={player.name}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      
                      {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                        <select
                          name="player2Team2"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player2Team2}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 2</option>
                          {getTeamPlayers(editingMatch.team2).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingMatch(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Match
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
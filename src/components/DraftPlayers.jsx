import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function DraftPlayers() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    gender: '',
    age: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch draft players from Firestore
  const fetchDraftPlayers = async () => {
    try {
      console.log('🔥 Fetching draft players from Firebase');
      const playersQuery = query(
        collection(db, 'draftPlayers'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(playersQuery);
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching draft players:', error);
      setPlayers([]);
    }
  };

  // Fetch teams from Firestore
  const fetchTeams = async () => {
    try {
      console.log('🔥 Fetching teams from Firebase');
      const teamsQuery = query(
        collection(db, 'draftTeams'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(teamsQuery);
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        playerCount: 0
      }));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDraftPlayers();
    fetchTeams();
  }, []);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeamFilter = filterTeam === 'all' || 
      (filterTeam === 'drafted' && player.drafted) ||
      (filterTeam === 'undrafted' && !player.drafted) ||
      (player.team && player.team.toLowerCase().includes(filterTeam.toLowerCase()));
    
    return matchesSearch && matchesTeamFilter;
  });

  const handleDraftPlayer = async () => {
    if (!selectedPlayer || !selectedTeam) {
      alert('Please select both a player and a team');
      return;
    }

    try {
      const selectedTeamData = teams.find(t => t.id === selectedTeam);
      
      const playerRef = doc(db, 'draftPlayers', selectedPlayer.id);
      await updateDoc(playerRef, {
        team: selectedTeamData?.name || null,
        teamId: selectedTeamData?.id || null,
        drafted: true,
        updatedAt: serverTimestamp()
      });

      setPlayers(prev => prev.map(player =>
        player.id === selectedPlayer.id
          ? { ...player, team: selectedTeamData?.name, teamId: selectedTeamData?.id, drafted: true }
          : player
      ));

      setSelectedPlayer(null);
      setSelectedTeam('');
      alert('Player drafted successfully!');
      
    } catch (error) {
      console.error('Error drafting player:', error);
      alert('Failed to draft player. Please try again.');
    }
  };

  const handleUndraftPlayer = async (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !player.drafted) return;

    try {
      const playerRef = doc(db, 'draftPlayers', playerId);
      await updateDoc(playerRef, {
        team: null,
        teamId: null,
        drafted: false,
        updatedAt: serverTimestamp()
      });

      setPlayers(prev => prev.map(p =>
        p.id === playerId
          ? { ...p, team: null, teamId: null, drafted: false }
          : p
      ));
      
      alert('Player undrafted successfully!');
      
    } catch (error) {
      console.error('Error undrafting player:', error);
      alert('Failed to undraft player. Please try again.');
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    
    if (!newPlayer.name.trim() || !newPlayer.gender) {
      alert('Please fill in all required fields (Name, Gender)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const playerData = {
        name: newPlayer.name.trim(),
        gender: newPlayer.gender,
        age: newPlayer.age || null,
        team: null,
        teamId: null,
        drafted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('💾 Saving player to Firestore:', playerData);
      const docRef = await addDoc(collection(db, 'draftPlayers'), playerData);
      
      const newPlayerWithId = {
        id: docRef.id,
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setPlayers(prev => [newPlayerWithId, ...prev]);
      
      setNewPlayer({
        name: '',
        gender: '',
        age: ''
      });
      
      setShowAddPlayerForm(false);
      alert('Player added successfully!');
      
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Failed to add player. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'draftPlayers', playerId));
      setPlayers(prev => prev.filter(player => player.id !== playerId));
      alert('Player deleted successfully!');
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to delete player. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Player Section */}
      <div className="card shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title text-xl" style={{ color: 'var(--text-primary)' }}>
              Add Players for Draft
            </h3>
            <button
              className="btn btn-sm"
              style={{
                backgroundColor: 'var(--primary-blue)',
                color: 'white',
                border: 'none'
              }}
              onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
            >
              {showAddPlayerForm ? 'Cancel' : 'Add Player'}
            </button>
          </div>

          {/* Manual Add Player Form */}
          {showAddPlayerForm && (
            <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--border-color)' }}>
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Player Name */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Player Name *
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Enter player name"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Gender *
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      value={newPlayer.gender}
                      onChange={(e) => setNewPlayer(prev => ({ ...prev, gender: e.target.value }))}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  {/* Age */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Age
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Enter age"
                      value={newPlayer.age}
                      onChange={(e) => setNewPlayer(prev => ({ ...prev, age: e.target.value }))}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{
                    backgroundColor: 'var(--primary-green)',
                    color: 'white',
                    border: 'none'
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Adding...
                    </>
                  ) : (
                    'Add Player'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="form-control">
          <input 
            type="text" 
            placeholder="Search players..." 
            className="input input-bordered"
            style={{ 
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="form-control">
          <select 
            className="select select-bordered"
            style={{ 
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="all">All Players</option>
            <option value="drafted">Drafted</option>
            <option value="undrafted">Undrafted</option>
            {teams.map(team => (
              <option key={team.id} value={team.name.toLowerCase()}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="card shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body">
          <h3 className="card-title text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Players List ({filteredPlayers.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr style={{ borderColor: 'var(--border-color)' }}>
                  <th style={{ color: 'var(--text-primary)' }}>Name</th>
                  <th style={{ color: 'var(--text-primary)' }}>Gender</th>
                  <th style={{ color: 'var(--text-primary)' }}>Age</th>
                  <th style={{ color: 'var(--text-primary)' }}>Team</th>
                  <th style={{ color: 'var(--text-primary)' }}>Status</th>
                  <th style={{ color: 'var(--text-primary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => (
                  <tr key={player.id} style={{ borderColor: 'var(--border-color)' }}>
                    <td style={{ color: 'var(--text-primary)' }}>{player.name}</td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      <span className={`badge ${player.gender === 'male' ? 'badge-info' : 'badge-secondary'}`}>
                        {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{player.age || 'N/A'}</td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {player.team || 'Undrafted'}
                    </td>
                    <td>
                      <span className={`badge ${player.drafted ? 'badge-success' : 'badge-warning'}`}>
                        {player.drafted ? 'Drafted' : 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {!player.drafted && (
                          <button
                            className="btn btn-sm btn-outline"
                            style={{
                              borderColor: 'var(--primary-blue)',
                              color: 'var(--primary-blue)'
                            }}
                            onClick={() => {
                              setSelectedPlayer(player);
                              setSelectedTeam('');
                            }}
                            title="Draft Player"
                          >
                            Draft
                          </button>
                        )}
                        {player.drafted && (
                          <button
                            className="btn btn-sm btn-outline btn-warning"
                            onClick={() => handleUndraftPlayer(player.id)}
                            title="Undraft Player"
                          >
                            Undraft
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => handleDeletePlayer(player.id)}
                          title="Delete Player"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Draft Player Modal */}
      {selectedPlayer && (
        <div className="modal modal-open">
          <div className="modal-box" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              Draft Player: {selectedPlayer.name}
            </h3>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Select Team
                </span>
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="select select-bordered"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="modal-action">
              <button
                className="btn"
                style={{
                  backgroundColor: 'var(--primary-green)',
                  color: 'var(--text-primary)',
                  border: 'none'
                }}
                onClick={handleDraftPlayer}
              >
                Draft Player
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedPlayer(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

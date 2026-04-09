import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function DraftTeams() {
  const [teams, setTeams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: ''
  });

  // Fetch teams from Firestore
  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      console.log('🔥 Fetching draft teams from Firestore');
      
      const teamsRef = collection(db, 'draftTeams');
      const q = query(teamsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'
      }));
      
      setTeams(teamsData);
      console.log('✅ Draft teams fetched successfully:', teamsData.length);
    } catch (error) {
      console.error('❌ Error fetching draft teams:', error);
      alert('Error fetching teams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔥 Adding team to Firestore');
      
      const teamData = {
        name: newTeam.name.trim(),
        playerCount: 0,
        draftOrder: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'draftTeams'), teamData);
      
      const newTeamWithId = {
        id: docRef.id,
        ...teamData,
        createdAt: new Date().toLocaleDateString()
      };
      
      setTeams(prev => [newTeamWithId, ...prev]);
      setNewTeam({ name: '' });
      setIsModalOpen(false);
      
      console.log('✅ Team added successfully');
      alert('Team added successfully!');
    } catch (error) {
      console.error('❌ Error adding team:', error);
      alert('Error adding team. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting team:', team.name);
      await deleteDoc(doc(db, 'draftTeams', team.id));
      
      setTeams(prev => prev.filter(t => t.id !== team.id));
      
      console.log('✅ Team deleted successfully');
      alert('Team deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting team:', error);
      alert('Error deleting team. Please try again.');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTeam({ name: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Team Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Draft Teams
          </h3>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Manage teams participating in the draft
          </p>
        </div>
        <button 
          className="btn btn-lg"
          style={{
            backgroundColor: 'var(--primary-green)',
            color: 'var(--text-primary)',
            border: 'none'
          }}
          onClick={() => setIsModalOpen(true)}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Team
        </button>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg" style={{ color: 'var(--primary-blue)' }}></span>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h4 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Teams Yet
          </h4>
          <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
            Create your first team to get started with the draft.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div key={team.id} className="card shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="card-body">
                {/* Team Info */}
                <h4 className="card-title text-center text-xl" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </h4>
                
                <div className="stats stats-vertical shadow mt-4">
                  <div className="stat">
                    <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Players</div>
                    <div className="stat-value text-2xl" style={{ color: 'var(--primary-blue)' }}>
                      {team.playerCount || 0}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Created</div>
                    <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>
                      {team.createdAt}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-sm btn-outline btn-error"
                    onClick={() => handleDeleteTeam(team)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Team Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              Add New Team
            </h3>
            
            {/* Team Name */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Team Name
                </span>
              </label>
              <input 
                type="text" 
                placeholder="Enter team name" 
                className="input input-bordered w-full"
                style={{ 
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Modal Actions */}
            <div className="modal-action">
              <button
                className={`btn ${isLoading ? 'loading' : ''}`}
                style={{
                  backgroundColor: 'var(--primary-green)',
                  color: 'var(--text-primary)',
                  border: 'none'
                }}
                onClick={handleAddTeam}
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Team'}
              </button>
              <button
                className="btn btn-outline"
                onClick={closeModal}
                disabled={isLoading}
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

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function FirebaseDebug() {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        console.log('🔍 FETCHING MATCH DATA FROM FIREBASE...');
        
        // Try to get the specific match by ID
        const matchDoc = await getDoc(doc(db, 'fixtures', 'snSDtucvOaCWMjaz31Zy'));
        
        if (matchDoc.exists()) {
          const data = matchDoc.data();
          setMatchData(data);
          
          console.log('🎯 MATCH FOUND IN FIREBASE:');
          console.log('  Match ID: snSDtucvOaCWMjaz31Zy');
          console.log('  Teams:', data.team1Name, 'vs', data.team2Name);
          console.log('  Status:', data.status);
          console.log('  🏆 SCORES IN FIREBASE:');
          console.log('    team1Score:', data.team1Score);
          console.log('    team2Score:', data.team2Score);
          console.log('    score1:', data.score1);
          console.log('    score2:', data.score2);
          console.log('  Complete match data:', data);
        } else {
          setError('Match not found in Firebase');
          console.log('❌ MATCH snSDtucvOaCWMjaz31Zy NOT FOUND IN FIREBASE');
        }
      } catch (err) {
        console.error('Error fetching match data:', err);
        setError('Error fetching match data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading match data from Firebase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Debug - Match snSDtucvOaCWMjaz31Zy</h1>
        
        {matchData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Match Data from Firebase</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Basic Info</h3>
                <p><strong>Match ID:</strong> snSDtucvOaCWMjaz31Zy</p>
                <p><strong>Team 1:</strong> {matchData.team1Name}</p>
                <p><strong>Team 2:</strong> {matchData.team2Name}</p>
                <p><strong>Status:</strong> {matchData.status}</p>
                <p><strong>Court:</strong> {matchData.court}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Scores</h3>
                <p><strong>team1Score:</strong> {matchData.team1Score || 'undefined'}</p>
                <p><strong>team2Score:</strong> {matchData.team2Score || 'undefined'}</p>
                <p><strong>score1:</strong> {matchData.score1 || 'undefined'}</p>
                <p><strong>score2:</strong> {matchData.score2 || 'undefined'}</p>
                {matchData.scores && (
                  <div>
                    <p><strong>scores.player1.total:</strong> {matchData.scores?.player1?.total || 'undefined'}</p>
                    <p><strong>scores.player2.total:</strong> {matchData.scores?.player2?.total || 'undefined'}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Complete Firebase Document</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(matchData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
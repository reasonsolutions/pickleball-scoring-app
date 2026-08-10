import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function UpcomingMatches() {
  const { currentUser, isTeamAdmin } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [tournamentId, setTournamentId] = useState(null);

  useEffect(() => {
    const fetchUpcomingMatches = async () => {
      try {
        // Fetch all teams first
        const teamsRef = collection(db, 'teams');
        const teamsSnapshot = await getDocs(teamsRef);
        const teamsMap = {};
        teamsSnapshot.docs.forEach(doc => {
          teamsMap[doc.id] = doc.data();
        });
        setTeams(teamsMap);

        // Fetch fixtures
        const fixturesRef = collection(db, 'fixtures');
        let fixturesQuery = fixturesRef;
        
        if (isTeamAdmin() && currentUser?.tournamentId) {
          setTournamentId(currentUser.tournamentId);
          fixturesQuery = query(
            fixturesRef,
            where('tournamentId', '==', currentUser.tournamentId),
            orderBy('matchNumber', 'asc')
          );
        } else {
          fixturesQuery = query(fixturesRef, orderBy('matchNumber', 'asc'));
        }
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixturesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get upcoming matches (limit to 5)
        const upcomingMatches = fixturesData.slice(0, 5);
        setMatches(upcomingMatches);
        
        // Set tournament ID from first match if not already set
        if (upcomingMatches.length > 0 && !tournamentId) {
          setTournamentId(upcomingMatches[0].tournamentId);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching upcoming matches:', error);
        setLoading(false);
      }
    };

    fetchUpcomingMatches();
  }, [currentUser, isTeamAdmin]);

  const handleViewDetails = (match) => {
    if (match.tournamentId && match.id) {
      navigate(`/admin/tournaments/${match.tournamentId}/fixtures/${match.id}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Matches</h3>
        <a href="/admin/tournaments" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-2">
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <p className="text-gray-500">No upcoming matches</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, idx) => {
            const team1 = teams[match.team1];
            const team2 = teams[match.team2];
            const team1Name = team1?.name || 'Team 1';
            const team2Name = team2?.name || 'Team 2';

            return (
              <div key={match.id || idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                    Match {match.matchNumber || idx + 1}
                  </span>
                  <span className="text-xs text-gray-500">{match.matchType || 'Regular'}</span>
                </div>

                {/* Teams vs Card */}
                <div className="flex items-center justify-between gap-4">
                  {/* Team 1 */}
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mx-auto mb-2">
                        {team1Name.charAt(0)}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{team1Name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {team1?.players?.length || 0} players
                      </p>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                      VS
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Match</span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold mx-auto mb-2">
                        {team2Name.charAt(0)}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{team2Name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {team2?.players?.length || 0} players
                      </p>
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex gap-4">
                    {match.venue && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {match.venue}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewDetails(match)}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

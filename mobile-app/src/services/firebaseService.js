/**
 * Firebase Service for Mobile App
 * Provides functions to fetch tournament, team, and player data
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../utils/firebase';

/**
 * Fetch all tournaments
 */
export const fetchTournaments = async () => {
  try {
    console.log('🔥 Fetching tournaments from Firebase');
    const tournamentsRef = collection(db, 'tournaments');
    const snapshot = await getDocs(tournamentsRef);
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return tournaments;
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    throw error;
  }
};

/**
 * Fetch teams and players data for a specific tournament
 */
export const fetchTeamsAndPlayers = async (tournamentId) => {
  try {
    console.log('🔥 Fetching teams and players from Firebase for tournament:', tournamentId);
    
    const [teamsSnapshot, playersSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'teams'), where('tournamentId', '==', tournamentId))),
      getDocs(query(collection(db, 'players'), where('tournamentId', '==', tournamentId)))
    ]);

    const data = {
      teams: teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      players: playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };

    return data;
  } catch (error) {
    console.error('Error fetching teams and players:', error);
    throw error;
  }
};

/**
 * Fetch tournament stats (for team rankings and stats)
 */
export const fetchTournamentStats = async (tournamentId) => {
  try {
    console.log('🔥 Fetching tournament stats from Firebase');
    
    // Fetch fixtures to calculate stats
    const fixturesSnapshot = await getDocs(
      query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId))
    );
    
    const fixtures = fixturesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch teams
    const teamsSnapshot = await getDocs(
      query(collection(db, 'teams'), where('tournamentId', '==', tournamentId))
    );
    
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate team stats from fixtures
    const teamStats = {};
    
    teams.forEach(team => {
      teamStats[team.id] = {
        id: team.id,
        name: team.name,
        logo: team.logo,
        description: team.description,
        socialMedia: team.socialMedia,
        playerIds: team.playerIds || [],
        battleWins: 0,
        battleLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        points: 0,
        pointsDifference: 0
      };
    });

    // Process fixtures to calculate stats
    fixtures.forEach(fixture => {
      if (fixture.status === 'completed' && fixture.team1Id && fixture.team2Id) {
        const team1Stats = teamStats[fixture.team1Id];
        const team2Stats = teamStats[fixture.team2Id];
        
        if (team1Stats && team2Stats) {
          // Battle wins/losses
          if (fixture.winner === fixture.team1Id) {
            team1Stats.battleWins++;
            team2Stats.battleLosses++;
          } else if (fixture.winner === fixture.team2Id) {
            team2Stats.battleWins++;
            team1Stats.battleLosses++;
          }

          // Game wins/losses and points
          if (fixture.team1Score && fixture.team2Score) {
            const team1Games = fixture.team1Score.reduce((sum, score) => sum + score, 0);
            const team2Games = fixture.team2Score.reduce((sum, score) => sum + score, 0);
            
            team1Stats.gameWins += team1Games;
            team1Stats.gameLosses += team2Games;
            team1Stats.points += team1Games;
            
            team2Stats.gameWins += team2Games;
            team2Stats.gameLosses += team1Games;
            team2Stats.points += team2Games;
          }
        }
      }
    });

    // Calculate points difference and sort teams
    const sortedTeams = Object.values(teamStats).map(team => ({
      ...team,
      pointsDifference: team.points - team.gameLosses
    })).sort((a, b) => {
      // Sort by battle wins first, then by points difference
      if (b.battleWins !== a.battleWins) {
        return b.battleWins - a.battleWins;
      }
      return b.pointsDifference - a.pointsDifference;
    });

    return {
      teams: sortedTeams,
      fixtures
    };
  } catch (error) {
    console.error('Error fetching tournament stats:', error);
    throw error;
  }
};

/**
 * Fetch specific team details with players
 */
export const fetchTeamDetails = async (tournamentId, teamId) => {
  try {
    console.log('🔥 Fetching team details from Firebase');
    
    const [statsData, playersData] = await Promise.all([
      fetchTournamentStats(tournamentId),
      fetchTeamsAndPlayers(tournamentId)
    ]);

    // Find the specific team and its ranking
    const teamIndex = statsData.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error('Team not found');
    }

    const teamData = {
      ...statsData.teams[teamIndex],
      ranking: teamIndex + 1 // Position in the sorted array + 1
    };

    // Get players for this team
    const teamPlayers = playersData.players.filter(player =>
      teamData.playerIds && teamData.playerIds.includes(player.id)
    );

    return { ...teamData, players: teamPlayers };
  } catch (error) {
    console.error('Error fetching team details:', error);
    throw error;
  }
};
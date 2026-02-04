import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function TeamStandingsTable({ selectedTournament }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Parse date utility
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    try {
      // Handle different date formats
      if (typeof dateString === 'string') {
        // Try parsing as ISO string first, then as other formats
        let dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) {
          // Try parsing as DD/MM/YYYY or MM/DD/YYYY
          const parts = dateString.split(/[-/]/);
          if (parts.length === 3) {
            // Assume DD/MM/YYYY format first
            dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            if (isNaN(dateObj.getTime())) {
              // Try MM/DD/YYYY format
              dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
            }
          }
        }
        return dateObj;
      } else if (dateString.toDate) {
        // Firestore Timestamp
        return dateString.toDate();
      } else {
        return new Date(dateString);
      }
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return new Date();
    }
  };

  // Fetch teams and calculate standings when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchTeamsAndCalculateStandings = async () => {
      setLoading(true);
      try {
        // Fetch teams for the selected tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', selectedTournament)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch matches to calculate team statistics
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', selectedTournament)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Create team lookup for fixture display
        const teamLookup = {};
        teamsData.forEach(team => {
          teamLookup[team.id] = team;
        });

        // Group matches by fixtureGroupId to create fixtures
        const fixtureGroups = {};
        matchesData.forEach(match => {
          const groupId = match.fixtureGroupId || match.id;
          if (!fixtureGroups[groupId]) {
            fixtureGroups[groupId] = {
              id: groupId,
              team1: match.team1,
              team2: match.team2,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              team1Details: teamLookup[match.team1],
              team2Details: teamLookup[match.team2],
              date: match.date,
              time: match.time,
              matches: [],
              status: 'scheduled',
              fixtureType: match.fixtureType,
              playoffStage: match.playoffStage,
              playoffNumber: match.playoffNumber,
              playoffName: match.playoffName
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Convert to array and determine fixture status
        const fixturesArray = Object.values(fixtureGroups).map(fixture => {
          // Helper function to determine if fixture is effectively completed
          const isFixtureEffectivelyCompleted = (matches) => {
            // Separate regular matches from gamebreaker
            const regularMatches = matches.filter(m =>
              m.matchType !== 'dreamBreaker' &&
              m.matchTypeLabel !== 'Dream Breaker' &&
              m.matchTypeLabel !== 'Game Breaker'
            );
            
            // Count completed regular matches
            const completedRegularMatches = regularMatches.filter(m => m.status === 'completed');
            
            if (completedRegularMatches.length < 6) {
              return { isCompleted: false, shouldHideGamebreaker: false, filteredMatches: matches };
            }
            
            // Count wins for each team in regular matches
            let team1Wins = 0;
            let team2Wins = 0;
            
            completedRegularMatches.forEach(match => {
              if (match.scores && match.status === 'completed') {
                const team1Scores = match.scores.player1 || {};
                const team2Scores = match.scores.player2 || {};
                let team1Games = 0;
                let team2Games = 0;
                
                for (let i = 1; i <= (match.gamesCount || 3); i++) {
                  const gameKey = `game${i}`;
                  const team1Score = parseInt(team1Scores[gameKey]) || 0;
                  const team2Score = parseInt(team2Scores[gameKey]) || 0;
                  
                  if (team1Score > team2Score) {
                    team1Games++;
                  } else if (team2Score > team1Score) {
                    team2Games++;
                  }
                }
                
                if (team1Games > team2Games) {
                  team1Wins++;
                } else if (team2Games > team1Games) {
                  team2Wins++;
                }
              }
            });
            
            // If one team has won 4+ out of 6 regular matches, fixture is effectively completed
            const isCompleted = team1Wins >= 4 || team2Wins >= 4;
            const shouldHideGamebreaker = isCompleted;
            
            // Filter out gamebreaker matches if fixture is effectively completed
            const filteredMatches = shouldHideGamebreaker ? regularMatches : matches;
            
            return { isCompleted, shouldHideGamebreaker, filteredMatches };
          };
          
          const { isCompleted, shouldHideGamebreaker, filteredMatches } = isFixtureEffectivelyCompleted(fixture.matches);
          
          // Update fixture matches to exclude gamebreaker if needed
          fixture.matches = filteredMatches;
          
          const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
          const totalMatches = fixture.matches.length;
          
          if (isCompleted || (completedMatches === totalMatches && totalMatches > 0)) {
            fixture.status = 'completed';
          } else if (completedMatches > 0) {
            fixture.status = 'in-progress';
          } else {
            fixture.status = 'scheduled';
          }
          
          return fixture;
        });

        // Calculate team statistics based on fixtures
        const teamStats = teamsData.map(team => {
          // Get all fixtures involving this team, excluding playoff fixtures
          const teamFixtures = Object.values(fixtureGroups).filter(fixture => {
            const isTeamInvolved = fixture.team1 === team.id || fixture.team2 === team.id;
            // Exclude playoff fixtures from rankings calculations
            const playoffTypes = ['playoff', 'Qualifier', 'Qualifier 1', 'Qualifier 2', 'Eliminator', 'Final'];
            const isNotPlayoff = !fixture.fixtureType || !playoffTypes.includes(fixture.fixtureType);
            return isTeamInvolved && isNotPlayoff;
          });

          let battleWins = 0; // Number of fixtures won
          let battleLosses = 0; // Number of fixtures lost
          let points = 0; // 3 points for each fixture win
          let gameWins = 0; // Total games won across all matches (excluding gamebreaker)
          let gameLosses = 0; // Total games lost across all matches (excluding gamebreaker)
          let pointsWon = 0; // Total points won across all matches (excluding gamebreaker)
          let pointsLost = 0; // Total points lost across all matches (excluding gamebreaker)

          teamFixtures.forEach(fixture => {
            // Process fixtures that are completed OR in-progress (for real-time updates)
            if (fixture.status === 'completed' || fixture.status === 'in-progress') {
              const isTeam1 = fixture.team1 === team.id;
              let team1MatchWins = 0;
              let team2MatchWins = 0;
              let team1TotalGames = 0;
              let team2TotalGames = 0;
              let team1TotalPoints = 0;
              let team2TotalPoints = 0;
              let completedMatches = 0;
              let totalMatches = fixture.matches.length;

              // Process each match in the fixture
              fixture.matches.forEach(match => {
                if (match.scores && match.status === 'completed') {
                  completedMatches++;
                  
                  // Skip gamebreaker matches entirely for game wins/losses and points won/lost
                  if (match.matchType !== 'dreamBreaker' && match.matchTypeLabel !== 'Dream Breaker' && match.matchTypeLabel !== 'Game Breaker') {
                    const team1Scores = match.scores.player1 || {};
                    const team2Scores = match.scores.player2 || {};
                    
                    let team1Games = 0;
                    let team2Games = 0;
                    let team1MatchPoints = 0;
                    let team2MatchPoints = 0;

                    // Count games and points for regular matches only
                    const totalGames = match.gamesCount || 3;
                    
                    for (let i = 1; i <= totalGames; i++) {
                      const gameKey = `game${i}`;
                      const team1Score = parseInt(team1Scores[gameKey]) || 0;
                      const team2Score = parseInt(team2Scores[gameKey]) || 0;
                      
                      team1MatchPoints += team1Score;
                      team2MatchPoints += team2Score;
                      
                      if (team1Score > team2Score) {
                        team1Games++;
                      } else if (team2Score > team1Score) {
                        team2Games++;
                      }
                    }

                    // Add to fixture totals (only for non-gamebreaker matches)
                    team1TotalGames += team1Games;
                    team2TotalGames += team2Games;
                    team1TotalPoints += team1MatchPoints;
                    team2TotalPoints += team2MatchPoints;
                  }

                  // Determine match winner for fixture calculation (includes all matches)
                  const team1Scores = match.scores.player1 || {};
                  const team2Scores = match.scores.player2 || {};
                  let team1Games = 0;
                  let team2Games = 0;
                  
                  const totalGames = match.gamesCount || 3;
                  for (let i = 1; i <= totalGames; i++) {
                    const gameKey = `game${i}`;
                    const team1Score = parseInt(team1Scores[gameKey]) || 0;
                    const team2Score = parseInt(team2Scores[gameKey]) || 0;
                    
                    if (team1Score > team2Score) {
                      team1Games++;
                    } else if (team2Score > team1Score) {
                      team2Games++;
                    }
                  }
                  
                  if (team1Games > team2Games) {
                    team1MatchWins++;
                  } else if (team2Games > team1Games) {
                    team2MatchWins++;
                  }
                }
              });

              // Determine fixture winner - can be determined early if one team has already won majority
              const remainingMatches = totalMatches - completedMatches;
              const matchesNeededToWin = Math.ceil(totalMatches / 2);
              
              let team1WonFixture = false;
              let team2WonFixture = false;
              let fixtureDecided = false;

              // Check if fixture is already decided (one team has won enough matches)
              if (team1MatchWins >= matchesNeededToWin) {
                team1WonFixture = true;
                fixtureDecided = true;
              } else if (team2MatchWins >= matchesNeededToWin) {
                team2WonFixture = true;
                fixtureDecided = true;
              } else if (fixture.status === 'completed') {
                // If fixture is completed but no clear winner by majority, use simple comparison
                team1WonFixture = team1MatchWins > team2MatchWins;
                team2WonFixture = team2MatchWins > team1MatchWins;
                fixtureDecided = true;
              }
              
              if (isTeam1) {
                // Add games and points for this team
                gameWins += team1TotalGames;
                gameLosses += team2TotalGames;
                pointsWon += team1TotalPoints;
                pointsLost += team2TotalPoints;
                
                // Award fixture points only if fixture winner is decided
                if (fixtureDecided) {
                  if (team1WonFixture) {
                    battleWins++;
                    points += 3; // 3 points for winning the fixture
                  } else if (team2WonFixture) {
                    battleLosses++;
                    // No points for losing a fixture
                  }
                }
              } else {
                // Add games and points for this team
                gameWins += team2TotalGames;
                gameLosses += team1TotalGames;
                pointsWon += team2TotalPoints;
                pointsLost += team1TotalPoints;
                
                // Award fixture points only if fixture winner is decided
                if (fixtureDecided) {
                  if (team2WonFixture) {
                    battleWins++;
                    points += 3; // 3 points for winning the fixture
                  } else if (team1WonFixture) {
                    battleLosses++;
                    // No points for losing a fixture
                  }
                }
              }
            }
          });

          const gamesDifference = gameWins - gameLosses;
          const pointsDifference = pointsWon - pointsLost;

          return {
            ...team,
            battleWins,
            battleLosses,
            points,
            gameWins,
            gameLosses,
            pointsWon,
            pointsLost,
            gamesDifference,
            pointsDifference
          };
        });

        // Sort teams by points (descending), then by battle wins, then by games difference, then by points difference
        teamStats.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.battleWins !== a.battleWins) return b.battleWins - a.battleWins;
          if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
          return b.pointsDifference - a.pointsDifference;
        });

        setTeams(teamStats);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndCalculateStandings();
  }, [selectedTournament]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading team standings...</Text>
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No teams found for this tournament</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.rankCell]}>Rank</Text>
          <Text style={[styles.headerCell, styles.teamCell]}>Team</Text>
          <Text style={[styles.headerCell, styles.pointsCell]}>Pts</Text>
          <Text style={[styles.headerCell, styles.winsCell]}>W</Text>
          <Text style={[styles.headerCell, styles.lossesCell]}>L</Text>
          <Text style={[styles.headerCell, styles.gameWinsCell]}>GW</Text>
          <Text style={[styles.headerCell, styles.gameLossesCell]}>GL</Text>
          <Text style={[styles.headerCell, styles.diffCell]}>GD</Text>
        </View>

        {/* Table Rows */}
        {teams.map((team, index) => (
          <View key={team.id} style={styles.dataRow}>
            <Text style={[styles.dataCell, styles.rankCell]}>#{index + 1}</Text>
            <View style={[styles.dataCell, styles.teamCell, styles.teamCellContainer]}>
              {team.logo?.url && (
                <Image
                  source={{ uri: team.logo.url }}
                  style={styles.teamLogo}
                />
              )}
              <Text style={styles.teamName} numberOfLines={2}>
                {team.name}
              </Text>
            </View>
            <Text style={[styles.dataCell, styles.pointsCell, styles.boldText]}>
              {team.points}
            </Text>
            <Text style={[styles.dataCell, styles.winsCell]}>
              {team.battleWins}
            </Text>
            <Text style={[styles.dataCell, styles.lossesCell]}>
              {team.battleLosses}
            </Text>
            <Text style={[styles.dataCell, styles.gameWinsCell]}>
              {team.gameWins}
            </Text>
            <Text style={[styles.dataCell, styles.gameLossesCell]}>
              {team.gameLosses}
            </Text>
            <Text style={[
              styles.dataCell, 
              styles.diffCell,
              team.gamesDifference > 0 ? styles.positiveText :
              team.gamesDifference < 0 ? styles.negativeText : styles.neutralText
            ]}>
              {team.gamesDifference > 0 ? '+' : ''}{team.gamesDifference}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  dataCell: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  rankCell: {
    flex: 0.8,
  },
  teamCell: {
    flex: 3,
    textAlign: 'left',
  },
  teamCellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pointsCell: {
    flex: 0.8,
  },
  winsCell: {
    flex: 0.6,
  },
  lossesCell: {
    flex: 0.6,
  },
  gameWinsCell: {
    flex: 0.8,
  },
  gameLossesCell: {
    flex: 0.8,
  },
  diffCell: {
    flex: 0.8,
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  positiveText: {
    color: '#059669',
    fontWeight: '600',
  },
  negativeText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  neutralText: {
    color: '#6b7280',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import TeamStandingsTable from '../components/TeamStandingsTable';

export default function MatchesScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState('league'); // Main tab: league or playoffs
  const [selectedSubTab, setSelectedSubTab] = useState('matches'); // Sub tab: table or matches
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  // Utility function to convert 24-hour time to 12-hour format with AM/PM
  const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return '';
    
    // Handle time in HH:MM format
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

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

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Fetch tournaments from Firebase
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const snapshot = await getDocs(tournamentsRef);
        const tournamentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTournaments(tournamentsList);
        
        // Set first tournament as default if available
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  // Fetch fixtures when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchFixtures = async () => {
      setFixturesLoading(true);
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

        // Fetch matches to create fixtures
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
            // Convert Firestore Timestamp to string if needed
            let dateString = match.date;
            if (match.date && typeof match.date === 'object' && match.date.toDate) {
              // Firestore Timestamp object
              dateString = match.date.toDate().toISOString().split('T')[0]; // YYYY-MM-DD format
            } else if (match.date && typeof match.date === 'object' && match.date.seconds) {
              // Firestore Timestamp object (alternative format)
              dateString = new Date(match.date.seconds * 1000).toISOString().split('T')[0];
            }

            fixtureGroups[groupId] = {
              id: groupId,
              team1: match.team1,
              team2: match.team2,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              team1Details: teamLookup[match.team1],
              team2Details: teamLookup[match.team2],
              date: dateString,
              time: match.time,
              playingTime: match.playingTime,
              fixtureType: match.fixtureType || 'League',
              matches: [],
              status: 'scheduled'
            };
          }
          
          // Also convert date in individual matches
          const processedMatch = { ...match };
          if (match.date && typeof match.date === 'object' && match.date.toDate) {
            processedMatch.date = match.date.toDate().toISOString().split('T')[0];
          } else if (match.date && typeof match.date === 'object' && match.date.seconds) {
            processedMatch.date = new Date(match.date.seconds * 1000).toISOString().split('T')[0];
          }
          
          fixtureGroups[groupId].matches.push(processedMatch);
        });

        // Update fixture playingTime to use the most recent playingTime from any match in the group
        Object.values(fixtureGroups).forEach(fixture => {
          // Find the most recent playingTime that's not the default 18:00
          const playingTimes = fixture.matches.map(m => m.playingTime).filter(pt => pt && pt !== '18:00');
          if (playingTimes.length > 0) {
            // Use the first non-default playingTime found
            fixture.playingTime = playingTimes[0];
          }
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
            const gamebreakerMatches = matches.filter(m =>
              m.matchType === 'dreamBreaker' ||
              m.matchTypeLabel === 'Dream Breaker' ||
              m.matchTypeLabel === 'Game Breaker'
            );
            
            // Count completed regular matches
            const completedRegularMatches = regularMatches.filter(m => m.status === 'completed');
            
            // If less than 6 regular matches are completed, fixture is not complete
            if (completedRegularMatches.length < 6) {
              return false;
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
            
            // If either team has 4+ wins, fixture is complete (no need for gamebreaker)
            if (team1Wins >= 4 || team2Wins >= 4) {
              return true;
            }
            
            // If it's 3-3, check if gamebreaker is completed
            if (team1Wins === 3 && team2Wins === 3) {
              const completedGamebreaker = gamebreakerMatches.find(m => m.status === 'completed');
              return !!completedGamebreaker;
            }
            
            // Otherwise, fixture is not complete
            return false;
          };

          // Determine fixture status based on matches and game breaker rules
          const completedMatches = fixture.matches.filter(m => m.status === 'completed');
          const inProgressMatches = fixture.matches.filter(m => m.status === 'in-progress');
          
          if (isFixtureEffectivelyCompleted(fixture.matches)) {
            fixture.status = 'completed';
          } else if (inProgressMatches.length > 0 || completedMatches.length > 0) {
            fixture.status = 'in-progress';
          } else {
            fixture.status = 'scheduled';
          }
          
          return fixture;
        });

        setFixtures(fixturesArray);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setFixtures([]);
      } finally {
        setFixturesLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedTournament]);

  const renderFixtureCard = (fixture) => {
    const handleFixturePress = () => {
      navigation.navigate('FixtureDetail', { fixture });
    };

    return (
      <TouchableOpacity key={fixture.id} style={styles.fixtureCard} onPress={handleFixturePress}>
        {/* Fixture Type Name - Only show for playoffs */}
        {selectedTab === 'playoffs' && fixture.fixtureType && fixture.fixtureType !== 'League' && (
          <View style={styles.fixtureTypeContainer}>
            <Text style={styles.fixtureTypeText}>{fixture.fixtureType}</Text>
          </View>
        )}
        
        <View style={styles.fixtureHeader}>
          <View style={styles.teamsContainer}>
            {/* Team 1 */}
            <View style={styles.teamContainer}>
              {fixture.team1Details?.logo?.url && (
                <Image
                  source={{ uri: fixture.team1Details.logo.url }}
                  style={styles.teamLogo}
                />
              )}
              <Text style={styles.teamName}>
                {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
              </Text>
            </View>
            
            {/* VS */}
            <Text style={styles.vsText}>VS</Text>
            
            {/* Team 2 */}
            <View style={[styles.teamContainer, styles.team2Container]}>
              <Text style={styles.teamName}>
                {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
              </Text>
              {fixture.team2Details?.logo?.url && (
                <Image
                  source={{ uri: fixture.team2Details.logo.url }}
                  style={styles.teamLogo}
                />
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.fixtureInfo}>
          <View style={styles.fixtureInfoRow}>
            {(fixture.playingTime || fixture.time) && (
              <Text style={styles.timeText}>
                {formatTimeTo12Hour(fixture.playingTime || fixture.time)}
              </Text>
            )}
            
            <Text style={styles.matchCountText}>
              {fixture.matches?.length || 0} match{(fixture.matches?.length || 0) !== 1 ? 'es' : ''}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusContainer, 
              fixture.status === 'completed' ? styles.completedStatus :
              fixture.status === 'in-progress' ? styles.inProgressStatus : styles.scheduledStatus
            ]}>
              <Text style={[styles.statusText,
                fixture.status === 'completed' ? styles.completedStatusText :
                fixture.status === 'in-progress' ? styles.inProgressStatusText : styles.scheduledStatusText
              ]}>
                {fixture.status === 'completed' ? 'Completed' :
                 fixture.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
              </Text>
            </View>
            
            {/* Show overall fixture result if completed */}
            {fixture.status === 'completed' && fixture.matches && (
              <Text style={styles.fixtureScore}>
                {(() => {
                  let team1Wins = 0;
                  let team2Wins = 0;
                  
                  fixture.matches.forEach(match => {
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
                  
                  return `${team1Wins} - ${team2Wins}`;
                })()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getFixturesToShow = () => {
    // For matches sub-tab, show ALL fixture types (no filtering by main tab)
    // This ensures all fixtures are visible regardless of League/Playoffs selection
    const allFixtures = fixtures;

    // Group all fixtures by date
    const fixturesByDate = {};
    allFixtures.forEach(fixture => {
      let dateKey = 'No Date';
      
      if (fixture.date) {
        try {
          const dateObj = parseDate(fixture.date);
          if (!isNaN(dateObj.getTime())) {
            dateKey = dateObj.toDateString();
          }
        } catch (error) {
          console.warn('Error parsing date:', fixture.date, error);
        }
      }
      
      if (!fixturesByDate[dateKey]) {
        fixturesByDate[dateKey] = [];
      }
      fixturesByDate[dateKey].push(fixture);
    });

    return fixturesByDate;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../../assets/banner_back.jpg')}
          style={styles.header}
          resizeMode="cover"
        >
          <Text style={styles.headerTitle}>Matches</Text>
        </ImageBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading fixtures...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Banner Background */}
      <ImageBackground
        source={require('../../assets/banner_back.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <Text style={styles.headerTitle}>Matches</Text>
      </ImageBackground>

      {/* Main Tab Navigation */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[styles.mainTab, selectedTab === 'league' && styles.activeMainTab]}
          onPress={() => setSelectedTab('league')}
        >
          <Text style={[styles.mainTabText, selectedTab === 'league' && styles.activeMainTabText]}>
            League
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, selectedTab === 'playoffs' && styles.activeMainTab]}
          onPress={() => setSelectedTab('playoffs')}
        >
          <Text style={[styles.mainTabText, selectedTab === 'playoffs' && styles.activeMainTabText]}>
            Playoffs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tab Navigation */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, selectedSubTab === 'table' && styles.activeSubTab]}
          onPress={() => setSelectedSubTab('table')}
        >
          <Text style={[styles.subTabText, selectedSubTab === 'table' && styles.activeSubTabText]}>
            Table
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, selectedSubTab === 'matches' && styles.activeSubTab]}
          onPress={() => setSelectedSubTab('matches')}
        >
          <Text style={[styles.subTabText, selectedSubTab === 'matches' && styles.activeSubTabText]}>
            Matches
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on selected sub-tab */}
      {selectedSubTab === 'table' ? (
        // Team Standings Table
        <TeamStandingsTable selectedTournament={selectedTournament} />
      ) : (
        // Matches/Fixtures List
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.fixturesList}>
            {(() => {
              const fixturesByDate = getFixturesToShow();
              
              if (Object.keys(fixturesByDate).length === 0) {
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No fixtures found</Text>
                  </View>
                );
              }
              
              return Object.entries(fixturesByDate).map(([date, dateFixtures]) => (
                <View key={date} style={styles.dateSection}>
                  <Text style={styles.dateHeader}>
                    {date === 'No Date' ? 'Unscheduled' : formatDateForDisplay(date)}
                  </Text>
                  {dateFixtures.map(renderFixtureCard)}
                </View>
              ));
            })()}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    minHeight: 120,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  mainTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeMainTab: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeMainTabText: {
    color: '#7c3aed',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSubTab: {
    backgroundColor: '#7c3aed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeSubTabText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  fixturesList: {
    padding: 20,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  fixtureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  fixtureTypeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  fixtureTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fixtureHeader: {
    marginBottom: 12,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  team2Container: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginHorizontal: 16,
  },
  fixtureInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  fixtureInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  matchCountText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedStatus: {
    backgroundColor: '#dcfce7',
  },
  inProgressStatus: {
    backgroundColor: '#fef3c7',
  },
  scheduledStatus: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedStatusText: {
    color: '#166534',
  },
  inProgressStatusText: {
    color: '#92400e',
  },
  scheduledStatusText: {
    color: '#374151',
  },
  fixtureScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
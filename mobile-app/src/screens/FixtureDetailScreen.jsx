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
import { Ionicons } from '@expo/vector-icons';

export default function FixtureDetailScreen({ route, navigation }) {
  const { fixture } = route.params;
  const [loading, setLoading] = useState(false);

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

  // Function to check if player names should be shown
  const shouldShowPlayerNames = (match, fixture) => {
    // For now, always show player names - you can implement time-based logic later
    return true;
  };

  const renderMatchCard = (match, matchIndex) => {
    return (
      <View key={match.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.matchNumberContainer}>
            <Text style={styles.matchNumber}>Match {matchIndex + 1}</Text>
            {match.matchTypeLabel && (
              <View style={styles.matchTypeContainer}>
                <Text style={styles.matchTypeText}>
                  {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusContainer, 
            match.status === 'completed' ? styles.completedStatus :
            match.status === 'in-progress' ? styles.inProgressStatus : styles.scheduledStatus
          ]}>
            <Text style={[styles.statusText,
              match.status === 'completed' ? styles.completedStatusText :
              match.status === 'in-progress' ? styles.inProgressStatusText : styles.scheduledStatusText
            ]}>
              {match.status === 'completed' ? 'Completed' :
               match.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
            </Text>
          </View>
        </View>

        <View style={styles.matchContent}>
          {/* Team 1 */}
          <View style={styles.teamContainer}>
            <View style={styles.teamHeader}>
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
            <View style={styles.playersContainer}>
              {(() => {
                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                
                if (!showPlayerNames) {
                  return (
                    <Text style={styles.playersHidden}>Players will be revealed at 5:05PM Matchday</Text>
                  );
                }
                
                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                
                if (isSinglesMatch) {
                  return match.player1Team1 ? (
                    <Text style={styles.playerName}>{match.player1Team1}</Text>
                  ) : (
                    <Text style={styles.playersNotAssigned}>Player not assigned</Text>
                  );
                } else {
                  return match.player1Team1 && match.player2Team1 ? (
                    <>
                      <Text style={styles.playerName}>{match.player1Team1}</Text>
                      <Text style={styles.playerName}>{match.player2Team1}</Text>
                    </>
                  ) : (
                    <Text style={styles.playersNotAssigned}>Players not assigned</Text>
                  );
                }
              })()}
            </View>
          </View>

          {/* Score/VS Section */}
          <View style={styles.scoreSection}>
            {match.scores && match.status === 'completed' ? (
              <View style={styles.scoresContainer}>
                {(() => {
                  const team1Scores = match.scores.player1 || {};
                  const team2Scores = match.scores.player2 || {};
                  const gamesCount = match.gamesCount || 3;
                  const games = [];
                  
                  for (let i = 1; i <= gamesCount; i++) {
                    const gameKey = `game${i}`;
                    const team1Score = team1Scores[gameKey] || 0;
                    const team2Score = team2Scores[gameKey] || 0;
                    
                    // Only show games that have been played (non-zero scores)
                    if (team1Score > 0 || team2Score > 0) {
                      games.push(
                        <View key={i} style={styles.gameScore}>
                          <Text style={styles.gameScoreText}>
                            {team1Score} - {team2Score}
                          </Text>
                        </View>
                      );
                    }
                  }
                  
                  return games.length > 0 ? games : (
                    <Text style={styles.vsText}>VS</Text>
                  );
                })()}
              </View>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
          </View>

          {/* Team 2 */}
          <View style={[styles.teamContainer, styles.team2Container]}>
            <View style={[styles.teamHeader, styles.team2Header]}>
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
            <View style={[styles.playersContainer, styles.team2Players]}>
              {(() => {
                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                
                if (!showPlayerNames) {
                  return (
                    <Text style={styles.playersHidden}>Players will be revealed at 5:05PM Matchday</Text>
                  );
                }
                
                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                
                if (isSinglesMatch) {
                  return match.player1Team2 ? (
                    <Text style={styles.playerName}>{match.player1Team2}</Text>
                  ) : (
                    <Text style={styles.playersNotAssigned}>Player not assigned</Text>
                  );
                } else {
                  return match.player1Team2 && match.player2Team2 ? (
                    <>
                      <Text style={styles.playerName}>{match.player1Team2}</Text>
                      <Text style={styles.playerName}>{match.player2Team2}</Text>
                    </>
                  ) : (
                    <Text style={styles.playersNotAssigned}>Players not assigned</Text>
                  );
                }
              })()}
            </View>
          </View>
        </View>

        {/* Show winner for completed matches */}
        {match.scores && match.status === 'completed' && (
          <View style={styles.winnerContainer}>
            {(() => {
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
              
              const winner = team1Games > team2Games
                ? (fixture.team1Details?.name || fixture.team1Name || 'Team 1')
                : team2Games > team1Games
                ? (fixture.team2Details?.name || fixture.team2Name || 'Team 2')
                : null;
              
              return winner ? (
                <Text style={styles.winnerText}>Winner: {winner}</Text>
              ) : (
                <Text style={styles.drawText}>Draw</Text>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Banner Background */}
      <ImageBackground
        source={require('../../assets/banner_back.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Fixture Details</Text>
            <Text style={styles.headerSubtitle}>
              {fixture.team1Details?.name || fixture.team1Name} vs {fixture.team2Details?.name || fixture.team2Name}
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Fixture Info */}
      <View style={styles.fixtureInfo}>
        <View style={styles.fixtureInfoRow}>
          <Text style={styles.fixtureInfoLabel}>Date:</Text>
          <Text style={styles.fixtureInfoValue}>{fixture.date}</Text>
        </View>
        {(fixture.playingTime || fixture.time) && (
          <View style={styles.fixtureInfoRow}>
            <Text style={styles.fixtureInfoLabel}>Time:</Text>
            <Text style={styles.fixtureInfoValue}>
              {formatTimeTo12Hour(fixture.playingTime || fixture.time)}
            </Text>
          </View>
        )}
        {fixture.fixtureType && (
          <View style={styles.fixtureInfoRow}>
            <Text style={styles.fixtureInfoLabel}>Type:</Text>
            <Text style={styles.fixtureInfoValue}>{fixture.fixtureType}</Text>
          </View>
        )}
        <View style={styles.fixtureInfoRow}>
          <Text style={styles.fixtureInfoLabel}>Status:</Text>
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
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.matchesList}>
          <Text style={styles.sectionTitle}>Matches in this Fixture</Text>
          {(() => {
            // Define the correct match order
            const matchOrder = {
              'Men\'s Doubles': 1,
              'Women\'s Doubles': 2,
              'Men\'s Singles': 3,
              'Women\'s Singles': 4,
              'Men\'s Doubles (2)': 5,
              'Mixed Doubles': 6,
              'Game Breaker': 7,
              'Dream Breaker': 7 // Alternative name for Game Breaker
            };
            
            // Sort matches according to the defined order
            const sortedMatches = [...(fixture.matches || [])].sort((a, b) => {
              const aOrder = matchOrder[a.matchTypeLabel] || 999;
              const bOrder = matchOrder[b.matchTypeLabel] || 999;
              return aOrder - bOrder;
            });
            
            return sortedMatches.map((match, matchIndex) => renderMatchCard(match, matchIndex));
          })()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    minHeight: 140,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fixtureInfo: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fixtureInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fixtureInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  fixtureInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  matchesList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  matchTypeContainer: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchTypeText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
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
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamContainer: {
    flex: 1,
  },
  team2Container: {
    alignItems: 'flex-end',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  team2Header: {
    flexDirection: 'row-reverse',
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  playersContainer: {
    marginLeft: 32,
  },
  team2Players: {
    marginLeft: 0,
    marginRight: 32,
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  playersHidden: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  playersNotAssigned: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  scoreSection: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scoresContainer: {
    alignItems: 'center',
  },
  gameScore: {
    marginBottom: 4,
  },
  gameScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  vsText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  winnerContainer: {
    marginTop: 12,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  drawText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchTeamDetails, fetchTournaments } from '../services/firebaseService';

export default function TeamDetailScreen({ route, navigation }) {
  const { tournamentId, teamId, teamName } = route.params;
  const [team, setTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true);
        
        const [teamData, tournamentsData] = await Promise.all([
          fetchTeamDetails(tournamentId, teamId),
          fetchTournaments()
        ]);

        const tournamentData = tournamentsData.find(t => t.id === tournamentId);
        
        setTeam(teamData);
        setTournament(tournamentData);
        setError('');
      } catch (error) {
        console.error('Error fetching team data:', error);
        setError('Failed to load team details');
        Alert.alert('Error', 'Failed to load team details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && teamId) {
      loadTeamData();
    }
  }, [tournamentId, teamId]);

  const handleSocialMediaPress = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Failed to open link');
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Details</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading team details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Details</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Team not found'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Back to Teams</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {team.name}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Team Header Card */}
        <View style={styles.teamHeaderCard}>
          <View style={styles.teamHeaderContent}>
            <View style={styles.teamTitleSection}>
              <Text style={styles.teamName}>{team.name}</Text>
              {tournament && (
                <Text style={styles.tournamentName}>
                  {tournament.name || tournament.tournamentName}
                </Text>
              )}
            </View>
            
            {/* Team Logo */}
            <View style={styles.teamLogoContainer}>
              {team.logo?.url ? (
                <Image
                  source={{ uri: team.logo.url }}
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>
                    {team.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Team Statistics</Text>
          <View style={styles.statsGrid}>
            {/* Team Ranking */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>#{team.ranking || 'N/A'}</Text>
              <Text style={styles.statLabel}>Team Ranking</Text>
            </View>

            {/* Battle Wins */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{team.battleWins || 0}</Text>
              <Text style={styles.statLabel}>Battle Wins</Text>
              <Text style={styles.statSubLabel}>
                Losses: {team.battleLosses || 0}
              </Text>
            </View>

            {/* Game Wins */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{team.gameWins || 0}</Text>
              <Text style={styles.statLabel}>Game Wins</Text>
              <Text style={styles.statSubLabel}>
                Losses: {team.gameLosses || 0}
              </Text>
            </View>

            {/* Points Difference */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {team.pointsDifference > 0 ? '+' : ''}{team.pointsDifference || 0}
              </Text>
              <Text style={styles.statLabel}>Points Difference</Text>
              <Text style={styles.statSubLabel}>
                Total: {team.points || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Players Section */}
        <View style={styles.playersCard}>
          <Text style={styles.sectionTitle}>Team Players</Text>
          
          {team.players && team.players.length > 0 ? (
            <View style={styles.playersList}>
              {team.players.map((player, index) => (
                <View key={player.id || index} style={styles.playerItem}>
                  {/* Player Photo */}
                  <View style={styles.playerPhotoContainer}>
                    {player.photo?.url ? (
                      <Image
                        source={{ uri: player.photo.url }}
                        style={styles.playerPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.playerPhotoPlaceholder}>
                        <Ionicons name="person" size={20} color="#6b7280" />
                      </View>
                    )}
                  </View>

                  {/* Player Info */}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    
                    {/* DUPR Ratings */}
                    <View style={styles.ratingsContainer}>
                      <View style={styles.ratingItem}>
                        <Text style={styles.ratingValue}>
                          {player.doublesRating || '0.00'}
                        </Text>
                        <Text style={styles.ratingLabel}>Doubles DUPR</Text>
                      </View>
                      {player.singlesRating && (
                        <View style={styles.ratingItem}>
                          <Text style={styles.ratingValueSecondary}>
                            {player.singlesRating}
                          </Text>
                          <Text style={styles.ratingLabel}>Singles DUPR</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPlayersContainer}>
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyPlayersText}>No players found for this team</Text>
            </View>
          )}
        </View>

        {/* About Team Section */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Text style={styles.sectionTitle}>About {team.name.toUpperCase()}</Text>
            
            {/* Social Media Icons */}
            {team.socialMedia && (
              <View style={styles.socialMediaContainer}>
                {team.socialMedia.instagram && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.instagramButton]}
                    onPress={() => handleSocialMediaPress(team.socialMedia.instagram)}
                  >
                    <Ionicons name="logo-instagram" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}
                
                {team.socialMedia.facebook && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.facebookButton]}
                    onPress={() => handleSocialMediaPress(team.socialMedia.facebook)}
                  >
                    <Ionicons name="logo-facebook" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}
                
                {team.socialMedia.youtube && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.youtubeButton]}
                    onPress={() => handleSocialMediaPress(team.socialMedia.youtube)}
                  >
                    <Ionicons name="logo-youtube" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Team Description */}
          <View style={styles.descriptionContainer}>
            {team.description ? (
              <Text style={styles.descriptionText}>{team.description}</Text>
            ) : (
              <Text style={styles.noDescriptionText}>
                Team description not available.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  teamHeaderCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamTitleSection: {
    flex: 1,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 16,
    color: '#6b7280',
  },
  teamLogoContainer: {
    marginLeft: 16,
  },
  teamLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  teamLogoPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statSubLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  playersCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playersList: {
    gap: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  playerPhotoContainer: {
    marginRight: 16,
  },
  playerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  ratingsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  ratingItem: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  ratingValueSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ratingLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  emptyPlayersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPlayersText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  aboutCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aboutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramButton: {
    backgroundColor: '#e1306c',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
  },
  youtubeButton: {
    backgroundColor: '#ff0000',
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  noDescriptionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
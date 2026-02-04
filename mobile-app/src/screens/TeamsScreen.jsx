import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTournaments, fetchTeamsAndPlayers } from '../services/firebaseService';

export default function TeamsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [currentTournament, setCurrentTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch latest tournament and teams on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournaments and get the latest one
        const tournamentsList = await fetchTournaments();
        
        if (tournamentsList.length > 0) {
          // Sort tournaments by creation date or use the first one as latest
          const latestTournament = tournamentsList[0];
          setCurrentTournament(latestTournament);
          setSelectedTournament(latestTournament.id);
          
          // Fetch teams for the latest tournament
          const { teams: teamsData } = await fetchTeamsAndPlayers(latestTournament.id);
          setTeams(teamsData);
        }
        
        setError('');
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load teams');
        Alert.alert('Error', 'Failed to load teams. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTeamPress = (team) => {
    navigation.navigate('TeamDetail', {
      tournamentId: selectedTournament,
      teamId: team.id,
      teamName: team.name
    });
  };

  const renderTeamCard = (team) => (
    <TouchableOpacity 
      key={team.id} 
      style={styles.teamCard}
      onPress={() => handleTeamPress(team)}
    >
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <View style={styles.teamLogoContainer}>
            {team.logo?.url ? (
              <Image
                source={{ uri: team.logo.url }}
                style={styles.teamLogoImage}
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
          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>{team.name}</Text>
            {team.description && (
              <Text style={styles.teamDescription} numberOfLines={2}>
                {team.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && teams.length === 0) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../../assets/banner_back.jpg')}
          style={styles.header}
          resizeMode="cover"
        >
          <Text style={styles.headerTitle}>Teams</Text>
          <Text style={styles.headerSubtitle}>HPL Tournament Teams</Text>
        </ImageBackground>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading teams...</Text>
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
        <Text style={styles.headerTitle}>Teams</Text>
        <Text style={styles.headerSubtitle}>
          {currentTournament
            ? (currentTournament.name || currentTournament.tournamentName || 'HPL Tournament')
            : 'HPL Tournament Teams'
          }
        </Text>
      </ImageBackground>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Teams List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.teamsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>Loading teams...</Text>
            </View>
          ) : filteredTeams.length > 0 ? (
            filteredTeams.map(renderTeamCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Teams Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'No teams match your search criteria.' 
                  : 'No teams have been added to this tournament yet.'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    minHeight: 140,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorText: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  scrollView: {
    flex: 1,
  },
  teamsList: {
    padding: 20,
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogoContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  teamLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  teamDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  viewDetailsContainer: {
    paddingLeft: 12,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
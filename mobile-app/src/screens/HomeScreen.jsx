import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext-simple';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { textStyles, FONTS } from '../utils/fonts';
import FeaturedVideosSlider from '../components/FeaturedVideosSlider';

export default function HomeScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load recent tournaments
      const tournamentsRef = collection(db, 'tournaments');
      const tournamentsQuery = query(tournamentsRef, orderBy('createdAt', 'desc'), limit(5));
      const tournamentsSnapshot = await getDocs(tournamentsQuery);
      
      const tournamentsData = [];
      tournamentsSnapshot.forEach((doc) => {
        tournamentsData.push({ id: doc.id, ...doc.data() });
      });
      setTournaments(tournamentsData);

      // Load featured videos
      try {
        const videosRef = collection(db, 'featuredVideos');
        const videosQuery = query(videosRef, orderBy('createdAt', 'desc'), limit(10));
        const videosSnapshot = await getDocs(videosQuery);
        
        const videosData = [];
        videosSnapshot.forEach((doc) => {
          videosData.push({ id: doc.id, ...doc.data() });
        });
        setFeaturedVideos(videosData);
      } catch (videoError) {
        console.log('No featured videos found, using fallback data');
        // Fallback data for featured videos
        setFeaturedVideos([
          {
            id: 'fallback1',
            title: 'World of Red Bull',
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: 'live',
            player1Name: 'Featured',
            player2Name: 'Content'
          },
          {
            id: 'fallback2',
            title: 'Padel Championship',
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: 'live',
            player1Name: 'Live',
            player2Name: 'Match'
          },
          {
            id: 'fallback3',
            title: 'Tournament Highlights',
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            player1Name: 'Best',
            player2Name: 'Moments'
          }
        ]);
      }

      // Load recent matches (you can implement this based on your data structure)
      // For now, we'll use placeholder data
      setRecentMatches([
        { id: 1, team1: 'Team A', team2: 'Team B', score: '21-19', status: 'completed' },
        { id: 2, team1: 'Team C', team2: 'Team D', score: '15-12', status: 'in_progress' },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleVideoPress = async (video) => {
    try {
      if (video.youtubeUrl) {
        const supported = await Linking.canOpenURL(video.youtubeUrl);
        if (supported) {
          await Linking.openURL(video.youtubeUrl);
        } else {
          Alert.alert('Error', 'Cannot open video URL');
        }
      }
    } catch (error) {
      console.error('Error opening video:', error);
      Alert.alert('Error', 'Failed to open video');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{currentUser?.displayName || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Tournaments')}
            >
              <Text style={styles.quickActionIcon}>🏆</Text>
              <Text style={styles.quickActionText}>Tournaments</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Scoring')}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Scoring</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Admin')}
            >
              <Text style={styles.quickActionIcon}>⚙️</Text>
              <Text style={styles.quickActionText}>Admin</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.quickActionIcon}>👤</Text>
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Videos Slider */}
        <FeaturedVideosSlider
          videos={featuredVideos}
          onVideoPress={handleVideoPress}
        />

        {/* Recent Tournaments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tournaments</Text>
          {tournaments.length > 0 ? (
            tournaments.map((tournament) => (
              <TouchableOpacity key={tournament.id} style={styles.tournamentCard}>
                <View style={styles.tournamentInfo}>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentDate}>
                    {tournament.startDate ? new Date(tournament.startDate.seconds * 1000).toLocaleDateString() : 'Date TBD'}
                  </Text>
                </View>
                <View style={styles.tournamentStatus}>
                  <Text style={[styles.statusText, { color: tournament.status === 'active' ? '#10b981' : '#6b7280' }]}>
                    {tournament.status || 'upcoming'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tournaments found</Text>
            </View>
          )}
        </View>

        {/* Recent Matches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTeams}>{match.team1} vs {match.team2}</Text>
                  <Text style={styles.matchScore}>{match.score}</Text>
                </View>
                <View style={styles.matchStatus}>
                  <Text style={[styles.statusText, { color: match.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
                    {match.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent matches</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1f2937',
    marginBottom: 20,
  },
  welcomeText: {
    ...textStyles.body2,
    color: '#9ca3af',
  },
  userName: {
    ...textStyles.h3,
    color: '#ffffff',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    ...textStyles.button,
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...textStyles.h4,
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    ...textStyles.button,
    color: '#ffffff',
    fontSize: 14,
  },
  tournamentCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    ...textStyles.body1,
    fontFamily: FONTS.FUTURU_BOLD,
    color: '#ffffff',
    marginBottom: 4,
  },
  tournamentDate: {
    ...textStyles.caption,
    color: '#9ca3af',
  },
  tournamentStatus: {
    marginLeft: 12,
  },
  statusText: {
    ...textStyles.overline,
    fontFamily: FONTS.FUTURU_BOLD,
  },
  matchCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  matchTeams: {
    ...textStyles.body1,
    fontFamily: FONTS.FUTURU_BOLD,
    color: '#ffffff',
    marginBottom: 4,
  },
  matchScore: {
    ...textStyles.body2,
    color: '#9ca3af',
  },
  matchStatus: {
    marginLeft: 12,
  },
  emptyState: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    ...textStyles.body1,
    color: '#9ca3af',
  },
});
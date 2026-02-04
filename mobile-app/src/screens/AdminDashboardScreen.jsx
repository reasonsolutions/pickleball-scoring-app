import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext-simple';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AdminDashboardScreen({ navigation }) {
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    totalMatches: 0,
    completedMatches: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSuperAdmin() || isTeamAdmin()) {
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load tournament statistics
      const tournamentsRef = collection(db, 'tournaments');
      let tournamentsQuery;

      if (isSuperAdmin()) {
        tournamentsQuery = query(tournamentsRef);
      } else {
        // Team admin sees only their tournaments
        tournamentsQuery = query(
          tournamentsRef,
          where('createdBy', '==', currentUser.uid)
        );
      }

      const tournamentsSnapshot = await getDocs(tournamentsQuery);
      let totalTournaments = 0;
      let activeTournaments = 0;

      tournamentsSnapshot.forEach((doc) => {
        totalTournaments++;
        const tournament = doc.data();
        if (tournament.status === 'active') {
          activeTournaments++;
        }
      });

      // Load match statistics
      const matchesRef = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesRef);
      let totalMatches = 0;
      let completedMatches = 0;

      matchesSnapshot.forEach((doc) => {
        totalMatches++;
        const match = doc.data();
        if (match.status === 'completed') {
          completedMatches++;
        }
      });

      setStats({
        totalTournaments,
        activeTournaments,
        totalMatches,
        completedMatches,
      });

      // Load recent activity (placeholder data)
      setRecentActivity([
        { id: 1, type: 'tournament_created', message: 'New tournament "Summer Championship" created', time: '2 hours ago' },
        { id: 2, type: 'match_completed', message: 'Match between Team A vs Team B completed', time: '4 hours ago' },
        { id: 3, type: 'team_added', message: 'Team "Thunder Bolts" added to tournament', time: '1 day ago' },
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    {
      title: 'Create Tournament',
      icon: '🏆',
      description: 'Start a new tournament',
      action: () => Alert.alert('Create Tournament', 'Navigate to create tournament screen'),
      adminOnly: true,
    },
    {
      title: 'Manage Teams',
      icon: '👥',
      description: 'Add and manage teams',
      action: () => Alert.alert('Manage Teams', 'Navigate to teams management'),
      adminOnly: false,
    },
    {
      title: 'Schedule Matches',
      icon: '📅',
      description: 'Create match schedules',
      action: () => Alert.alert('Schedule Matches', 'Navigate to match scheduling'),
      adminOnly: false,
    },
    {
      title: 'View Reports',
      icon: '📊',
      description: 'Tournament analytics',
      action: () => Alert.alert('View Reports', 'Navigate to reports'),
      adminOnly: false,
    },
    {
      title: 'User Management',
      icon: '⚙️',
      description: 'Manage admin users',
      action: () => Alert.alert('User Management', 'Navigate to user management'),
      adminOnly: true,
    },
    {
      title: 'Settings',
      icon: '🔧',
      description: 'App configuration',
      action: () => Alert.alert('Settings', 'Navigate to settings'),
      adminOnly: false,
    },
  ];

  if (!isSuperAdmin() && !isTeamAdmin()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🚫</Text>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You don't have admin privileges to access this section.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin() ? 'Super Admin' : 'Team Admin'}
          </Text>
        </View>

        {/* Statistics Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalTournaments}</Text>
              <Text style={styles.statLabel}>Total Tournaments</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.activeTournaments}</Text>
              <Text style={styles.statLabel}>Active Tournaments</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalMatches}</Text>
              <Text style={styles.statLabel}>Total Matches</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completedMatches}</Text>
              <Text style={styles.statLabel}>Completed Matches</Text>
            </View>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.actionsGrid}>
            {adminActions
              .filter(action => !action.adminOnly || isSuperAdmin())
              .map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={action.action}
                >
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
                <View style={styles.activityIndicator} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent activity</Text>
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
    padding: 20,
    backgroundColor: '#1f2937',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 12,
  },
  emptyState: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});
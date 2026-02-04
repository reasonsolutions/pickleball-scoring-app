import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext-simple';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function TournamentsScreen({ navigation }) {
  const { currentUser, isSuperAdmin } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTournaments, setFilteredTournaments] = useState([]);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    // Filter tournaments based on search query
    if (searchQuery.trim() === '') {
      setFilteredTournaments(tournaments);
    } else {
      const filtered = tournaments.filter(tournament =>
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTournaments(filtered);
    }
  }, [searchQuery, tournaments]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const tournamentsRef = collection(db, 'tournaments');
      let tournamentsQuery;

      if (isSuperAdmin()) {
        // Super admin can see all tournaments
        tournamentsQuery = query(tournamentsRef, orderBy('createdAt', 'desc'));
      } else {
        // Regular users see tournaments they have access to
        tournamentsQuery = query(
          tournamentsRef,
          where('createdBy', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(tournamentsQuery);
      const tournamentsData = [];
      snapshot.forEach((doc) => {
        tournamentsData.push({ id: doc.id, ...doc.data() });
      });

      setTournaments(tournamentsData);
      setFilteredTournaments(tournamentsData);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date TBD';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'upcoming':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  };

  const handleTournamentPress = (tournament) => {
    // Navigate to tournament details (you can implement this screen later)
    Alert.alert('Tournament Details', `Selected: ${tournament.name}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tournaments</Text>
        {isSuperAdmin() && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => Alert.alert('Create Tournament', 'Navigate to create tournament screen')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tournaments..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTournaments} />
        }
      >
        {filteredTournaments.length > 0 ? (
          filteredTournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              style={styles.tournamentCard}
              onPress={() => handleTournamentPress(tournament)}
            >
              <View style={styles.tournamentHeader}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
                  <Text style={styles.statusText}>{tournament.status || 'upcoming'}</Text>
                </View>
              </View>

              <View style={styles.tournamentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📅 Start Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(tournament.startDate)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📍 Location:</Text>
                  <Text style={styles.detailValue}>{tournament.location || 'TBD'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>👥 Teams:</Text>
                  <Text style={styles.detailValue}>{tournament.teamCount || 0}</Text>
                </View>

                {tournament.description && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📝 Description:</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {tournament.description}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.tournamentActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                
                {(isSuperAdmin() || tournament.createdBy === currentUser.uid) && (
                  <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏆</Text>
            <Text style={styles.emptyStateTitle}>No Tournaments Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No tournaments match your search.' : 'No tournaments available yet.'}
            </Text>
            {isSuperAdmin() && !searchQuery && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => Alert.alert('Create Tournament', 'Navigate to create tournament screen')}
              >
                <Text style={styles.createButtonText}>Create First Tournament</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tournamentCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tournamentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  tournamentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f59e0b',
    marginRight: 0,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
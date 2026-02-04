import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext-simple';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function ScoringScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      // Load matches that are available for scoring
      const matchesRef = collection(db, 'matches');
      const matchesQuery = query(
        matchesRef,
        where('status', 'in', ['scheduled', 'in_progress'])
      );
      
      const snapshot = await getDocs(matchesQuery);
      const matchesData = [];
      snapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });

      setMatches(matchesData);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const openScoreModal = (match) => {
    setSelectedMatch(match);
    setTeam1Score(match.team1Score?.toString() || '');
    setTeam2Score(match.team2Score?.toString() || '');
    setScoreModalVisible(true);
  };

  const updateScore = async () => {
    if (!selectedMatch) return;

    const score1 = parseInt(team1Score) || 0;
    const score2 = parseInt(team2Score) || 0;

    if (score1 < 0 || score2 < 0) {
      Alert.alert('Error', 'Scores cannot be negative');
      return;
    }

    try {
      const matchRef = doc(db, 'matches', selectedMatch.id);
      const updateData = {
        team1Score: score1,
        team2Score: score2,
        status: 'in_progress',
        lastUpdated: new Date(),
        updatedBy: currentUser.uid
      };

      // Check if match is finished (assuming 21 points to win)
      if (score1 >= 21 || score2 >= 21) {
        if (Math.abs(score1 - score2) >= 2) {
          updateData.status = 'completed';
          updateData.winner = score1 > score2 ? 'team1' : 'team2';
          updateData.completedAt = new Date();
        }
      }

      await updateDoc(matchRef, updateData);
      
      setScoreModalVisible(false);
      setSelectedMatch(null);
      loadMatches(); // Reload matches
      
      Alert.alert('Success', 'Score updated successfully');
    } catch (error) {
      console.error('Error updating score:', error);
      Alert.alert('Error', 'Failed to update score');
    }
  };

  const getMatchStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Time TBD';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Match Scoring</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadMatches}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {matches.length > 0 ? (
          matches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCard}
              onPress={() => openScoreModal(match)}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchTitle}>
                  {match.team1Name || 'Team 1'} vs {match.team2Name || 'Team 2'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getMatchStatusColor(match.status) }]}>
                  <Text style={styles.statusText}>{match.status || 'scheduled'}</Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{match.team1Name || 'Team 1'}</Text>
                  <Text style={styles.score}>{match.team1Score || 0}</Text>
                </View>
                
                <Text style={styles.vs}>VS</Text>
                
                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{match.team2Name || 'Team 2'}</Text>
                  <Text style={styles.score}>{match.team2Score || 0}</Text>
                </View>
              </View>

              <View style={styles.matchDetails}>
                <Text style={styles.matchDetail}>🕐 {formatTime(match.scheduledTime)}</Text>
                <Text style={styles.matchDetail}>📍 {match.court || 'Court TBD'}</Text>
              </View>

              <TouchableOpacity style={styles.scoreButton}>
                <Text style={styles.scoreButtonText}>Update Score</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📊</Text>
            <Text style={styles.emptyStateTitle}>No Matches Available</Text>
            <Text style={styles.emptyStateText}>
              No matches are currently available for scoring.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Score Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scoreModalVisible}
        onRequestClose={() => setScoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Score</Text>
            
            {selectedMatch && (
              <Text style={styles.modalSubtitle}>
                {selectedMatch.team1Name || 'Team 1'} vs {selectedMatch.team2Name || 'Team 2'}
              </Text>
            )}

            <View style={styles.scoreInputContainer}>
              <View style={styles.scoreInputGroup}>
                <Text style={styles.scoreInputLabel}>{selectedMatch?.team1Name || 'Team 1'}</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={team1Score}
                  onChangeText={setTeam1Score}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Text style={styles.scoreVs}>VS</Text>

              <View style={styles.scoreInputGroup}>
                <Text style={styles.scoreInputLabel}>{selectedMatch?.team2Name || 'Team 2'}</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={team2Score}
                  onChangeText={setTeam2Score}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setScoreModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={updateScore}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  matchCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchTitle: {
    fontSize: 16,
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
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
  },
  teamScore: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  vs: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: 16,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  matchDetail: {
    fontSize: 14,
    color: '#9ca3af',
  },
  scoreButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  scoreButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreInputGroup: {
    alignItems: 'center',
    flex: 1,
  },
  scoreInputLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  scoreInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  scoreVs: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    marginRight: 8,
  },
  updateButton: {
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
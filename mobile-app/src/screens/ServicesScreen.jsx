import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ServicesScreen({ navigation }) {
  const services = [
    {
      id: 1,
      title: 'Court Booking',
      description: 'Reserve courts for practice and matches',
      icon: '🏓',
      color: '#3b82f6',
    },
    {
      id: 2,
      title: 'Tournament Registration',
      description: 'Sign up for upcoming tournaments',
      icon: '🏆',
      color: '#10b981',
    },
    {
      id: 3,
      title: 'Coaching Services',
      description: 'Book sessions with certified coaches',
      icon: '👨‍🏫',
      color: '#f59e0b',
    },
    {
      id: 4,
      title: 'Equipment Rental',
      description: 'Rent paddles and other equipment',
      icon: '🏸',
      color: '#ef4444',
    },
    {
      id: 5,
      title: 'Live Streaming',
      description: 'Watch matches live online',
      icon: '📺',
      color: '#8b5cf6',
    },
    {
      id: 6,
      title: 'Player Statistics',
      description: 'Track your performance and progress',
      icon: '📊',
      color: '#06b6d4',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Banner Background */}
      <ImageBackground
        source={require('../../assets/banner_back.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <Text style={styles.headerTitle}>Services</Text>
        <Text style={styles.headerSubtitle}>Tickets, Food, etc. at the HPL</Text>
      </ImageBackground>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.servicesGrid}>
          {services.map((service) => (
            <TouchableOpacity key={service.id} style={styles.serviceCard}>
              <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                <Text style={styles.serviceEmoji}>{service.icon}</Text>
              </View>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </TouchableOpacity>
          ))}
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
  scrollView: {
    flex: 1,
  },
  servicesGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
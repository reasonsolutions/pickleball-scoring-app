import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MoreScreen({ navigation }) {
  const menuItems = [
    {
      id: 1,
      title: 'Profile',
      subtitle: 'Manage your account settings',
      icon: '👤',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      id: 2,
      title: 'Tournament History',
      subtitle: 'View your past tournaments',
      icon: '🏆',
      onPress: () => Alert.alert('Coming Soon', 'Tournament history feature coming soon!'),
    },
    {
      id: 3,
      title: 'Statistics',
      subtitle: 'View your performance stats',
      icon: '📊',
      onPress: () => Alert.alert('Coming Soon', 'Statistics feature coming soon!'),
    },
    {
      id: 4,
      title: 'Rankings',
      subtitle: 'Check current player rankings',
      icon: '🏅',
      onPress: () => Alert.alert('Coming Soon', 'Rankings feature coming soon!'),
    },
    {
      id: 5,
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      icon: '🔔',
      onPress: () => Alert.alert('Coming Soon', 'Notifications settings coming soon!'),
    },
    {
      id: 6,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: '❓',
      onPress: () => Alert.alert('Help & Support', 'For support, please contact: support@hpl.com'),
    },
    {
      id: 7,
      title: 'About HPL',
      subtitle: 'Learn more about Hyderabad Pickleball League',
      icon: 'ℹ️',
      onPress: () => Alert.alert('About HPL', 'Hyderabad Pickleball League - Promoting pickleball excellence since 2024'),
    },
    {
      id: 8,
      title: 'Settings',
      subtitle: 'App preferences and settings',
      icon: '⚙️',
      onPress: () => Alert.alert('Coming Soon', 'Settings feature coming soon!'),
    },
  ];

  const quickActions = [
    {
      id: 1,
      title: 'Live Matches',
      icon: '📺',
      color: '#ef4444',
      onPress: () => navigation.navigate('Matches'),
    },
    {
      id: 2,
      title: 'Book Court',
      icon: '🏓',
      color: '#10b981',
      onPress: () => Alert.alert('Coming Soon', 'Court booking feature coming soon!'),
    },
    {
      id: 3,
      title: 'Join Tournament',
      icon: '🏆',
      color: '#3b82f6',
      onPress: () => Alert.alert('Coming Soon', 'Tournament registration coming soon!'),
    },
    {
      id: 4,
      title: 'Find Coach',
      icon: '👨‍🏫',
      color: '#f59e0b',
      onPress: () => Alert.alert('Coming Soon', 'Coach finder feature coming soon!'),
    },
  ];

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionCard, { backgroundColor: action.color }]}
      onPress={action.onPress}
    >
      <Text style={styles.quickActionIcon}>{action.icon}</Text>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );

  const renderMenuItem = (item) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
      <View style={styles.menuItemLeft}>
        <Text style={styles.menuItemIcon}>{item.icon}</Text>
        <View style={styles.menuItemText}>
          <Text style={styles.menuItemTitle}>{item.title}</Text>
          <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSubtitle}>Additional features and settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <View style={styles.menuContainer}>
            {menuItems.map(renderMenuItem)}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>HPL Mobile App</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 Hyderabad Pickleball League</Text>
          </View>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#9ca3af',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
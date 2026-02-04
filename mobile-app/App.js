import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
// import { AuthProvider } from './src/contexts/AuthContext-simple'; // Removed auth dependency

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LatestScreen from './src/screens/LatestScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import MoreScreen from './src/screens/MoreScreen';
import HomeScreen from './src/screens/HomeScreen';
import TournamentsScreen from './src/screens/TournamentsScreen';
import ScoringScreen from './src/screens/ScoringScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import FixtureDetailScreen from './src/screens/FixtureDetailScreen';
import TeamDetailScreen from './src/screens/TeamDetailScreen';

// Import splash screen
import SplashScreen from './src/components/SplashScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Vector icon component
const TabIcon = ({ IconComponent, name, color, size }) => (
  <IconComponent name={name} color={color} size={size || 24} />
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Main Tab Navigator with EPL-style navigation
function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Futuru-Bold',
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Latest"
        component={LatestScreen}
        options={{
          tabBarLabel: 'Latest',
          tabBarIcon: ({ color, size }) => (
            <TabIcon IconComponent={Ionicons} name="newspaper-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, size }) => (
            <TabIcon IconComponent={Ionicons} name="ticket-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <TabIcon IconComponent={Ionicons} name="tennisball-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsScreen}
        options={{
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color, size }) => (
            <TabIcon IconComponent={AntDesign} name="team" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <TabIcon IconComponent={Feather} name="more-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator - Skip login and go directly to main tabs
function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1f2937',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen
        name="FixtureDetail"
        component={FixtureDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeamDetail"
        component={TeamDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Futuru-Light': require('./assets/fonts/Futuru-Light.ttf'),
    'Futuru-Regular': require('./assets/fonts/Futuru-Regular.ttf'),
    'Futuru-Medium': require('./assets/fonts/Futuru-Medium.ttf'),
    'Futuru-Bold': require('./assets/fonts/Futuru-Bold.ttf'),
    'Futuru-Black': require('./assets/fonts/Futuru-Black.ttf'),
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading fonts...</Text>
      </View>
    );
  }

  // Show splash screen first (after fonts are loaded)
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} fontsLoaded={fontsLoaded} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});
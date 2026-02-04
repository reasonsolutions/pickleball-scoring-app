import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onAnimationComplete, fontsLoaded = false }) => {
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('SplashScreen: fontsLoaded =', fontsLoaded);
    
    // Start the expand and contract animation
    const startScaleAnimation = () => {
      Animated.sequence([
        // Expand logo and fade in text
        Animated.parallel([
          Animated.timing(scaleAnimation, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Contract back to normal
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animation complete, call the callback after a brief delay
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 500);
      });
    };

    // Start animation after a brief delay
    const timer = setTimeout(startScaleAnimation, 300);

    return () => clearTimeout(timer);
  }, [scaleAnimation, textOpacity, onAnimationComplete, fontsLoaded]);

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#1e3a8a', '#ea580c']} // Dark blue to burn orange
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <Animated.Image
              source={require('../assets/hpl_logo.png')}
              style={[
                styles.logo,
                {
                  transform: [{ scale: scaleAnimation }],
                },
              ]}
              resizeMode="contain"
            />
          </View>
          
          {/* Text Container */}
          <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.titleText}>HYDERABAD</Text>
            <Text style={styles.subtitleText}>PICKLEBALL LEAGUE</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.6, // 60% of screen width
    height: width * 0.6 * 0.8, // Maintain aspect ratio
    maxWidth: 300,
    maxHeight: 240,
  },
  textContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: Platform.select({
      web: 'Futuru-Light, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: 'Futuru-Light'
    }),
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  titleText: {
    fontFamily: Platform.select({
      web: 'Futuru-Black, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: 'Futuru-Black'
    }),
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitleText: {
    fontFamily: Platform.select({
      web: 'Futuru-Bold, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: 'Futuru-Bold'
    }),
    fontSize: 24,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});

export default SplashScreen;
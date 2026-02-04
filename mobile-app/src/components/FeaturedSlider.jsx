import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { textStyles, FONTS } from '../utils/fonts';

const { width, height } = Dimensions.get('window');
const SLIDER_HEIGHT = height * 0.8; // 80% of screen height

export default function FeaturedSlider({ articles, onArticlePress }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  };

  const scrollToIndex = (index) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * width,
        animated: true,
      });
    }
  };

  const renderSlide = (article, index) => (
    <View key={article.id} style={styles.slide}>
      <ImageBackground
        source={{ uri: article.image }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{article.title}</Text>
              <Text style={styles.description}>{article.subtitle}</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onArticlePress(article)}
              >
                <Text style={styles.actionButtonText}>Read Featured Article</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.paginationContainer}>
      {articles.map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex ? styles.activeDot : styles.inactiveDot,
          ]}
          onPress={() => scrollToIndex(index)}
        />
      ))}
    </View>
  );

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {articles.map((article, index) => renderSlide(article, index))}
      </ScrollView>
      
      {articles.length > 1 && renderPaginationDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SLIDER_HEIGHT,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    height: SLIDER_HEIGHT,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: '90%',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: FONTS.FUTURU_BOLD || 'Futuru-Bold',
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 30,
    textAlign: 'center',
  },
  description: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: FONTS.FUTURU_REGULAR || 'Futuru-Regular',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.9,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: FONTS.FUTURU_BOLD || 'Futuru-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 24,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
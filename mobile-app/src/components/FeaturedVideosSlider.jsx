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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75; // 75% of screen width
const CARD_HEIGHT = 200;
const CARD_SPACING = 16;

export default function FeaturedVideosSlider({ videos, onVideoPress }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(index);
  };

  const scrollToIndex = (index) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * (CARD_WIDTH + CARD_SPACING),
        animated: true,
      });
    }
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const renderVideoCard = (video, index) => {
    const videoId = extractVideoId(video.youtubeUrl);
    const thumbnailUrl = videoId 
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop';

    return (
      <TouchableOpacity
        key={video.id || index}
        style={styles.videoCard}
        onPress={() => onVideoPress && onVideoPress(video)}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: thumbnailUrl }}
          style={styles.videoThumbnail}
          resizeMode="cover"
          imageStyle={styles.thumbnailImage}
        >
          {/* Play Button Overlay */}
          <View style={styles.playButtonContainer}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>

          {/* Live Badge */}
          {video.status === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </ImageBackground>

        {/* Video Title */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {video.title || `${video.player1Name || 'Player 1'} vs ${video.player2Name || 'Player 2'}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!videos || videos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>The HPL Podcast</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No featured videos available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>The HPL Podcast</Text>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {videos.map((video, index) => renderVideoCard(video, index))}
      </ScrollView>

      {/* Pagination Dots */}
      {videos.length > 1 && (
        <View style={styles.paginationContainer}>
          {videos.map((_, index) => (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...textStyles.h3,
    fontFamily: FONTS.FUTURU_BOLD,
    color: '#111827',
    marginBottom: 16,
    marginHorizontal: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  videoCard: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailImage: {
    borderRadius: 12,
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 24,
    marginLeft: 4, // Slight offset to center the triangle
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: FONTS.FUTURU_BOLD,
    fontWeight: 'bold',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FONTS.FUTURU_BOLD,
    fontWeight: '600',
    lineHeight: 18,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
  emptyState: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  emptyStateText: {
    ...textStyles.body1,
    color: '#9ca3af',
  },
});
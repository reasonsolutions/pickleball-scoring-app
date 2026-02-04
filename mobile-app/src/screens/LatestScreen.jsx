import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { textStyles, FONTS } from '../utils/fonts';
import FeaturedSlider from '../components/FeaturedSlider';
import FeaturedVideosSlider from '../components/FeaturedVideosSlider';

const { width } = Dimensions.get('window');

export default function LatestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [latestArticles, setLatestArticles] = useState([]);
  const [featuredVideos, setFeaturedVideos] = useState([]);

  useEffect(() => {
    loadLatestContent();
  }, []);

  const loadLatestContent = async () => {
    setLoading(true);
    try {
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

      // Use the same approach as the web app - get all news articles and filter
      const newsQuery = query(
        collection(db, 'news'),
        orderBy('publishDate', 'desc'),
        limit(8)
      );
      
      const newsSnapshot = await getDocs(newsQuery);
      const allNews = newsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Separate featured and regular news (same as web app)
      const featuredArticles = allNews.filter(article => article.featured).slice(0, 2);
      const regularNews = allNews.filter(article => !article.featured).slice(0, 6);

      // Transform featured articles for display using correct field names
      const featuredData = featuredArticles.map(article => {
        // Handle featuredImage field correctly (same as web app)
        let imageUrl;
        
        if (article.featuredImage) {
          // Handle featuredImage object with url property or direct string
          if (typeof article.featuredImage === 'object' && article.featuredImage.url) {
            imageUrl = article.featuredImage.url;
          } else if (typeof article.featuredImage === 'string') {
            imageUrl = article.featuredImage;
          }
        }
        
        // Fallback to other possible image fields
        if (!imageUrl) {
          imageUrl = article.imageUrl || article.image || article.thumbnailUrl;
        }
        
        // If no image URL or invalid URL, use placeholder
        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
          imageUrl = 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=Featured+News';
        }
        
        // Ensure URL is properly formatted
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=Featured+News';
        }
        
        return {
          id: article.id,
          title: article.title || 'Featured News',
          subtitle: article.subtext || article.description?.substring(0, 100) + '...' || 'Read more about this story',
          image: imageUrl,
          category: article.category || 'News',
          readTime: article.readTime || '3 min read',
          publishDate: article.publishDate,
          createdAt: article.createdAt,
          // Pass through original data for detail screen
          featuredImage: article.featuredImage,
          subtext: article.subtext,
          description: article.description,
        };
      });

      // Transform regular news for display using correct field names
      const articlesData = regularNews.map(article => {
        const timeAgo = getTimeAgo(article.publishDate || article.createdAt);
        
        // Handle featuredImage field correctly (same as web app)
        let imageUrl;
        
        if (article.featuredImage) {
          // Handle featuredImage object with url property or direct string
          if (typeof article.featuredImage === 'object' && article.featuredImage.url) {
            imageUrl = article.featuredImage.url;
          } else if (typeof article.featuredImage === 'string') {
            imageUrl = article.featuredImage;
          }
        }
        
        // Fallback to other possible image fields
        if (!imageUrl) {
          imageUrl = article.imageUrl || article.image || article.thumbnailUrl;
        }
        
        // If no image URL or invalid URL, use placeholder
        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
          imageUrl = 'https://via.placeholder.com/120x80/3b82f6/ffffff?text=News';
        }
        
        // Ensure URL is properly formatted
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = 'https://via.placeholder.com/120x80/3b82f6/ffffff?text=News';
        }
        
        return {
          id: article.id,
          title: article.title || 'Latest News',
          subtitle: article.subtext || article.description?.substring(0, 80) + '...' || 'Read more',
          image: imageUrl,
          category: article.category || 'News',
          time: timeAgo,
          publishDate: article.publishDate,
          createdAt: article.createdAt,
          // Pass through original data for detail screen
          featuredImage: article.featuredImage,
          subtext: article.subtext,
          description: article.description,
        };
      });

      setFeaturedNews(featuredData);
      setLatestArticles(articlesData);

      // If no data from Firebase, show fallback message
      if (featuredData.length === 0 && articlesData.length === 0) {
        console.log('No news data found in Firebase, using fallback content');
        // Set minimal fallback data
        setFeaturedNews([{
          id: 'fallback-1',
          title: 'Welcome to HPL',
          subtitle: 'Stay tuned for the latest pickleball news and updates',
          image: 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=HPL+News',
          category: 'Welcome',
          readTime: '1 min read',
        }]);
        
        setLatestArticles([{
          id: 'fallback-2',
          title: 'HPL Mobile App Launched',
          subtitle: 'Experience the new mobile app for all your pickleball needs',
          image: 'https://via.placeholder.com/120x80/7c3aed/ffffff?text=App',
          category: 'App',
          time: 'Just now',
        }]);
      }
    } catch (error) {
      console.error('Error loading content from Firebase:', error);
      // Show fallback content on error
      setFeaturedNews([{
        id: 'error-1',
        title: 'Welcome to HPL',
        subtitle: 'Stay tuned for the latest pickleball news and updates',
        image: 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=HPL+News',
        category: 'Welcome',
        readTime: '1 min read',
      }]);
      
      setLatestArticles([{
        id: 'error-2',
        title: 'HPL Mobile App',
        subtitle: 'Experience the new mobile app for all your pickleball needs',
        image: 'https://via.placeholder.com/120x80/7c3aed/ffffff?text=App',
        category: 'App',
        time: 'Just now',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    try {
      const now = new Date();
      const publishDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diffInMs = now - publishDate;
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInHours / 24);
      
      if (diffInDays > 0) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleDetail', {
      articleId: article.id,
      article: article
    });
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

  const renderLatestArticles = () => (
    <View style={styles.latestSection}>
      <Text style={styles.sectionTitle}>Latest</Text>
      {latestArticles.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.articleCard}
          onPress={() => navigation.navigate('ArticleDetail', {
            articleId: item.id,
            article: item
          })}
        >
          <Image
            source={{ uri: item.image }}
            style={styles.articleImage}
            defaultSource={{ uri: 'https://via.placeholder.com/120x80/3b82f6/ffffff?text=News' }}
            onError={(error) => {
              console.log('Article image load error:', error.nativeEvent.error);
            }}
            resizeMode="cover"
          />
          <View style={styles.articleContent}>
            <View style={styles.articleHeader}>
              <Text style={styles.articleCategory}>{item.category}</Text>
              <Text style={styles.articleTime}>{item.time}</Text>
            </View>
            <Text style={styles.articleTitle}>{item.title}</Text>
            <Text style={styles.articleSubtitle}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStreamingSection = () => (
    <FeaturedVideosSlider
      videos={featuredVideos}
      onVideoPress={handleVideoPress}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header overlaid on top */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/hpl_logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.accountButton}>
          <Ionicons name="person-circle-outline" size={32} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadLatestContent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Slider as part of the scrollable content */}
        {featuredNews.length > 0 && (
          <FeaturedSlider
            articles={featuredNews}
            onArticlePress={handleArticlePress}
          />
        )}
        
        {renderLatestArticles()}
        {renderStreamingSection()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 40, // Reduced padding for status bar
  },
  logoImage: {
    height: 32,
    width: 100,
  },
  accountButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    ...textStyles.h3,
    color: '#111827',
    marginBottom: 16,
  },
  latestSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  articleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  articleCategory: {
    ...textStyles.overline,
    fontSize: 11,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  articleTime: {
    ...textStyles.caption,
    fontSize: 11,
    color: '#6b7280',
  },
  articleTitle: {
    ...textStyles.body1,
    fontFamily: FONTS.FUTURU_BOLD,
    color: '#111827',
    marginBottom: 4,
  },
  articleSubtitle: {
    ...textStyles.caption,
    fontSize: 13,
    color: '#6b7280',
  },
  streamingSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  streamingSectionTitle: {
    ...textStyles.h3,
    color: '#111827',
    marginBottom: 16,
  },
  streamingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streamingCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  streamingImage: {
    width: '100%',
    height: 120,
  },
});
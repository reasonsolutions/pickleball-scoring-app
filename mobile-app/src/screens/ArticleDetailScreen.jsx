import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { FONTS } from '../utils/fonts';

const { width } = Dimensions.get('window');

export default function ArticleDetailScreen({ route, navigation }) {
  const { articleId, article } = route.params;
  const [fullArticle, setFullArticle] = useState(article || null);
  const [loading, setLoading] = useState(!article);

  useEffect(() => {
    if (!article && articleId) {
      loadFullArticle();
    }
  }, [articleId, article]);

  const loadFullArticle = async () => {
    setLoading(true);
    try {
      const articleDoc = await getDoc(doc(db, 'news', articleId));
      if (articleDoc.exists()) {
        const articleData = { id: articleDoc.id, ...articleDoc.data() };
        console.log('Loaded full article data:', articleData);
        setFullArticle(articleData);
      } else {
        console.log('Article document does not exist');
      }
    } catch (error) {
      console.error('Error loading full article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${fullArticle.title}\n\n${fullArticle.subtitle || ''}\n\nRead more in the HPL app!`,
        title: fullArticle.title,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fullArticle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Debug the article data
  console.log('Full article data in render:', fullArticle);
  
  // Handle image URL using the correct field names from web app
  let imageUrl;
  
  if (fullArticle.featuredImage) {
    // Handle featuredImage object with url property or direct string
    if (typeof fullArticle.featuredImage === 'object' && fullArticle.featuredImage.url) {
      imageUrl = fullArticle.featuredImage.url;
    } else if (typeof fullArticle.featuredImage === 'string') {
      imageUrl = fullArticle.featuredImage;
    }
  }
  
  // Fallback to other possible image fields
  if (!imageUrl) {
    imageUrl = fullArticle.imageUrl || fullArticle.image || fullArticle.thumbnailUrl;
  }
  
  // If no image URL or invalid URL, use placeholder
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    imageUrl = 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=News+Article';
  }
  
  // Ensure URL is properly formatted
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=News+Article';
  }
  
  console.log('Final image URL:', imageUrl);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Image */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.featuredImage}
          resizeMode="cover"
          defaultSource={{ uri: 'https://via.placeholder.com/400x200/7c3aed/ffffff?text=News+Article' }}
          onError={(error) => {
            console.log('Article detail image load error:', error.nativeEvent.error);
            console.log('Attempted to load image URL:', imageUrl);
          }}
          onLoad={() => {
            console.log('Article detail image loaded successfully:', imageUrl);
          }}
        />

        {/* Article Content */}
        <View style={styles.contentContainer}>
          {/* Category and Date */}
          <View style={styles.metaContainer}>
            <Text style={styles.category}>{fullArticle.category || 'News'}</Text>
            <Text style={styles.publishDate}>
              {getTimeAgo(fullArticle.publishDate || fullArticle.createdAt)}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {fullArticle.title || 'Article Title'}
          </Text>

          {/* Subtext (using correct field name from web app) */}
          {fullArticle.subtext && (
            <Text style={styles.subtitle}>
              {fullArticle.subtext}
            </Text>
          )}

          {/* Read Time */}
          <Text style={styles.readTime}>
            {fullArticle.readTime || '3 min read'}
          </Text>

          {/* Content (using description field from web app) */}
          <View style={styles.contentSection}>
            <Text style={styles.content}>
              {fullArticle.description ||
               fullArticle.content ||
               fullArticle.body ||
               fullArticle.subtext ||
               'This article content will be available soon. Stay tuned for more updates from HPL!\n\nIn the meantime, you can check out other articles in the Latest section for more pickleball news and updates.'}
            </Text>
          </View>

          {/* Author */}
          {fullArticle.author && (
            <View style={styles.authorSection}>
              <Text style={styles.authorLabel}>By</Text>
              <Text style={styles.authorName}>{fullArticle.author}</Text>
            </View>
          )}

          {/* Tags */}
          {fullArticle.tags && fullArticle.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {fullArticle.tags.map((tag, index) => (
                  <Text key={index} style={styles.tag}>#{tag}</Text>
                ))}
              </View>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
    fontFamily: FONTS.FUTURU_BOLD,
  },
  shareButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
    fontFamily: FONTS.FUTURU_BOLD,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  scrollView: {
    flex: 1,
  },
  featuredImage: {
    width: width,
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textTransform: 'uppercase',
    fontFamily: FONTS.FUTURU_BOLD,
  },
  publishDate: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 12,
    fontFamily: FONTS.FUTURU_BLACK,
  },
  subtitle: {
    fontSize: 18,
    color: '#4b5563',
    lineHeight: 26,
    marginBottom: 16,
    fontStyle: 'italic',
    fontFamily: FONTS.FUTURU_LIGHT,
  },
  readTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  contentSection: {
    marginBottom: 32,
  },
  content: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'justify',
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  authorLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    fontFamily: FONTS.FUTURU_REGULAR,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: FONTS.FUTURU_BOLD,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    fontFamily: FONTS.FUTURU_BOLD,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    fontFamily: FONTS.FUTURU_REGULAR,
  },
});
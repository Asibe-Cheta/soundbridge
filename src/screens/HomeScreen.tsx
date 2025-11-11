import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNavigation } from '@react-navigation/native';
import { apiService, Track, UserProfile, Event } from '../lib/api';
import { dbDebugger } from '../lib/debugDatabase';

const { width } = Dimensions.get('window');

interface HomeFeedData {
  trending: Track[];
  recent: Track[];
  hotCreators: UserProfile[];
  upcomingEvents: Event[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { play, currentTrack, isPlaying } = useAudioPlayer();
  const navigation = useNavigation();
  
  // State management
  const [feedData, setFeedData] = useState<HomeFeedData>({
    trending: [],
    recent: [],
    hotCreators: [],
    upcomingEvents: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadHomeFeed();
  }, []);

  const loadHomeFeed = async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);

      // Run database diagnostic on first load
      if (!isRefresh) {
        console.log('🔍 Running database diagnostic...');
        await dbDebugger.runFullDiagnostic();
      }

      const response = await apiService.getHomeFeed(user?.id, 20);
      
      if (response.success && response.data) {
        setFeedData(response.data);
      } else {
        setError('Failed to load feed');
        console.error('Error loading home feed:', response.error);
      }
    } catch (error) {
      setError('Failed to load feed');
      console.error('Error loading home feed:', error);
    } finally {
      setIsLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeFeed(true);
  };

  const handleTrackPlay = async (track: Track) => {
    try {
      // Convert Track to AudioTrack format
      const audioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator.display_name || track.creator.username,
        duration: track.duration || 0,
        url: track.file_url, // Fixed: use correct field name
        artwork: track.cover_art_url, // Fixed: use correct field name
        genre: track.genre
      };

      await play(audioTrack);
      
      // Increment play count
      await apiService.incrementPlayCount(track.id);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleCreatorPress = (creator: UserProfile) => {
    // @ts-ignore - Navigation typing
    navigation.navigate('CreatorProfile', { userId: creator.id });
  };

  const handleShareYourSoundPress = () => {
    // @ts-ignore - Navigation typing
    navigation.navigate('CreatorSetup');
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Track Card Component
  const TrackCard = ({ track, index }: { track: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackCard}
      onPress={() => handleTrackPlay(track)}
    >
      <View style={styles.trackImageContainer}>
        {track.cover_art_url ? (
          <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
        ) : (
          <View style={[styles.trackImage, styles.placeholderImage]}>
            <Ionicons name="musical-notes" size={24} color="#666" />
          </View>
        )}
        
        {/* Play indicator */}
        {currentTrack?.id === track.id && isPlaying && (
          <View style={styles.playingIndicator}>
            <Ionicons name="volume-high" size={16} color="#DC2626" />
          </View>
        )}
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.creator.display_name || track.creator.username}
        </Text>
        <View style={styles.trackStats}>
          <Ionicons name="play" size={12} color="#666" />
          <Text style={styles.statText}>{formatPlayCount(track.play_count)}</Text>
          <Ionicons name="heart" size={12} color="#666" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{formatPlayCount(track.like_count)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Creator Card Component
  const CreatorCard = ({ creator }: { creator: UserProfile }) => (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => handleCreatorPress(creator)}
    >
      <View style={styles.creatorImageContainer}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.creatorImage} />
        ) : (
          <View style={[styles.creatorImage, styles.placeholderImage]}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        {creator.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
          </View>
        )}
      </View>
      
      <Text style={styles.creatorName} numberOfLines={1}>
        {creator.display_name || creator.username}
      </Text>
      <Text style={styles.creatorFollowers}>
        {formatPlayCount(creator.followers_count)} followers
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && !feedData.trending.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !feedData.trending.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadHomeFeed()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#DC2626"
            colors={['#DC2626']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.username}>
              {user?.email?.split('@')[0] || 'Music Lover'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Share Your Sound CTA */}
        <TouchableOpacity onPress={handleShareYourSoundPress}>
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaCard}
          >
            <View style={styles.ctaContent}>
              <Ionicons name="mic" size={32} color="#FFFFFF" />
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>Share Your Sound</Text>
                <Text style={styles.ctaSubtitle}>Upload your tracks and connect with fans</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trending Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
            {feedData.trending.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {feedData.trending.length > 0 ? (
            <FlatList
              data={feedData.trending.slice(0, 10)}
              renderItem={({ item, index }) => <TrackCard track={item} index={index} />}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="musical-notes-outline" size={32} color="#666" />
              <Text style={styles.emptySectionText}>No trending tracks yet</Text>
              <Text style={styles.emptySectionSubtext}>Upload some music to get started!</Text>
            </View>
          )}
        </View>

        {/* Hot Creators Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ Hot Creators</Text>
            {feedData.hotCreators.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {feedData.hotCreators.length > 0 ? (
            <FlatList
              data={feedData.hotCreators}
              renderItem={({ item }) => <CreatorCard creator={item} />}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="people-outline" size={32} color="#666" />
              <Text style={styles.emptySectionText}>No creators yet</Text>
              <Text style={styles.emptySectionSubtext}>Be the first to create an account!</Text>
            </View>
          )}
        </View>

        {/* Recently Added Section */}
        {feedData.recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🆕 Recently Added</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={feedData.recent.slice(0, 10)}
              renderItem={({ item, index }) => <TrackCard track={item} index={index} />}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Upcoming Events Section */}
        {feedData.upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎪 Upcoming Events</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={feedData.upcomingEvents}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.eventCard}>
                  <View style={styles.eventImageContainer}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.eventImage} />
                    ) : (
                      <View style={[styles.eventImage, styles.placeholderImage]}>
                        <Ionicons name="calendar" size={24} color="#666" />
                      </View>
                    )}
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.eventDate}>
                      {new Date(item.event_date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      {item.venue || item.location}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function capitalize(value?: string | null): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (!items.length || size <= 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function extractEventGenres(event: Event): string[] {
  const tags = new Set<string>();

  const addValue = (value?: string | null) => {
    if (value) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        tags.add(trimmed);
      }
    }
  };

  const addValues = (values?: string[] | null) => {
    if (Array.isArray(values)) {
      values.forEach(addValue);
    }
  };

  addValue(event.genre);
  addValues(event.genres);
  addValues(event.tags);
  addValue(event.category);

  return Array.from(tags);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
  },
  ctaCard: {
    margin: 20,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  ctaText: {
    flex: 1,
    marginLeft: 16,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  horizontalList: {
    paddingLeft: 20,
  },
  trackCard: {
    width: 140,
    marginRight: 16,
  },
  trackImageContainer: {
    position: 'relative',
  },
  trackImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  trackInfo: {
    paddingTop: 8,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  creatorCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  creatorImageContainer: {
    position: 'relative',
  },
  creatorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 2,
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  creatorFollowers: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 2,
  },
  eventCard: {
    width: 160,
    marginRight: 16,
  },
  eventImageContainer: {
    position: 'relative',
  },
  eventImage: {
    width: 160,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  eventInfo: {
    paddingTop: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    color: '#CCCCCC',
  },
  bottomSpacing: {
    height: 100,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySectionSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
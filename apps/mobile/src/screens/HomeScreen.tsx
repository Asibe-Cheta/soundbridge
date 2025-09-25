import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

const { width, height } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  MainTabs: undefined;
  AudioPlayer: undefined;
  CreatorProfile: undefined;
  CreatorSetup: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url: string;
  cover_image_url?: string;
  duration?: number;
  plays_count?: number;
  likes_count?: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count?: number;
  tracks_count?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  cover_image_url?: string;
  organizer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  
  // Content states
  const [featuredCreator, setFeaturedCreator] = useState<Creator | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [hotCreators, setHotCreators] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // UI states
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(false);

  // Navigation functions
  const navigateToTrending = () => {
    // Navigate to trending tracks page
    console.log('Navigate to trending tracks');
  };

  const navigateToRecentMusic = () => {
    // Navigate to recent music page
    console.log('Navigate to recent music');
  };

  const navigateToHotCreators = () => {
    // Navigate to hot creators page
    console.log('Navigate to hot creators');
  };

  const navigateToEvents = () => {
    // Navigate to events page
    console.log('Navigate to events');
  };

  const navigateToCreatorSetup = () => {
    // Navigate to creator profile setup
    console.log('Navigate to creator setup');
    console.log('Available navigation methods:', Object.keys(navigation));
    
    // Try different navigation approaches
    try {
      // Method 1: Direct navigation (should work if HomeScreen has access to stack)
      navigation.navigate('CreatorSetup' as any);
    } catch (error) {
      console.log('Direct navigation failed:', error);
      
      try {
        // Method 2: Parent navigation
        const parentNavigation = navigation.getParent();
        if (parentNavigation) {
          console.log('Parent navigation found, attempting navigate');
          parentNavigation.navigate('CreatorSetup' as any);
        } else {
          console.error('Parent navigation not found');
        }
      } catch (parentError) {
        console.log('Parent navigation failed:', parentError);
        
        try {
          // Method 3: Using CommonActions
          console.log('Trying CommonActions navigation');
          const resetAction = CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'CreatorSetup' },
            ],
          });
          navigation.dispatch(resetAction);
        } catch (commonError) {
          console.log('CommonActions navigation failed:', commonError);
        }
      }
    }
  };
  
  // Loading states
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    loadHomeContent();
  }, []);

  const loadHomeContent = async () => {
    try {
      // Load all content in parallel
      await Promise.all([
        loadFeaturedCreator(),
        loadTrendingTracks(),
        loadRecentTracks(),
        loadHotCreators(),
        loadEvents(),
      ]);
    } catch (error) {
      console.error('Error loading home content:', error);
    }
  };

  const loadFeaturedCreator = async () => {
    try {
      // For now, we'll use the first creator from hot creators
      // In a real app, this would be a specific featured creator
      setLoadingFeatured(false);
    } catch (error) {
      console.error('Error loading featured creator:', error);
      setLoadingFeatured(false);
    }
  };

  const loadTrendingTracks = async () => {
    try {
      const { success, data } = await db.getTrendingTracks(10);
      if (success && data) {
        setTrendingTracks(data);
      }
    } catch (error) {
      console.error('Error loading trending tracks:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadRecentTracks = async () => {
    try {
      const { success, data } = await db.getAudioTracks(10);
      if (success && data) {
        setRecentTracks(data);
      }
    } catch (error) {
      console.error('Error loading recent tracks:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadHotCreators = async () => {
    try {
      // Mock data for now - in real app, this would come from API
      const mockCreators: Creator[] = [
        {
          id: '1',
          username: 'dj_alex',
          display_name: 'DJ Alex',
          bio: 'Electronic music producer',
          avatar_url: undefined,
          followers_count: 1250,
          tracks_count: 45,
        },
        {
          id: '2',
          username: 'sarah_beats',
          display_name: 'Sarah Beats',
          bio: 'Hip-hop artist from NYC',
          avatar_url: undefined,
          followers_count: 890,
          tracks_count: 32,
        },
        {
          id: '3',
          username: 'mike_music',
          display_name: 'Mike Music',
          bio: 'Indie rock musician',
          avatar_url: undefined,
          followers_count: 567,
          tracks_count: 28,
        },
      ];
      setHotCreators(mockCreators);
    } catch (error) {
      console.error('Error loading hot creators:', error);
    } finally {
      setLoadingCreators(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { success, data } = await db.getEvents(5);
      if (success && data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeContent();
    setRefreshing(false);
  };

  const handleTrackPress = (track: AudioTrack) => {
    // TODO: Navigate to audio player
    console.log('Playing track:', track.title);
  };

  const handleCreatorPress = (creator: Creator) => {
    // TODO: Navigate to creator profile
    console.log('Viewing creator:', creator.username);
  };

  const handleEventPress = (event: Event) => {
    // TODO: Navigate to event details
    console.log('Viewing event:', event.title);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Creator Banner */}
      <TouchableOpacity style={styles.creatorBanner} onPress={navigateToCreatorSetup}>
        <LinearGradient
          colors={['#1a1a1a', '#2a1a1a', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.creatorBannerGradient}
        >
          <View style={styles.creatorBannerContent}>
            <View style={styles.creatorBannerLeft}>
              <Ionicons name="star" size={20} color="#DC2626" />
              <Text style={styles.creatorBannerTitle}>Share Your Sound</Text>
            </View>
            <View style={styles.creatorBannerRight}>
              <Text style={styles.creatorBannerSubtitle}>Get support from fans</Text>
              <Ionicons name="chevron-forward" size={16} color="#DC2626" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Featured Creator Hero */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Featured Creator</Text>
            <Text style={styles.heroSubtitle}>
              {loadingFeatured ? 'Loading...' : 'Discover amazing talent'}
            </Text>
            <TouchableOpacity style={styles.heroButton}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.heroButtonText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Trending Tracks - Collapsible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={() => setIsTrendingExpanded(!isTrendingExpanded)}
          >
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <Ionicons 
              name={isTrendingExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#DC2626" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToTrending}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {isTrendingExpanded && (
          <>
            {loadingTrending ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading trending tracks...</Text>
              </View>
            ) : trendingTracks.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {trendingTracks.map((track, index) => (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.trackCard, { marginLeft: index === 0 ? 0 : 12 }]}
                    onPress={() => handleTrackPress(track)}
                  >
                    <View style={styles.trackCover}>
                      {track.cover_image_url ? (
                        <Image source={{ uri: track.cover_image_url }} style={styles.trackImage} />
                      ) : (
                        <View style={styles.defaultTrackImage}>
                          <Ionicons name="musical-notes" size={32} color="#666" />
                        </View>
                      )}
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.creator.display_name}
                    </Text>
                    <Text style={styles.trackDuration}>
                      {formatDuration(track.duration)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No trending tracks yet</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Recent Uploads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={navigateToRecentMusic}
          >
            <Text style={styles.sectionTitle}>Recent Music</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToRecentMusic}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {loadingRecent ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading recent tracks...</Text>
          </View>
        ) : recentTracks.length > 0 ? (
          <View style={styles.tracksList}>
            {recentTracks.slice(0, 5).map((track) => (
              <TouchableOpacity
                key={track.id}
                style={styles.trackRow}
                onPress={() => handleTrackPress(track)}
              >
                <View style={styles.trackRowCover}>
                  {track.cover_image_url ? (
                    <Image source={{ uri: track.cover_image_url }} style={styles.trackRowImage} />
                  ) : (
                    <View style={styles.defaultTrackRowImage}>
                      <Ionicons name="musical-notes" size={20} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.trackRowInfo}>
                  <Text style={styles.trackRowTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackRowArtist} numberOfLines={1}>
                    {track.creator.display_name}
                  </Text>
                </View>
                <View style={styles.trackRowActions}>
                  <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="play" size={16} color="#DC2626" />
                  </TouchableOpacity>
                  <Text style={styles.trackRowDuration}>
                    {formatDuration(track.duration)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No recent uploads</Text>
          </View>
        )}
      </View>

      {/* Hot Creators */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={navigateToHotCreators}
          >
            <Text style={styles.sectionTitle}>Hot Creators</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToHotCreators}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading creators...</Text>
          </View>
        ) : hotCreators.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {hotCreators.map((creator, index) => (
              <TouchableOpacity
                key={creator.id}
                style={[styles.creatorCard, { marginLeft: index === 0 ? 0 : 12 }]}
                onPress={() => handleCreatorPress(creator)}
              >
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorImage} />
                  ) : (
                    <View style={styles.defaultCreatorImage}>
                      <Ionicons name="person" size={24} color="#666" />
                    </View>
                  )}
                </View>
                <Text style={styles.creatorName} numberOfLines={1}>
                  {creator.display_name}
                </Text>
                <Text style={styles.creatorUsername} numberOfLines={1}>
                  @{creator.username}
                </Text>
                <Text style={styles.creatorStats}>
                  {creator.followers_count?.toLocaleString()} followers
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No creators found</Text>
          </View>
        )}
      </View>

      {/* Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={navigateToEvents}
          >
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToEvents}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {loadingEvents ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length > 0 ? (
          <View style={styles.eventsList}>
            {events.slice(0, 3).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event)}
              >
                <View style={styles.eventImageContainer}>
                  {event.cover_image_url ? (
                    <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={styles.defaultEventImage}>
                      <Ionicons name="calendar" size={24} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventDate}>
                    {formatDate(event.event_date)}
                  </Text>
                  {event.location && (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  )}
                  <Text style={styles.eventOrganizer} numberOfLines={1}>
                    by {event.organizer.display_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No upcoming events</Text>
          </View>
        )}
      </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  creatorBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  creatorBannerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  creatorBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creatorBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorBannerSubtitle: {
    fontSize: 13,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
  },
  heroSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  trackCard: {
    width: 140,
    marginRight: 12,
  },
  trackCover: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  trackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  defaultTrackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
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
  trackDuration: {
    fontSize: 11,
    color: '#999999',
  },
  tracksList: {
    paddingHorizontal: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackRowCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackRowImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackRowImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  trackRowInfo: {
    flex: 1,
  },
  trackRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trackRowArtist: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  trackRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowDuration: {
    fontSize: 11,
    color: '#999999',
  },
  creatorCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  creatorImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  defaultCreatorImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  creatorUsername: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 2,
  },
  creatorStats: {
    fontSize: 9,
    color: '#999999',
    textAlign: 'center',
  },
  eventsList: {
    paddingHorizontal: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  eventImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultEventImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  eventOrganizer: {
    fontSize: 11,
    color: '#999999',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  bottomPadding: {
    height: 100,
  },
});
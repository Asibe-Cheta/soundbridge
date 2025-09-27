import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { apiService, Track, UserProfile } from '../lib/api';

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { play, currentTrack, isPlaying } = useAudioPlayer();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    tracks: Track[];
    creators: UserProfile[];
  }>({
    tracks: [],
    creators: []
  });
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [allCreators, setAllCreators] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadDiscoverContent();
  }, []);

  const loadDiscoverContent = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading discover content...');
      
      const [tracksResponse, creatorsResponse] = await Promise.all([
        apiService.getTrendingTracks(20),
        apiService.getHotCreators(15)
      ]);

      if (tracksResponse.success && tracksResponse.data) {
        setAllTracks(tracksResponse.data);
        console.log('✅ Loaded tracks for discover:', tracksResponse.data.length);
      }

      if (creatorsResponse.success && creatorsResponse.data) {
        setAllCreators(creatorsResponse.data);
        console.log('✅ Loaded creators for discover:', creatorsResponse.data.length);
      }
    } catch (error) {
      console.error('Error loading discover content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults({ tracks: [], creators: [] });
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);
      
      const [tracksResponse, creatorsResponse] = await Promise.all([
        apiService.searchTracks(query, 15),
        apiService.searchCreators(query, 10)
      ]);

      setSearchResults({
        tracks: tracksResponse.data || [],
        creators: creatorsResponse.data || []
      });
      
      console.log('🔍 Search results:', {
        tracks: tracksResponse.data?.length || 0,
        creators: creatorsResponse.data?.length || 0
      });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrackPlay = async (track: Track) => {
    try {
      const audioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator.display_name || track.creator.username,
        duration: track.duration || 0,
        url: track.file_url,
        artwork: track.cover_art_url,
        genre: track.genre
      };

      await play(audioTrack);
      await apiService.incrementPlayCount(track.id);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderTrackItem = ({ item: track }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPlay(track)}
    >
      <View style={styles.trackImageContainer}>
        {track.cover_art_url ? (
          <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
        ) : (
          <View style={[styles.trackImage, styles.placeholderImage]}>
            <Ionicons name="musical-notes" size={20} color="#666" />
          </View>
        )}
        
        {currentTrack?.id === track.id && isPlaying && (
          <View style={styles.playingIndicator}>
            <Ionicons name="volume-high" size={12} color="#DC2626" />
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
          <Ionicons name="play" size={10} color="#666" />
          <Text style={styles.statText}>{formatPlayCount(track.play_count)}</Text>
          <Ionicons name="heart" size={10} color="#666" style={{ marginLeft: 6 }} />
          <Text style={styles.statText}>{formatPlayCount(track.like_count)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreatorItem = ({ item: creator }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.creatorItem}>
      <View style={styles.creatorImageContainer}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.creatorImage} />
        ) : (
          <View style={[styles.creatorImage, styles.placeholderImage]}>
            <Ionicons name="person" size={16} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.creatorInfo}>
        <Text style={styles.creatorName} numberOfLines={1}>
          {creator.display_name}
        </Text>
        <Text style={styles.creatorFollowers}>
          {formatPlayCount(creator.followers_count)} followers
        </Text>
      </View>
      
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading discover content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayTracks = searchQuery ? searchResults.tracks : allTracks;
  const displayCreators = searchQuery ? searchResults.creators : allCreators;
  const hasNoResults = searchQuery && searchResults.tracks.length === 0 && searchResults.creators.length === 0;
  const hasNoContent = !searchQuery && allTracks.length === 0 && allCreators.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists, genres..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {hasNoContent ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Content Available</Text>
            <Text style={styles.emptyText}>
              There are no tracks or creators in the database yet.{'\n'}
              Start by uploading some music or creating profiles!
            </Text>
          </View>
        ) : hasNoResults ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Results Found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <>
            {/* Tracks Section */}
            {displayTracks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {searchQuery ? 'Tracks' : 'Trending Tracks'}
                </Text>
                <FlatList
                  data={displayTracks}
                  renderItem={renderTrackItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Creators Section */}
            {displayCreators.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {searchQuery ? 'Creators' : 'Hot Creators'}
                </Text>
                <FlatList
                  data={displayCreators}
                  renderItem={renderCreatorItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  searchingText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  trackImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 2,
  },
  trackInfo: {
    flex: 1,
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
  creatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  creatorImageContainer: {
    marginRight: 12,
  },
  creatorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  creatorFollowers: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  followButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
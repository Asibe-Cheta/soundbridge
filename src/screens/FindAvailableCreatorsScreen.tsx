import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface AvailableCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  genre: string | null;
  location: string | null;
  followers_count: number;
  total_uploads: number;
  is_available_now: boolean;
  next_available_slot?: {
    start_time: string;
    end_time: string;
  };
  collaboration_enabled: boolean;
}

export default function FindAvailableCreatorsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [creators, setCreators] = useState<AvailableCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'available_now' | 'available_soon' | 'all'>('available_now');

  useEffect(() => {
    loadAvailableCreators();
  }, [filter]);

  const loadAvailableCreators = async () => {
    try {
      setLoading(true);
      console.log('­ƒöì Loading available creators...');

      const now = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get creators with collaboration enabled
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('collaboration_enabled', true)
        .neq('id', user?.id) // Exclude current user
        .order('followers_count', { ascending: false })
        .limit(50);

      if (creatorsError) throw creatorsError;

      if (!creatorsData || creatorsData.length === 0) {
        console.log('Ôä╣´©Å No creators with collaboration enabled found');
        setCreators([]);
        setLoading(false);
        return;
      }

      console.log(`Ô£à Found ${creatorsData.length} creators with collaboration enabled`);

      // For each creator, check their availability
      const creatorsWithAvailability = await Promise.all(
        creatorsData.map(async (creator) => {
          try {
            // Get creator's availability slots
            const { data: slots, error: slotsError } = await supabase
              .from('availability_slots')
              .select('*')
              .eq('creator_id', creator.id)
              .eq('is_available', true)
              .gte('end_time', now)
              .order('start_time', { ascending: true });

            if (slotsError) {
              console.error(`Error fetching slots for ${creator.username}:`, slotsError);
            }

            // Check if available right now
            const availableNow = slots?.some(slot => {
              const startTime = new Date(slot.start_time).getTime();
              const endTime = new Date(slot.end_time).getTime();
              const nowTime = Date.now();
              return startTime <= nowTime && endTime >= nowTime;
            }) || false;

            // Get next available slot
            const nextSlot = slots && slots.length > 0 ? slots[0] : undefined;

            return {
              ...creator,
              is_available_now: availableNow,
              next_available_slot: nextSlot ? {
                start_time: nextSlot.start_time,
                end_time: nextSlot.end_time,
              } : undefined,
            };
          } catch (error) {
            console.error(`Error processing creator ${creator.username}:`, error);
            return {
              ...creator,
              is_available_now: false,
              next_available_slot: undefined,
            };
          }
        })
      );

      // Filter based on selection
      let filteredCreators = creatorsWithAvailability;
      
      if (filter === 'available_now') {
        filteredCreators = creatorsWithAvailability.filter(c => c.is_available_now);
      } else if (filter === 'available_soon') {
        filteredCreators = creatorsWithAvailability.filter(c => 
          c.next_available_slot && new Date(c.next_available_slot.start_time) < new Date(nextWeek)
        );
      }

      console.log(`Ô£à Loaded ${filteredCreators.length} ${filter.replace('_', ' ')} creators`);
      setCreators(filteredCreators);
    } catch (error) {
      console.error('Error loading available creators:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAvailableCreators();
  };

  const formatAvailability = (creator: AvailableCreator) => {
    if (creator.is_available_now) {
      return { text: 'Available Now', color: '#10B981', icon: 'checkmark-circle' as const };
    } else if (creator.next_available_slot) {
      const startTime = new Date(creator.next_available_slot.start_time);
      const isToday = startTime.toDateString() === new Date().toDateString();
      const isTomorrow = startTime.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
      
      if (isToday) {
        return { 
          text: `Available today at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 
          color: '#3B82F6', 
          icon: 'time' as const 
        };
      } else if (isTomorrow) {
        return { 
          text: `Available tomorrow at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 
          color: '#8B5CF6', 
          icon: 'calendar' as const 
        };
      } else {
        return { 
          text: `Available ${startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}`, 
          color: '#6B7280', 
          icon: 'calendar-outline' as const 
        };
      }
    } else {
      return { text: 'No availability set', color: '#9CA3AF', icon: 'close-circle' as const };
    }
  };

  const renderCreator = ({ item }: { item: AvailableCreator }) => {
    const availability = formatAvailability(item);

    return (
      <TouchableOpacity
        style={[styles.creatorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate('CreatorProfile' as never, { creatorId: item.id } as never)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '30' }]}>
              <Ionicons name="person" size={32} color={theme.colors.primary} />
            </View>
          )}
          
          {/* Availability Badge */}
          <View style={[styles.availabilityBadge, { backgroundColor: availability.color }]}>
            <Ionicons name={availability.icon} size={12} color="#FFFFFF" />
          </View>
        </View>

        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          <Text style={[styles.displayName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.display_name || item.username}
          </Text>
          <Text style={[styles.username, { color: theme.colors.text }]} numberOfLines={1}>
            @{item.username}
          </Text>
          
          {/* Availability Status */}
          <View style={[styles.availabilityTag, { backgroundColor: availability.color + '20' }]}>
            <Ionicons name={availability.icon} size={14} color={availability.color} />
            <Text style={[styles.availabilityText, { color: availability.color }]}>
              {availability.text}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people" size={14} color={theme.colors.text + '80'} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {item.followers_count}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="musical-notes" size={14} color={theme.colors.text + '80'} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {item.total_uploads} tracks
              </Text>
            </View>
          </View>

          {item.genre && (
            <Text style={[styles.genre, { color: theme.colors.text }]} numberOfLines={1}>
              {item.genre}
            </Text>
          )}
          
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={theme.colors.text + '60'} />
              <Text style={[styles.location, { color: theme.colors.text }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CreatorProfile' as never, { creatorId: item.id } as never)}
        >
          <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    filterTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.text,
      opacity: 0.7,
      textAlign: 'center',
      lineHeight: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: {
      padding: 16,
    },
    creatorCard: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    avatarPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    availabilityBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    creatorInfo: {
      flex: 1,
    },
    displayName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    username: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 8,
    },
    availabilityTag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
      gap: 4,
    },
    availabilityText: {
      fontSize: 12,
      fontWeight: '600',
    },
    stats: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      opacity: 0.8,
    },
    genre: {
      fontSize: 12,
      opacity: 0.6,
      marginBottom: 2,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    location: {
      fontSize: 12,
      opacity: 0.6,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
            <Text style={styles.headerTitle}>Find Available Creators</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 16 }]}>
            Loading available creators...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.headerTitle}>Find Available Creators</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'available_now' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('available_now')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'available_now' && styles.filterTextActive,
              ]}
            >
              Available Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'available_soon' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('available_soon')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'available_soon' && styles.filterTextActive,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              All Creators
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Creators List */}
      {creators.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={theme.colors.text + '40'}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'available_now' 
              ? 'No Creators Available Right Now'
              : filter === 'available_soon'
              ? 'No Creators Available This Week'
              : 'No Creators Found'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'available_now'
              ? 'Check back later or try "This Week" filter to see upcoming availability.'
              : filter === 'available_soon'
              ? 'Try "All Creators" to see everyone with collaboration enabled.'
              : 'No creators have enabled collaboration yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={creators}
          renderItem={renderCreator}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.emptyText, { textAlign: 'left' }]}>
                {filter === 'available_now' 
                  ? `${creators.length} creator${creators.length !== 1 ? 's' : ''} available right now`
                  : filter === 'available_soon'
                  ? `${creators.length} creator${creators.length !== 1 ? 's' : ''} available this week`
                  : `${creators.length} creator${creators.length !== 1 ? 's' : ''} with collaboration enabled`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}


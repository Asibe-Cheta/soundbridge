import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface ArtistEvent {
  event_id: string;
  event_title: string;
  event_date: string;
  location: string;
  min_price: number;
  total_tickets_available: number;
  tickets: Array<{
    id: string;
    ticket_name: string;
    price_gbp: number;
  }>;
  bundles: Array<{
    id: string;
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
}

interface ArtistEventsSectionProps {
  artistId: string;
  artistName: string;
}

export default function ArtistEventsSection({ artistId, artistName }: ArtistEventsSectionProps) {
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchArtistEvents();
  }, [artistId]);

  const fetchArtistEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = session?.access_token
        ? { 'Authorization': `Bearer ${session.access_token}` }
        : {};

      const response = await fetch(
        `https://soundbridge.live/api/artists/${artistId}/events`,
        { headers }
      );

      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching artist events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  const renderEvent = ({ item }: { item: ArtistEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item.event_id)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#1A1A1A', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Bundle Badge */}
        {item.bundles.length > 0 && (
          <View style={styles.bundleBadge}>
            <Ionicons name="gift" size={14} color="#fff" />
            <Text style={styles.bundleText}>Bundle Available</Text>
          </View>
        )}

        {/* Event Content */}
        <View style={styles.cardContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.event_title}
          </Text>

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.detailText}>{formatDate(item.event_date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.detailText}>From ┬ú{item.min_price.toFixed(2)}</Text>
            </View>

            {item.total_tickets_available < 50 && (
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#FFA500" />
                <Text style={[styles.detailText, { color: '#FFA500' }]}>
                  Only {item.total_tickets_available} tickets left!
                </Text>
              </View>
            )}
          </View>

          {/* Bundles Info */}
          {item.bundles.length > 0 && (
            <View style={styles.bundleInfo}>
              <Ionicons name="gift" size={14} color="#DC2626" />
              <Text style={styles.bundleInfoText}>
                Save {item.bundles[0].discount_percent.toFixed(0)}% with bundle
              </Text>
            </View>
          )}

          {/* Get Tickets Button */}
          <TouchableOpacity
            style={styles.getTicketsButton}
            onPress={() => handleEventPress(item.event_id)}
          >
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Get Tickets</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
        <Text style={styles.emptyText}>No upcoming events</Text>
        <Text style={styles.emptySubtext}>
          Check back later for {artistName}'s upcoming shows
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="ticket" size={24} color="#DC2626" />
          <Text style={styles.title}>Upcoming Events</Text>
        </View>
        <Text style={styles.count}>{events.length}</Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.event_id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Embed in parent scroll view
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardGradient: {
    flex: 1,
  },
  bundleBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 10,
  },
  bundleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  cardContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  bundleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  bundleInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  getTicketsButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },
});


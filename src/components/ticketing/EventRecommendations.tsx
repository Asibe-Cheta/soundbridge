import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

interface Recommendation {
  event_id: string;
  event_title: string;
  event_date: string;
  location: string;
  min_price: number;
  recommendation_score: number;
  recommendation_reason: string;
  friends_attending: Array<{
    friend_id: string;
    friend_name: string;
    friend_avatar: string;
  }>;
  friends_count: number;
  bundles: Array<{
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
  has_bundle: boolean;
  event_image_url?: string;
}

export default function EventRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://soundbridge.live/api/events/recommendations?limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  const renderRecommendation = ({ item }: { item: Recommendation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleEventPress(item.event_id)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#1A1A1A', '#0A0A0A']}
        style={styles.cardGradient}
      >
        {/* Event Image */}
        {item.event_image_url && (
          <Image
            source={{ uri: item.event_image_url }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}

        {/* Recommendation Badge */}
        <View style={styles.recommendationBadge}>
          <Ionicons name="sparkles" size={14} color="#FFD700" />
          <Text style={styles.recommendationText} numberOfLines={1}>
            {item.recommendation_reason}
          </Text>
        </View>

        {/* Bundle Badge */}
        {item.has_bundle && (
          <View style={styles.bundleBadge}>
            <Ionicons name="gift" size={14} color="#fff" />
            <Text style={styles.bundleText}>Bundle</Text>
          </View>
        )}

        {/* Content */}
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
          </View>

          {/* Friends Attending */}
          {item.friends_count > 0 && (
            <View style={styles.friendsSection}>
              <View style={styles.friendsAvatars}>
                {item.friends_attending.slice(0, 3).map((friend, index) => (
                  <Image
                    key={friend.friend_id}
                    source={{ uri: friend.friend_avatar || 'https://via.placeholder.com/40' }}
                    style={[styles.friendAvatar, { marginLeft: index > 0 ? -12 : 0 }]}
                  />
                ))}
              </View>
              <Text style={styles.friendsText}>
                {item.friends_count} {item.friends_count === 1 ? 'friend' : 'friends'} attending
              </Text>
            </View>
          )}

          {/* Bundle Info */}
          {item.has_bundle && item.bundles.length > 0 && (
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleInfoText}>
                Save {item.bundles[0].discount_percent.toFixed(0)}% with bundle
              </Text>
            </View>
          )}

          {/* Action Button */}
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
        <Text style={styles.loadingText}>Finding events you'll love...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color="#FFD700" />
          <Text style={styles.title}>Recommended For You</Text>
        </View>
      </View>

      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item) => item.event_id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 180,
  },
  recommendationBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    maxWidth: CARD_WIDTH - 100,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
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
  },
  bundleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardContent: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
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
  friendsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  friendsAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  friendsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  bundleInfo: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
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
    paddingVertical: 14,
    gap: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
});


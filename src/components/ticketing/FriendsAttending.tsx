import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface Friend {
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  profile: {
    display_name: string;
    username: string;
  };
  ticket_info: {
    ticket: {
      ticket_name: string;
      ticket_type: string;
    };
  };
}

interface FriendsAttendingProps {
  eventId: string;
}

export default function FriendsAttending({ eventId }: FriendsAttendingProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchFriendsAttending();
  }, [eventId]);

  const fetchFriendsAttending = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://soundbridge.live/api/events/${eventId}/friends-attending`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setFriends(data.friends_attending);
      }
    } catch (error) {
      console.error('Error fetching friends attending:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTicketBadgeColor = (ticketType: string) => {
    switch (ticketType) {
      case 'vip':
        return '#FFD700';
      case 'early_bird':
        return '#00CED1';
      case 'general_admission':
        return '#DC2626';
      default:
        return '#666';
    }
  };

  const handleFriendPress = (friendId: string) => {
    navigation.navigate('CreatorProfile' as never, { creatorId: friendId } as never);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#DC2626" />
      </View>
    );
  }

  if (friends.length === 0) {
    return null;
  }

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => handleFriendPress(item.friend_id)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.friend_avatar || 'https://via.placeholder.com/60' }}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {item.profile.display_name}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{item.profile.username}
        </Text>
      </View>
      <View
        style={[
          styles.ticketBadge,
          { backgroundColor: getTicketBadgeColor(item.ticket_info.ticket.ticket_type) },
        ]}
      >
        <Text style={styles.ticketBadgeText} numberOfLines={1}>
          {item.ticket_info.ticket.ticket_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={24} color="#DC2626" />
          <Text style={styles.title}>Friends Attending</Text>
        </View>
        <Text style={styles.count}>{friends.length}</Text>
      </View>

      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.friend_id}
        horizontal
        showsHorizontalScrollIndicator={false}
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
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
  friendCard: {
    width: 140,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  friendInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  username: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  ticketBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
  },
  ticketBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TicketDisplay from '../components/ticketing/TicketDisplay';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface TicketPurchase {
  id: string;
  ticket_code: string;
  qr_code_url?: string;
  status: string;
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string;
  };
  ticket: {
    ticket_name: string;
    ticket_type: string;
  };
}

export default function MyTicketsScreen() {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://soundbridge.live/api/tickets/purchase', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setTickets(data.purchases || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets(true);
  };

  const getUpcomingTickets = () => {
    const now = new Date();
    return tickets.filter(ticket => new Date(ticket.event.event_date) >= now);
  };

  const getPastTickets = () => {
    const now = new Date();
    return tickets.filter(ticket => new Date(ticket.event.event_date) < now);
  };

  const displayedTickets = selectedTab === 'upcoming' ? getUpcomingTickets() : getPastTickets();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.headerTitle}>My Tickets</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading your tickets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        <Text style={styles.headerTitle}>My Tickets</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({getUpcomingTickets().length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
            Past ({getPastTickets().length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
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
        {displayedTickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={selectedTab === 'upcoming' ? 'ticket-outline' : 'time-outline'} 
              size={64} 
              color="rgba(255, 255, 255, 0.3)" 
            />
            <Text style={styles.emptyText}>
              {selectedTab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedTab === 'upcoming'
                ? 'Browse events and get tickets to see them here'
                : 'Tickets for past events will appear here'}
            </Text>
            {selectedTab === 'upcoming' && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('AllEvents' as never)}
              >
                <Text style={styles.browseButtonText}>Browse Events</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {displayedTickets.map((ticket) => (
              <View key={ticket.id}>
                <TicketDisplay ticket={ticket} />
                
                {/* View Event Button */}
                <TouchableOpacity
                  style={styles.viewEventButton}
                  onPress={() =>
                    navigation.navigate('EventDetails' as never, { eventId: ticket.event.id } as never)
                  }
                >
                  <Ionicons name="information-circle-outline" size={20} color="#DC2626" />
                  <Text style={styles.viewEventText}>View Event Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Help Section */}
      {tickets.length > 0 && (
        <View style={styles.helpSection}>
          <Ionicons name="help-circle-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.helpText}>
            Your tickets are also sent to your email for safekeeping
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#DC2626',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  viewEventText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
});


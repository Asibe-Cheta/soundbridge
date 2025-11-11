// src/screens/AnalyticsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AnalyticsService, { CreatorAnalytics, CreatorRevenue } from '../services/AnalyticsService';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [revenue, setRevenue] = useState<CreatorRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'tracks'>('overview');

  const periods = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsData, revenueData] = await Promise.all([
        AnalyticsService.getCreatorAnalytics(selectedPeriod),
        AnalyticsService.getCreatorRevenue(),
      ]);
      
      setAnalytics(analyticsData);
      setRevenue(revenueData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="play-circle" size={24} color={theme.colors.primary} />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {analytics.stats.totalPlays.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Total Plays</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="heart" size={24} color="#FF6B6B" />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {analytics.stats.totalLikes.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="people" size={24} color="#4ECDC4" />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {analytics.stats.followers.toLocaleString()}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Followers</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="trending-up" size={24} color="#45B7D1" />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {analytics.stats.engagementRate.toFixed(1)}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Engagement</Text>
            </View>
          </View>
        </View>

        {/* Content Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content Stats</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="musical-notes" size={20} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.stats.tracks}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tracks</Text>
            </View>
            
            <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.stats.events}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Events</Text>
            </View>
            
            <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="share" size={20} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.stats.totalShares}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Shares</Text>
            </View>
          </View>
        </View>

        {/* Recent Tracks Performance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Tracks</Text>
          
          {analytics.recentTracks.map((track) => (
            <View key={track.id} style={[styles.trackItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={[styles.trackDate, { color: theme.colors.textSecondary }]}>
                  {new Date(track.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.trackStats}>
                <View style={styles.trackStat}>
                  <Ionicons name="play-circle" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatValue, { color: theme.colors.textSecondary }]}>
                    {track.play_count.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.trackStat}>
                  <Ionicons name="heart" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatValue, { color: theme.colors.textSecondary }]}>
                    {track.likes_count.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRevenueTab = () => {
    if (!revenue) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Revenue Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue Overview</Text>
          
          <View style={[styles.revenueCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.revenueHeader}>
              <Text style={[styles.revenueTitle, { color: theme.colors.text }]}>Total Earned</Text>
              <Text style={[styles.revenueValue, { color: theme.colors.primary }]}>
                ${revenue.totalEarned.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.revenueBreakdown}>
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.revenueAmount, { color: theme.colors.text }]}>
                  ${revenue.availableBalance.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>This Month</Text>
                <Text style={[styles.revenueAmount, { color: theme.colors.text }]}>
                  ${revenue.thisMonthEarnings.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Total Paid Out</Text>
                <Text style={[styles.revenueAmount, { color: theme.colors.text }]}>
                  ${revenue.totalPaidOut.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Sources */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue Sources</Text>
          
          <View style={styles.revenueSources}>
            <View style={[styles.sourceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="cash" size={24} color="#4ECDC4" />
              <Text style={[styles.sourceValue, { color: theme.colors.text }]}>
                ${revenue.totalTips.toFixed(2)}
              </Text>
              <Text style={[styles.sourceLabel, { color: theme.colors.textSecondary }]}>Tips</Text>
            </View>
            
            <View style={[styles.sourceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="musical-notes" size={24} color="#FF6B6B" />
              <Text style={[styles.sourceValue, { color: theme.colors.text }]}>
                ${revenue.totalTrackSales.toFixed(2)}
              </Text>
              <Text style={[styles.sourceLabel, { color: theme.colors.textSecondary }]}>Track Sales</Text>
            </View>
            
            <View style={[styles.sourceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="card" size={24} color="#45B7D1" />
              <Text style={[styles.sourceValue, { color: theme.colors.text }]}>
                ${revenue.totalSubscriptions.toFixed(2)}
              </Text>
              <Text style={[styles.sourceLabel, { color: theme.colors.textSecondary }]}>Subscriptions</Text>
            </View>
          </View>
        </View>

        {/* Payout Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payout Status</Text>
          
          <View style={[styles.payoutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.payoutHeader}>
              <Ionicons 
                name={revenue.stripeConnected ? "checkmark-circle" : "alert-circle"} 
                size={24} 
                color={revenue.stripeConnected ? "#4ECDC4" : "#FF6B6B"} 
              />
              <Text style={[styles.payoutStatus, { color: theme.colors.text }]}>
                {revenue.stripeConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            
            <Text style={[styles.payoutThreshold, { color: theme.colors.textSecondary }]}>
              Payout threshold: ${revenue.payoutThreshold.toFixed(2)}
            </Text>
            
            {revenue.availableBalance >= revenue.payoutThreshold && (
              <TouchableOpacity style={[styles.payoutButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.payoutButtonText}>Request Payout</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTracksTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Track Performance</Text>
          
          {analytics.recentTracks.map((track) => (
            <View key={track.id} style={[styles.trackPerformanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.trackHeader}>
                <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={[styles.trackDate, { color: theme.colors.textSecondary }]}>
                  {new Date(track.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.trackMetrics}>
                <View style={styles.trackMetric}>
                  <Ionicons name="play-circle" size={20} color={theme.colors.primary} />
                  <Text style={[styles.trackMetricValue, { color: theme.colors.text }]}>
                    {track.play_count.toLocaleString()}
                  </Text>
                  <Text style={[styles.trackMetricLabel, { color: theme.colors.textSecondary }]}>Plays</Text>
                </View>
                
                <View style={styles.trackMetric}>
                  <Ionicons name="heart" size={20} color="#FF6B6B" />
                  <Text style={[styles.trackMetricValue, { color: theme.colors.text }]}>
                    {track.likes_count.toLocaleString()}
                  </Text>
                  <Text style={[styles.trackMetricLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
                </View>
                
                <View style={styles.trackMetric}>
                  <Ionicons name="trending-up" size={20} color="#4ECDC4" />
                  <Text style={[styles.trackMetricValue, { color: theme.colors.text }]}>
                    {track.play_count > 0 ? ((track.likes_count / track.play_count) * 100).toFixed(1) : '0.0'}%
                  </Text>
                  <Text style={[styles.trackMetricLabel, { color: theme.colors.textSecondary }]}>Engagement</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Analytics</Text>
        
        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                selectedPeriod === period.key && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                { color: selectedPeriod === period.key ? '#FFFFFF' : theme.colors.text }
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'overview' ? theme.colors.primary : theme.colors.textSecondary }]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'revenue' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('revenue')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'revenue' ? theme.colors.primary : theme.colors.textSecondary }]}>
            Revenue
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tracks' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('tracks')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tracks' ? theme.colors.primary : theme.colors.textSecondary }]}>
            Tracks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'tracks' && renderTracksTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackDate: {
    fontSize: 12,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  trackStatValue: {
    fontSize: 14,
    marginLeft: 4,
  },
  revenueCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  revenueHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  revenueBreakdown: {
    gap: 12,
  },
  revenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  revenueSources: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sourceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sourceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  payoutCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutStatus: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  payoutThreshold: {
    fontSize: 14,
    marginBottom: 16,
  },
  payoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  trackPerformanceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trackHeader: {
    marginBottom: 12,
  },
  trackMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackMetric: {
    alignItems: 'center',
    flex: 1,
  },
  trackMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  trackMetricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

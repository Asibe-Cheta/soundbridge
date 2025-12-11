'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Globe, Clock, TrendingUp, Users, Heart, Share2, DollarSign, Ticket, MapPin, Activity, Calendar, Zap } from 'lucide-react';

interface AdvancedAnalyticsProps {
  userId: string;
  subscriptionTier: 'free' | 'premium' | 'unlimited';
}

export function AdvancedAnalytics({ userId, subscriptionTier }: AdvancedAnalyticsProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/advanced?period=${period}`);

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json();
          setError(data.error);
          return;
        }
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Show upgrade prompt for Free users
  if (subscriptionTier === 'free') {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '5rem',
          height: '5rem',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <BarChart3 size={32} style={{ color: 'white' }} />
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          margin: '0 0 1rem 0'
        }}>
          Advanced Analytics
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          margin: '0 0 2rem 0',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Upgrade to Premium or Unlimited to unlock detailed analytics including demographics, geographic data, listening behavior, and engagement metrics.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <a
            href="/subscription"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              color: 'white',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Zap size={20} />
            Upgrade to Premium
          </a>
        </div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div style={{
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <Activity size={32} style={{ color: 'var(--text-secondary)', animation: 'pulse 2s ease-in-out infinite' }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const { overview, geographic, listeningBehavior, referrers, demographics, topTracks, engagement } = analytics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Period Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          margin: 0
        }}>
          Advanced Analytics
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['7d', '30d', '90d', '1y', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.5rem 1rem',
                background: period === p ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'var(--bg-secondary)',
                color: period === p ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {p === '7d' && 'Last 7 Days'}
              {p === '30d' && 'Last 30 Days'}
              {p === '90d' && 'Last 90 Days'}
              {p === '1y' && 'Last Year'}
              {p === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem'
      }}>
        {[
          { icon: Activity, label: 'Total Plays', value: overview.totalPlays, color: '#dc2626' },
          { icon: Users, label: 'Unique Listeners', value: overview.uniqueListeners, color: '#8b5cf6' },
          { icon: Clock, label: 'Listening Time', value: `${Math.floor(overview.totalListeningTime / 3600)}h ${Math.floor((overview.totalListeningTime % 3600) / 60)}m`, color: '#3b82f6' },
          { icon: TrendingUp, label: 'Avg Completion', value: `${overview.avgCompletionRate}%`, color: '#10b981' },
          { icon: Globe, label: 'Countries', value: overview.totalCountries, color: '#f97316' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '1rem',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: `${stat.color}20`,
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Geographic Data */}
      {geographic.topCountries && geographic.topCountries.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '1rem',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Globe size={24} style={{ color: '#f97316' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Top Countries
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {geographic.topCountries.slice(0, 5).map((country: any, index: number) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <MapPin size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {country.country_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {country.play_count} plays
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {country.unique_listeners} listeners
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Metrics */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Heart size={24} style={{ color: '#ec4899' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Engagement
          </h3>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { icon: Heart, label: 'Likes', value: engagement.totalLikes, color: '#ec4899' },
            { icon: Share2, label: 'Shares', value: engagement.totalShares, color: '#3b82f6' },
            { icon: Users, label: 'Follows', value: engagement.totalFollows, color: '#8b5cf6' },
            { icon: DollarSign, label: 'Tips', value: engagement.totalTips, color: '#10b981' },
            { icon: Ticket, label: 'Ticket Sales', value: engagement.totalTicketPurchases, color: '#f97316' },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} style={{
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <Icon size={20} style={{ color: metric.color, marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {metric.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {metric.label}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Engagement Rate
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {engagement.engagementRate}%
          </div>
        </div>
      </div>

      {/* Top Tracks by Completion */}
      {topTracks && topTracks.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '1rem',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={24} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Top Tracks by Completion Rate
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topTracks.slice(0, 5).map((track: any, index: number) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem'
              }}>
                {track.coverArt && (
                  <img
                    src={track.coverArt}
                    alt={track.title}
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '0.5rem',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {track.plays} plays
                  </div>
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  {track.avgCompletion}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { ArrowLeft, Wallet, TrendingUp, Heart, Ticket, Calendar, Download, Users, Play, Activity } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { currencyService } from '@/src/lib/currency-service';

type DateRange = '7D' | '30D' | '1Y';
type Tab = 'overview' | 'fans' | 'tracks' | 'growth';

interface RevenueSummary {
  tips: { amount: number; count: number; currency: string; change_percentage: number };
  eventTickets: { amount: number; count: number; currency: string; change_percentage: number };
  serviceBookings: { amount: number; count: number; currency: string; change_percentage: number };
  downloads: { amount: number; count: number; currency: string; change_percentage: number };
  total: { amount: number; currency: string; change_percentage: number };
}

function CreatorInsightsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('1Y');
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState('USD');

  useEffect(() => {
    if (user) {
      // Detect user currency
      const currency = currencyService.getUserCurrency(user as any);
      setUserCurrency(currency);
      loadRevenueSummary(currency);
    }
  }, [user, dateRange]);

  const loadRevenueSummary = async (currency: string) => {
    try {
      setLoading(true);
      setError(null);

      const startDate = getDateRangeStart(dateRange);
      const response = await fetch(
        `/api/creator/revenue/summary?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}&targetCurrency=${currency}`
      );

      if (!response.ok) {
        throw new Error('Failed to load revenue summary');
      }

      const data = await response.json();
      setRevenueSummary(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeStart = (range: DateRange): Date => {
    const now = new Date();
    switch (range) {
      case '7D':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30D':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '1Y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return currencyService.formatCurrency(amount, currency);
  };

  if (loading && !revenueSummary) {
    return (
      <div style={{ minHeight: '100vh', background: theme === 'dark' ? '#1a1a1a' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(220, 38, 38, 0.1)', borderTop: '4px solid #DC2626', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div style={{ color: theme === 'dark' ? 'white' : 'black' }}>Loading...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '100vh', background: theme === 'dark' ? '#1a1a1a' : '#ffffff', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/dashboard" style={{ color: theme === 'dark' ? 'white' : 'black', textDecoration: 'none' }}>
              <ArrowLeft size={24} />
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(45deg, #DC2626, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Creator Insights
            </h1>
          </div>
          <Link href="/wallet" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(45deg, #DC2626, #EC4899)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: '600' }}>
              <Wallet size={20} />
              Wallet
            </button>
          </Link>
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {(['7D', '30D', '1Y'] as DateRange[]).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: '0.5rem 1rem',
                background: dateRange === range ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.1)',
                color: dateRange === range ? 'white' : (theme === 'dark' ? 'white' : 'black'),
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: dateRange === range ? '600' : '400',
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Total Revenue Card */}
        {revenueSummary && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Last {dateRange === '7D' ? '7 Days' : dateRange === '30D' ? '30 Days' : '365 Days'}</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', background: 'linear-gradient(45deg, #DC2626, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatCurrency(revenueSummary.total.amount, userCurrency)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {[
            { id: 'overview' as Tab, label: 'Overview', icon: Activity },
            { id: 'fans' as Tab, label: 'Fans', icon: Users },
            { id: 'tracks' as Tab, label: 'Tracks', icon: Play },
            { id: 'growth' as Tab, label: 'Growth', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                background: activeTab === tab.id ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                color: activeTab === tab.id ? '#DC2626' : (theme === 'dark' ? 'white' : 'black'),
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #DC2626' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && revenueSummary && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Revenue Breakdown
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <RevenueCard
                title="Tips"
                amount={revenueSummary.tips.amount}
                count={revenueSummary.tips.count}
                currency={userCurrency}
                icon={<Heart size={24} />}
                change={revenueSummary.tips.change_percentage}
              />
              <RevenueCard
                title="Event Tickets"
                amount={revenueSummary.eventTickets.amount}
                count={revenueSummary.eventTickets.count}
                currency={userCurrency}
                icon={<Ticket size={24} />}
                change={revenueSummary.eventTickets.change_percentage}
              />
              <RevenueCard
                title="Service Bookings"
                amount={revenueSummary.serviceBookings.amount}
                count={revenueSummary.serviceBookings.count}
                currency={userCurrency}
                icon={<Calendar size={24} />}
                change={revenueSummary.serviceBookings.change_percentage}
              />
              <RevenueCard
                title="Downloads"
                amount={revenueSummary.downloads.amount}
                count={revenueSummary.downloads.count}
                currency={userCurrency}
                icon={<Download size={24} />}
                change={revenueSummary.downloads.change_percentage}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(45deg, #DC2626, #EC4899)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: '600' }}>
                  View Wallet
                </button>
              </Link>
              <Link href="/wallet/transactions" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', color: theme === 'dark' ? 'white' : 'black', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '25px', cursor: 'pointer', fontWeight: '600' }}>
                  Transaction History
                </button>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'fans' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Fan Demographics
            </h2>
            <div style={{ color: '#999' }}>Fan demographics data will be displayed here</div>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Track Performance
            </h2>
            <div style={{ color: '#999' }}>Track performance data will be displayed here</div>
          </div>
        )}

        {activeTab === 'growth' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Monthly Growth
            </h2>
            <div style={{ color: '#999' }}>Growth data will be displayed here</div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px', padding: '1rem', color: '#FCA5A5', marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Revenue Card Component
function RevenueCard({ title, amount, count, currency, icon, change }: {
  title: string;
  amount: number;
  count: number;
  currency: string;
  icon: React.ReactNode;
  change?: number;
}) {
  const { theme } = useTheme();
  const formatCurrency = (amount: number, currency: string) => {
    return currencyService.formatCurrency(amount, currency);
  };

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ color: '#DC2626' }}>{icon}</div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme === 'dark' ? 'white' : 'black' }}>{title}</h3>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? 'white' : 'black', marginBottom: '0.5rem' }}>
        {formatCurrency(amount, currency)}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>
        {count} transactions
      </div>
      {change !== undefined && (
        <div style={{ fontSize: '0.9rem', color: change >= 0 ? '#22C55E' : '#EF4444' }}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export default CreatorInsightsPage;

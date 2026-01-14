'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { ArrowLeft, Wallet, Heart, Ticket, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { currencyService } from '@/src/lib/currency-service';

type DateRange = '7D' | '30D' | '1Y';

interface RevenueSummary {
  tips: { amount: number; count: number; currency: string; change_percentage: number };
  eventTickets: { amount: number; count: number; currency: string; change_percentage: number };
  serviceBookings: { amount: number; count: number; currency: string; change_percentage: number };
  downloads: { amount: number; count: number; currency: string; change_percentage: number };
  total: { amount: number; currency: string; change_percentage: number };
}

function CreatorEarningsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<DateRange>('1Y');
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState('USD');

  useEffect(() => {
    if (user) {
      const currency = currencyService.getUserCurrency(user as any);
      setUserCurrency(currency);
      loadData(currency);
    }
  }, [user, dateRange]);

  const loadData = async (currency: string) => {
    try {
      setLoading(true);
      setError(null);

      const startDate = getDateRangeStart(dateRange);
      const [summaryResponse, trendResponse] = await Promise.all([
        fetch(`/api/creator/revenue/summary?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}&targetCurrency=${currency}`),
        fetch(`/api/creator/revenue/trend?period=${dateRange === '7D' ? 'week' : dateRange === '30D' ? 'month' : 'year'}&targetCurrency=${currency}`),
      ]);

      if (!summaryResponse.ok || !trendResponse.ok) {
        throw new Error('Failed to load data');
      }

      const summaryData = await summaryResponse.json();
      const trendData = await trendResponse.json();

      setRevenueSummary(summaryData.data);
      setRevenueTrend(trendData.data || []);
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
              Earnings Dashboard
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

        {/* Total Earnings Card */}
        {revenueSummary && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Last {dateRange === '7D' ? '7 Days' : dateRange === '30D' ? '30 Days' : '365 Days'}</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', background: 'linear-gradient(45deg, #DC2626, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatCurrency(revenueSummary.total.amount, userCurrency)}
            </div>
          </div>
        )}

        {/* Revenue Breakdown */}
        {revenueSummary && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Revenue Breakdown
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <RevenueBreakdownItem
                icon={<Heart size={20} />}
                title="Tips"
                amount={revenueSummary.tips.amount}
                count={revenueSummary.tips.count}
                currency={userCurrency}
              />
              <RevenueBreakdownItem
                icon={<Ticket size={20} />}
                title="Event Tickets"
                amount={revenueSummary.eventTickets.amount}
                count={revenueSummary.eventTickets.count}
                currency={userCurrency}
              />
              <RevenueBreakdownItem
                icon={<Calendar size={20} />}
                title="Service Bookings"
                amount={revenueSummary.serviceBookings.amount}
                count={revenueSummary.serviceBookings.count}
                currency={userCurrency}
              />
              <RevenueBreakdownItem
                icon={<Download size={20} />}
                title="Downloads"
                amount={revenueSummary.downloads.amount}
                count={revenueSummary.downloads.count}
                currency={userCurrency}
              />
            </div>
          </div>
        )}

        {/* Revenue Trend */}
        {revenueTrend.length > 0 && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: theme === 'dark' ? 'white' : 'black' }}>
              Revenue Trend (Last 7 Days)
            </h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px' }}>
              {revenueTrend.slice(-7).map((item, index) => {
                const maxAmount = Math.max(...revenueTrend.slice(-7).map(i => i.amount));
                const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '100%', background: 'linear-gradient(45deg, #DC2626, #EC4899)', borderRadius: '4px 4px 0 0', height: `${height}%`, minHeight: '4px' }} />
                    <div style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending and Lifetime */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>💰 Pending</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? 'white' : 'black' }}>
              {formatCurrency(0, userCurrency)}
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>📈 Lifetime</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme === 'dark' ? 'white' : 'black' }}>
              {revenueSummary ? formatCurrency(revenueSummary.total.amount, userCurrency) : formatCurrency(0, userCurrency)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px', padding: '1rem', color: '#FCA5A5', marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Revenue Breakdown Item Component
function RevenueBreakdownItem({ icon, title, amount, count, currency }: {
  icon: React.ReactNode;
  title: string;
  amount: number;
  count: number;
  currency: string;
}) {
  const { theme } = useTheme();
  const formatCurrency = (amount: number, currency: string) => {
    return currencyService.formatCurrency(amount, currency);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ color: '#DC2626' }}>{icon}</div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: theme === 'dark' ? 'white' : 'black' }}>{title}</div>
          <div style={{ fontSize: '0.9rem', color: '#999' }}>{count} transactions</div>
        </div>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme === 'dark' ? 'white' : 'black' }}>
        {formatCurrency(amount, currency)}
      </div>
    </div>
  );
}

export default CreatorEarningsPage;

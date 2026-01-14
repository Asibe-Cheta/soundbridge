'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DollarSign, TrendingUp, ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SalesAnalytics {
  total_revenue: number;
  revenue_this_month: number;
  total_sales_count: number;
  sales_by_type: {
    tracks: number;
    albums: number;
    podcasts: number;
  };
  top_selling_content: Array<{
    content_id: string;
    content_type: string;
    title: string;
    sales_count: number;
    revenue: number;
  }>;
  recent_sales: Array<{
    purchase_id: string;
    buyer_username: string;
    content_title: string;
    price_paid: number;
    currency: string;
    purchased_at: string;
  }>;
}

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = (await import('@/src/lib/supabase')).createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Please log in to view sales analytics');
        return;
      }

      const response = await fetch('/api/creator/sales-analytics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Sales Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your content sales and revenue
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {formatPrice(analytics.total_revenue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All-time earnings</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {formatPrice(analytics.revenue_this_month)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Revenue in {new Date().toLocaleDateString('en-US', { month: 'long' })}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics.total_sales_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Content purchases</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Sales by Content Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tracks Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.sales_by_type.tracks}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Albums Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.sales_by_type.albums}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Podcasts Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.sales_by_type.podcasts}
              </p>
            </div>
          </div>
        </div>

        {/* Top Selling Content */}
        {analytics.top_selling_content.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Top Selling Content
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Content</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_selling_content.map((item) => (
                    <tr key={item.content_id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{item.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded">
                          {item.content_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 text-right">{item.sales_count}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                        {formatPrice(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Sales */}
        {analytics.recent_sales.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Sales
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Buyer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Content</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_sales.map((sale) => (
                    <tr key={sale.purchase_id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(sale.purchased_at)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">@{sale.buyer_username}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{sale.content_title}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                        {formatPrice(sale.price_paid, sale.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analytics.total_sales_count === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No sales yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start selling your content to see analytics here
            </p>
            <Link
              href="/upload"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Content
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

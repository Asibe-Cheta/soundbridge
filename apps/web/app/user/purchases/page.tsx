'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Play, Download, ShoppingBag, Loader2, Music } from 'lucide-react';
import Link from 'next/link';

interface PurchasedContent {
  purchase: {
    id: string;
    content_id: string;
    content_type: string;
    price_paid: number;
    currency: string;
    purchased_at: string;
    download_count: number;
  };
  content: {
    id: string;
    title: string;
    creator_id: string;
    cover_art_url?: string;
    file_url?: string;
    duration?: number;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
  } | null;
}

export default function PurchasedContentPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [purchasedContent, setPurchasedContent] = useState<PurchasedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'all' | 'track' | 'album' | 'podcast'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPurchasedContent();
    }
  }, [user, contentType]);

  const fetchPurchasedContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = (await import('@/src/lib/supabase')).createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please log in to view your purchases');
        return;
      }

      const params = new URLSearchParams();
      if (contentType !== 'all') {
        params.append('content_type', contentType);
      }

      const response = await fetch(`/api/user/purchased-content?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPurchasedContent(data.data);
      } else {
        setError(data.error || 'Failed to load purchases');
      }
    } catch (err: any) {
      console.error('Error fetching purchased content:', err);
      setError('Failed to load purchased content');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = async (content: PurchasedContent['content'], purchaseId: string) => {
    if (!content) return;

    setDownloadingId(purchaseId);

    try {
      const supabase = (await import('@/src/lib/supabase')).createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please log in to download content');
        return;
      }

      const response = await fetch(
        `/api/content/${content.id}/download?content_type=${content.content_type || 'track'}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data.download_url) {
        // Trigger download
        window.location.href = data.data.download_url;
      } else {
        setError('Failed to generate download link');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setError('Failed to download content');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePlay = (content: PurchasedContent['content']) => {
    if (!content || !content.file_url) return;

    // TODO: Integrate with audio player
    // For now, we'll just log
    console.log('Play content:', content);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && purchasedContent.length === 0) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchPurchasedContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Purchases
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            All content you've purchased
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['all', 'track', 'album', 'podcast'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                contentType === type
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Purchased Items List */}
        {purchasedContent.length > 0 ? (
          <div className="space-y-4">
            {purchasedContent.map((item) => {
              if (!item.content) return null;

              return (
                <div
                  key={item.purchase.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center space-x-4">
                    {/* Cover Art */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {item.content.cover_art_url ? (
                        <img
                          src={item.content.cover_art_url}
                          alt={item.content.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.content.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {item.content.creator.display_name || item.content.creator.username}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          Purchased {formatDate(item.purchase.purchased_at)}
                        </span>
                        <span>•</span>
                        <span>
                          Downloaded {item.purchase.download_count} {item.purchase.download_count === 1 ? 'time' : 'times'}
                        </span>
                        <span>•</span>
                        <span>
                          {formatPrice(item.purchase.price_paid, item.purchase.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePlay(item.content)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Play"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(item.content, item.purchase.id)}
                        disabled={downloadingId === item.purchase.id}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Download"
                      >
                        {downloadingId === item.purchase.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No purchases yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Browse content from your favorite creators
            </p>
            <Link
              href="/discover"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Discover Content
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

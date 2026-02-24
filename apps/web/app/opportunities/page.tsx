'use client';

import React, { useState, useEffect } from 'react';
import { OpportunityCard, ExpressInterestModal, type Opportunity, type InterestData } from '@/src/components/opportunities';
import { Button, Input } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import Link from 'next/link';
import { Search, Filter, Briefcase, Users, Music, Flame } from 'lucide-react';

type TabMode = 'planned' | 'urgent';

export default function OpportunitiesPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabMode>('planned');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isServiceProvider, setIsServiceProvider] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (tab === 'planned') loadOpportunities();
    else setLoading(false);
    checkUserStatus();
  }, [tab, page, typeFilter, categoryFilter, locationFilter, user]);

  const checkUserStatus = async () => {
    if (!user) {
      setIsServiceProvider(false);
      setIsSubscriber(false);
      return;
    }

    try {
      // Check if user is service provider
      const providerResponse = await fetch(`/api/service-providers/${user.id}`, {
        credentials: 'include',
      });
      setIsServiceProvider(providerResponse.ok);

      // Check subscription status
      const subResponse = await fetch('/api/user/subscription-status', {
        credentials: 'include',
      });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setIsSubscriber(subData.tier !== 'free' && subData.status === 'active');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (typeFilter && typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (locationFilter) {
        params.append('location', locationFilter);
      }

      const response = await fetch(`/api/opportunities?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities || data.items || []);
      setTotalPages(data.totalPages || Math.ceil((data.total ?? 0) / limit) || 1);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = (opportunityId: string) => {
    const opportunity = opportunities.find((opp) => opp.id === opportunityId);
    if (opportunity) {
      setSelectedOpportunity(opportunity);
      setShowExpressModal(true);
    }
  };

  const handleSubmitInterest = async (data: InterestData) => {
    if (!selectedOpportunity) return;

    try {
      const response = await fetch(
        `/api/opportunities/${selectedOpportunity.id}/interests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to express interest');
      }

      // Success - reload opportunities to show updated state
      loadOpportunities();
      setShowExpressModal(false);
      setSelectedOpportunity(null);
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      alert(error.message || 'Failed to express interest. Please try again.');
    }
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        opp.title.toLowerCase().includes(query) ||
        opp.description.toLowerCase().includes(query) ||
        opp.posted_by.display_name.toLowerCase().includes(query) ||
        opp.keywords.some((kw) => kw.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gray-50'
      }`}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-4xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Opportunities
          </h1>
          <p
            className={`text-lg mb-6 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Discover collaborations, events, and job opportunities from the SoundBridge community
          </p>

          {/* Planned vs Urgent tab */}
          <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setTab('planned')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'planned'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase size={16} />
              Planned Opportunities
            </button>
            <button
              type="button"
              onClick={() => setTab('urgent')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'urgent'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flame size={16} />
              Urgent Gigs
            </button>
          </div>
        </div>

        {/* Urgent tab: placeholder until browse API exists */}
        {tab === 'urgent' && (
          <div
            className={`mb-8 p-8 rounded-xl text-center ${
              theme === 'dark' ? 'bg-white/10 border border-white/10' : 'bg-white border border-gray-200'
            }`}
          >
            <Flame className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
            <h2 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Urgent Gigs
            </h2>
            <p className={`text-sm mb-6 max-w-md mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Last-minute, location-based gigs. Post one to find musicians near you, or browse your own.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/gigs/urgent/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors"
              >
                <Flame size={18} />
                Post Urgent Gig
              </Link>
              <Link
                href="/gigs/my"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/20 hover:bg-white/10 font-medium text-sm transition-colors"
              >
                My Gigs
              </Link>
            </div>
          </div>
        )}

        {/* Filters (planned only) */}
        {tab === 'planned' && (
        <div
          className={`mb-8 p-6 rounded-xl ${
            theme === 'dark'
              ? 'bg-white/10 backdrop-blur-lg border border-white/10'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <Filter
              size={20}
              className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
            />
            <h2
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full h-10 rounded-md border px-3 py-2 text-sm ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/20 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Types</option>
                <option value="collaboration">Collaboration</option>
                <option value="event">Event</option>
                <option value="job">Job</option>
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <Input
                type="text"
                placeholder="Location..."
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Opportunities Grid (planned only) */}
        {loading ? (
          <div
            className={`text-center py-12 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Loading opportunities...
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div
            className={`text-center py-12 ${
              theme === 'dark'
                ? 'bg-white/10 backdrop-blur-lg border border-white/10'
                : 'bg-white border border-gray-200'
            } rounded-xl p-8`}
          >
            <p
              className={`text-lg ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              No opportunities found. Check back later!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onExpressInterest={handleExpressInterest}
                  showExpressInterestButton={isServiceProvider && user && opportunity.poster_user_id !== user.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={theme === 'dark' ? 'border-white/20' : ''}
                >
                  Previous
                </Button>
                <span
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={theme === 'dark' ? 'border-white/20' : ''}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) }
      </div>

      {/* Express Interest Modal */}
      {selectedOpportunity && (
        <ExpressInterestModal
          open={showExpressModal}
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowExpressModal(false);
            setSelectedOpportunity(null);
          }}
          onSubmit={handleSubmitInterest}
          isSubscriber={isSubscriber}
        />
      )}
    </div>
  );
}


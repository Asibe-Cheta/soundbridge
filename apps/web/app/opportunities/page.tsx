'use client';

import React, { useState, useEffect } from 'react';
import { OpportunityCard, ExpressInterestModal, type Opportunity, type InterestData } from '@/src/components/opportunities';
import { Button, Input } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Search, Filter, Briefcase, Users, Music } from 'lucide-react';

export default function OpportunitiesPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
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
    loadOpportunities();
    checkUserStatus();
  }, [page, typeFilter, categoryFilter, locationFilter, user]);

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
      setOpportunities(data.opportunities || []);
      setTotalPages(data.totalPages || 1);
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
            className={`text-lg ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Discover collaborations, events, and job opportunities from the SoundBridge community
          </p>
        </div>

        {/* Filters */}
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

        {/* Opportunities Grid */}
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
        )}
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


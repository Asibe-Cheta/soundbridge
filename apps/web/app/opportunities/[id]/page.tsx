'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExpressInterestModal, type InterestData, InterestCard, AcceptInterestModal, type Interest } from '@/src/components/opportunities';
import { Card, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { MapPin, Calendar, PoundSterling, Briefcase, Users, Music, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import type { Opportunity } from '@/src/components/opportunities/OpportunityCard';

const typeLabels = {
  collaboration: 'Collaboration',
  event: 'Event',
  job: 'Job',
};

const typeIcons = {
  collaboration: Users,
  event: Music,
  job: Briefcase,
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isServiceProvider, setIsServiceProvider] = useState(false);
  const [isPoster, setIsPoster] = useState(false);
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const opportunityId = params.id as string;

  useEffect(() => {
    if (opportunityId) {
      loadOpportunity();
      checkUserStatus();
    }
  }, [opportunityId, user]);

  useEffect(() => {
    if (isPoster && opportunityId) {
      loadInterests();
    }
  }, [isPoster, opportunityId]);

  const checkUserStatus = async () => {
    if (!user) {
      setIsServiceProvider(false);
      setIsSubscriber(false);
      setIsPoster(false);
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

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/opportunities');
          return;
        }
        throw new Error('Failed to load opportunity');
      }

      const data = await response.json();
      setOpportunity(data.opportunity);
      setIsPoster(user?.id === data.opportunity.poster_user_id);
    } catch (error) {
      console.error('Error loading opportunity:', error);
      router.push('/opportunities');
    } finally {
      setLoading(false);
    }
  };

  const loadInterests = async () => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/interests`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load interests');
      }

      const data = await response.json();
      setInterests(data.interests || []);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const handleExpressInterest = async (data: InterestData) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to express interest');
      }

      setShowExpressModal(false);
      router.push('/opportunities');
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      alert(error.message || 'Failed to express interest. Please try again.');
    }
  };

  const handleAcceptInterest = async (customMessage: string) => {
    if (!selectedInterest) return;

    try {
      const response = await fetch(`/api/interests/${selectedInterest.id}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ custom_message: customMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept interest');
      }

      setShowAcceptModal(false);
      setSelectedInterest(null);
      loadInterests();
    } catch (error: any) {
      console.error('Error accepting interest:', error);
      alert(error.message || 'Failed to accept interest. Please try again.');
    }
  };

  const handleRejectInterest = async (interestId: string) => {
    if (!confirm('Are you sure you want to reject this interest?')) return;

    try {
      const response = await fetch(`/api/interests/${interestId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject interest');
      }

      loadInterests();
    } catch (error: any) {
      console.error('Error rejecting interest:', error);
      alert(error.message || 'Failed to reject interest. Please try again.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatBudget = () => {
    if (!opportunity) return null;
    if (!opportunity.budget_min && !opportunity.budget_max) return null;
    const currency = opportunity.budget_currency === 'GBP' ? '£' : opportunity.budget_currency;
    if (opportunity.budget_min && opportunity.budget_max) {
      return `${currency}${opportunity.budget_min} - ${currency}${opportunity.budget_max}`;
    }
    if (opportunity.budget_min) {
      return `From ${currency}${opportunity.budget_min}`;
    }
    return `Up to ${currency}${opportunity.budget_max}`;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
            : 'bg-gray-50'
        }`}
      >
        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Loading...</div>
      </div>
    );
  }

  if (!opportunity) {
    return null;
  }

  const TypeIcon = typeIcons[opportunity.type];
  const pendingInterests = interests.filter((i) => i.status === 'pending');

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gray-50'
      }`}
    >
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/opportunities')}
          className={`mb-6 ${theme === 'dark' ? 'border-white/20' : ''}`}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Opportunities
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunity Details */}
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'dark'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}
                      >
                        <TypeIcon size={16} />
                        {typeLabels[opportunity.type]}
                      </div>
                    </div>
                    <h1
                      className={`text-3xl font-bold mb-4 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {opportunity.title}
                    </h1>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={opportunity.posted_by.avatar_url || undefined} />
                          <AvatarFallback>
                            {opportunity.posted_by.display_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        >
                          {opportunity.posted_by.display_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`prose max-w-none mb-6 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{opportunity.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {opportunity.location && (
                    <div className="flex items-center gap-2">
                      <MapPin
                        size={20}
                        className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                      />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        {opportunity.location}
                      </span>
                    </div>
                  )}
                  {opportunity.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar
                        size={20}
                        className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                      />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Deadline: {formatDate(opportunity.deadline)}
                      </span>
                    </div>
                  )}
                  {formatBudget() && (
                    <div className="flex items-center gap-2">
                      <PoundSterling
                        size={20}
                        className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                      />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        {formatBudget()}
                      </span>
                    </div>
                  )}
                </div>

                {opportunity.keywords && opportunity.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {opportunity.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-md text-sm ${
                          theme === 'dark'
                            ? 'bg-white/10 text-gray-300 border border-white/10'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                {!isPoster && isServiceProvider && user && (
                  <div className="mt-6">
                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={() => setShowExpressModal(true)}
                    >
                      Express Interest
                    </Button>
                  </div>
                )}

                {isPoster && user && (
                  <div className="mt-6 flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/opportunities/${opportunityId}/edit`)}
                      className={theme === 'dark' ? 'border-white/20' : ''}
                    >
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interests Section (Poster Only) */}
            {isPoster && pendingInterests.length > 0 && (
              <div>
                <h2
                  className={`text-2xl font-bold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Pending Interests ({pendingInterests.length})
                </h2>
                <div className="space-y-4">
                  {pendingInterests.map((interest) => (
                    <InterestCard
                      key={interest.id}
                      interest={interest}
                      onViewProfile={(userId) => router.push(`/profile/${userId}`)}
                      onAccept={() => {
                        setSelectedInterest(interest);
                        setShowAcceptModal(true);
                      }}
                      onReject={handleRejectInterest}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Poster Info */}
            <Card variant="glass">
              <CardContent className="p-6">
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Posted By
                </h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={opportunity.posted_by.avatar_url || undefined} />
                    <AvatarFallback>
                      {opportunity.posted_by.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div
                      className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {opportunity.posted_by.display_name}
                    </div>
                    <div
                      className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      @{opportunity.posted_by.username}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push(`/profile/${opportunity.posted_by.id}`)}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Express Interest Modal */}
      <ExpressInterestModal
        open={showExpressModal}
        opportunity={opportunity}
        onClose={() => setShowExpressModal(false)}
        onSubmit={handleExpressInterest}
        isSubscriber={isSubscriber}
      />

      {/* Accept Interest Modal */}
      {selectedInterest && (
        <AcceptInterestModal
          open={showAcceptModal}
          interest={selectedInterest}
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedInterest(null);
          }}
          onSubmit={handleAcceptInterest}
        />
      )}
    </div>
  );
}


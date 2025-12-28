'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Button, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Clock, CheckCircle, XCircle, MapPin, MessageSquare, ExternalLink } from 'lucide-react';

interface Application {
  id: string;
  opportunity_id: string;
  reason: 'perfect_fit' | 'interested' | 'learn_more' | 'available';
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  custom_message: string | null;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  opportunity: {
    id: string;
    title: string;
    type: 'collaboration' | 'event' | 'job';
    location: string | null;
  };
  poster: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface MyApplicationsSectionProps {
  userId: string;
}

const reasonLabels = {
  perfect_fit: 'Perfect Fit',
  interested: 'Very Interested',
  learn_more: 'Want Details',
  available: 'Available Now',
};

const typeLabels = {
  collaboration: 'Collaboration',
  event: 'Event',
  job: 'Job',
};

export function MyApplicationsSection({ userId }: MyApplicationsSectionProps) {
  const { theme } = useTheme();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/me/interests?status=${activeTab}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load applications');
      }

      const data = await response.json();
      setApplications(data.interests || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          color: theme === 'dark' ? 'text-orange-400' : 'text-orange-600',
          bg: theme === 'dark' ? 'bg-orange-500/20 border-orange-500/30' : 'bg-orange-100 border-orange-200',
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          label: 'Accepted',
          color: theme === 'dark' ? 'text-green-400' : 'text-green-600',
          bg: theme === 'dark' ? 'bg-green-500/20 border-green-500/30' : 'bg-green-100 border-green-200',
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Not Selected',
          color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
          bg: theme === 'dark' ? 'bg-gray-500/20 border-gray-500/30' : 'bg-gray-100 border-gray-200',
        };
      default:
        return null;
    }
  };

  const filteredApplications = applications.filter((app) => app.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          My Applications
        </h2>
        <p
          className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Track your interest applications and responses
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="w-full"
      >
        <TabsList
          className={`${
            theme === 'dark'
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-100 border-gray-200'
          }`}
        >
          <TabsTrigger
            value="pending"
            className={theme === 'dark' ? 'data-[state=active]:bg-white/10' : ''}
          >
            <Clock size={16} className="mr-2" />
            Pending ({applications.filter((a) => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger
            value="accepted"
            className={theme === 'dark' ? 'data-[state=active]:bg-white/10' : ''}
          >
            <CheckCircle size={16} className="mr-2" />
            Accepted ({applications.filter((a) => a.status === 'accepted').length})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className={theme === 'dark' ? 'data-[state=active]:bg-white/10' : ''}
          >
            <XCircle size={16} className="mr-2" />
            Not Selected ({applications.filter((a) => a.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div
              className={`text-center py-12 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Loading applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <div
                  className={`text-lg font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  No {activeTab} applications yet
                </div>
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {activeTab === 'pending' &&
                    'Applications you submit will appear here while waiting for a response.'}
                  {activeTab === 'accepted' &&
                    'Accepted applications will appear here. You can connect with the poster!'}
                  {activeTab === 'rejected' &&
                    'Applications that were not selected will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const statusConfig = getStatusConfig(application.status);
                const StatusIcon = statusConfig?.icon || Clock;

                return (
                  <Card
                    key={application.id}
                    variant="glass"
                    className={`transition-all duration-300 ${
                      theme === 'dark'
                        ? 'hover:bg-white/15 hover:border-white/25'
                        : 'hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-10 h-10">
                              <AvatarImage
                                src={application.poster.avatar_url || undefined}
                              />
                              <AvatarFallback>
                                {application.poster.display_name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3
                                className={`text-lg font-semibold ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}
                              >
                                {application.opportunity.title}
                              </h3>
                              <p
                                className={`text-sm ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                }`}
                              >
                                {application.poster.display_name} • {typeLabels[application.opportunity.type]}
                              </p>
                            </div>
                          </div>

                          {application.opportunity.location && (
                            <div className="flex items-center gap-1.5 text-sm mb-2">
                              <MapPin
                                size={14}
                                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                              />
                              <span
                                className={
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }
                              >
                                {application.opportunity.location}
                              </span>
                            </div>
                          )}
                        </div>

                        {statusConfig && (
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color}`}
                          >
                            <StatusIcon size={14} />
                            {statusConfig.label}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            Your Reason: {reasonLabels[application.reason]}
                          </span>
                        </div>

                        {application.message && (
                          <div
                            className={`p-3 rounded-lg border ${
                              theme === 'dark'
                                ? 'bg-white/5 border-white/10 text-gray-300'
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare
                                size={16}
                                className={`mt-0.5 flex-shrink-0 ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}
                              />
                              <p className="text-sm italic">{application.message}</p>
                            </div>
                          </div>
                        )}

                        {application.status === 'accepted' && application.custom_message && (
                          <div
                            className={`mt-3 p-3 rounded-lg border ${
                              theme === 'dark'
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle
                                size={16}
                                className={`mt-0.5 flex-shrink-0 ${
                                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                }`}
                              />
                              <div>
                                <div
                                  className={`text-xs font-semibold mb-1 ${
                                    theme === 'dark' ? 'text-green-300' : 'text-green-800'
                                  }`}
                                >
                                  Response from {application.poster.display_name}:
                                </div>
                                <p
                                  className={`text-sm ${
                                    theme === 'dark' ? 'text-green-300' : 'text-green-800'
                                  }`}
                                >
                                  {application.custom_message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div
                          className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          Applied {formatDate(application.created_at)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/opportunities/${application.opportunity.id}`)
                            }
                            className={theme === 'dark' ? 'border-white/20' : ''}
                          >
                            <ExternalLink size={14} className="mr-2" />
                            View Opportunity
                          </Button>
                          {application.status === 'accepted' && (
                            <Button
                              variant="gradient"
                              size="sm"
                              onClick={() =>
                                (window.location.href = `/profile/${application.poster.id}`)
                              }
                            >
                              Contact
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


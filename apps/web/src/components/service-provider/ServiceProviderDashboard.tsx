/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  ExternalLink,
  Layers,
  Loader2,
  ListChecks,
  Plus,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';

import { SERVICE_CATEGORIES } from '@/src/constants/creatorTypes';
import { BOOKING_STATUS_META, type BookingStatus } from '@/src/constants/bookings';
import { SUPPORTED_CURRENCIES } from '@/src/constants/currency';

type ProviderStatus = 'draft' | 'pending_review' | 'active' | 'suspended';
interface BookingParticipant {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface BookingOffering {
  id: string;
  title: string;
  category: string;
  rate_amount: number | null;
  rate_currency: string | null;
  rate_unit: string;
}

interface BookingVenue {
  id: string;
  name: string;
  address: Record<string, unknown> | null;
}

interface ProviderBooking {
  id: string;
  provider_id: string;
  booker_id: string;
  service_offering_id: string | null;
  venue_id: string | null;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  total_amount: number;
  currency: string;
  platform_fee: number;
  provider_payout: number;
  booking_notes: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  disputed_at: string | null;
  created_at: string;
  updated_at: string;
  booker?: BookingParticipant | null;
  offering?: BookingOffering | null;
  venue?: BookingVenue | null;
}

interface ServiceProviderProfileResponse {
  provider: {
    user_id: string;
    display_name: string;
    headline: string | null;
    bio: string | null;
    categories: string[];
    default_rate: number | null;
    rate_currency: string | null;
    status: ProviderStatus;
    is_verified: boolean;
    verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected';
    verification_requested_at: string | null;
    verification_reviewed_at: string | null;
    verification_notes: string | null;
    average_rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
  };
  offerings?: Array<{
    id: string;
    title: string;
    category: string;
    description: string | null;
    rate_amount: number | null;
    rate_currency: string | null;
    rate_unit: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  portfolio?: Array<{
    id: string;
    media_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    display_order: number | null;
    created_at: string;
  }>;
  availability?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    recurrence_rule: string | null;
    is_bookable: boolean;
    created_at: string;
    updated_at: string;
  }>;
  reviews?: Array<{
    id: string;
    provider_id: string;
    reviewer_id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    booking_reference: string | null;
    status: 'pending' | 'published' | 'flagged' | 'removed';
    created_at: string;
    updated_at: string;
    reviewer?: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    };
  }>;
  bookings?: ProviderBooking[];
}

interface ServiceProviderDashboardProps {
  userId: string;
}

interface OfferingDraft {
  title: string;
  category: string;
  description: string;
  rateAmount: string;
  rateCurrency: string;
  rateUnit: string;
  isActive: boolean;
}

interface PortfolioDraft {
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  displayOrder: string;
}

interface AvailabilityDraft {
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceRule: string;
  isBookable: boolean;
}

interface VerificationPrerequisiteEntry {
  id: keyof VerificationStatusResponse['prerequisites'];
  label: string;
}

interface VerificationFormState {
  governmentIdUrl: string;
  selfieUrl: string;
  businessDocUrl: string;
  notes: string;
}

interface VerificationStatusResponse {
  verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  verificationNotes: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  latestRequest: {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    submitted_at: string;
    reviewed_at: string | null;
    reviewer_id: string | null;
    reviewer_notes: string | null;
    provider_notes: string | null;
    documents: Array<{
      id: string;
      doc_type: string;
      storage_path: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>;
  } | null;
  prerequisites: {
    profileComplete: VerificationPrerequisite;
    offeringsPublished: VerificationPrerequisite;
    portfolioItems: VerificationPrerequisite;
    completedBookings: VerificationPrerequisite;
    averageRating: VerificationPrerequisite;
    connectAccount: VerificationPrerequisite;
  };
}

interface VerificationPrerequisite {
  met: boolean;
  value?: number | boolean | string | null;
  required?: number | boolean | string | null;
  description?: string;
}

type ProviderBadgeTier = 'new_provider' | 'rising_star' | 'established' | 'top_rated';

interface BadgeRequirement {
  minBookings: number;
  minRating: number | null;
  description: string;
}

interface BadgeProgressMetric {
  current: number;
  required: number;
  percentage: number;
}

interface ProviderBadgeState {
  tier: ProviderBadgeTier;
  label: string;
  headline: string;
  met: boolean;
  isCurrent: boolean;
  description: string;
  progress: {
    bookings: BadgeProgressMetric;
    rating?: BadgeProgressMetric;
  };
  requirements: BadgeRequirement;
}

interface ProviderBadgeHistoryEntry {
  id: string;
  previousTier: ProviderBadgeTier | null;
  newTier: ProviderBadgeTier;
  reason: string | null;
  createdAt: string;
}

interface ProviderBadgeInsights {
  badgeTier: ProviderBadgeTier;
  badgeLabel: string;
  badgeHeadline: string;
  badgeUpdatedAt: string;
  completedBookings: number;
  averageRating: number;
  reviewCount: number;
  isVerified: boolean;
  idVerified: boolean;
  showPaymentProtection: boolean;
  firstBookingDiscountEnabled: boolean;
  firstBookingDiscountPercent: number;
  firstBookingDiscountEligible: boolean;
  badges: ProviderBadgeState[];
  nextBadge: {
    tier: ProviderBadgeTier;
    label: string;
    description: string;
    remainingBookings: number;
    ratingShortfall: number;
    progress: {
      bookings: BadgeProgressMetric;
      rating?: BadgeProgressMetric;
    };
  } | null;
  history: ProviderBadgeHistoryEntry[];
}

const statusPill: Record<ProviderStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5f5' },
  pending_review: { label: 'Pending Review', bg: 'rgba(249, 115, 22, 0.18)', text: '#fb923c' },
  active: { label: 'Active', bg: 'rgba(34, 197, 94, 0.18)', text: '#34d399' },
  suspended: { label: 'Suspended', bg: 'rgba(248, 113, 113, 0.18)', text: '#f87171' },
};

const bookingStatusIcon = (icon: (typeof BOOKING_STATUS_META)[BookingStatus]['icon']) => {
  switch (icon) {
    case 'calendar-clock':
      return <CalendarClock size={14} />;
    case 'calendar-check':
      return <CalendarCheck size={14} />;
    case 'credit-card':
      return <CreditCard size={14} />;
    case 'check-circle':
      return <CheckCircle size={14} />;
    case 'calendar-x':
      return <CalendarX size={14} />;
    case 'shield-alert':
      return <ShieldAlert size={14} />;
    default:
      return null;
  }
};

const providerStatusDescriptionOverrides: Partial<Record<BookingStatus, string>> = {
  pending: 'Awaiting your confirmation',
  confirmed_awaiting_payment: 'Confirmed. Waiting for client payment.',
  paid: 'Funds secured in escrow. Deliver on time to release payout.',
};

const verificationStatusMeta: Record<
  'not_requested' | 'pending' | 'approved' | 'rejected',
  {
    label: string;
    tone: 'default' | 'warning' | 'success' | 'critical';
    description: string;
  }
> = {
  not_requested: {
    label: 'Not requested',
    tone: 'default',
    description: 'Complete the checklist below to unlock verification.',
  },
  pending: {
    label: 'Pending review',
    tone: 'warning',
    description: 'Our team is reviewing your submission. We aim to respond within 3 business days.',
  },
  approved: {
    label: 'Verified',
    tone: 'success',
    description: 'You’re verified! Your badge is live and you’ll surface higher in discovery.',
  },
  rejected: {
    label: 'Needs revision',
    tone: 'critical',
    description: 'We spotted an issue. Review the feedback and submit an updated request.',
  },
};

const verificationPrerequisiteEntries: VerificationPrerequisiteEntry[] = [
  { id: 'profileComplete', label: 'Complete profile' },
  { id: 'offeringsPublished', label: 'Active service offering' },
  { id: 'portfolioItems', label: 'Portfolio items' },
  { id: 'completedBookings', label: 'Completed bookings' },
  { id: 'averageRating', label: 'Average rating' },
  { id: 'connectAccount', label: 'Stripe payouts ready' },
];

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

function HelperPill({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'warning' | 'success' | 'critical' | 'info';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'success'
      ? { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)', color: '#bbf7d0' }
      : tone === 'warning'
      ? { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.25)', color: '#facc15' }
      : tone === 'critical'
      ? { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)', color: '#fca5a5' }
      : tone === 'info'
      ? { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.25)', color: '#93c5fd' }
      : { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.25)', color: '#cbd5f5' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: '999px',
        padding: '0.4rem 0.75rem',
        fontSize: '0.75rem',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
      }}
    >
      {children}
    </div>
  );
}

export const ServiceProviderDashboard: React.FC<ServiceProviderDashboardProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ServiceProviderProfileResponse['provider'] | null>(null);
  const [offerings, setOfferings] = useState<ServiceProviderProfileResponse['offerings']>([]);
  const [portfolioItems, setPortfolioItems] = useState<ServiceProviderProfileResponse['portfolio']>([]);
  const [availability, setAvailability] = useState<ServiceProviderProfileResponse['availability']>([]);
  const [reviews, setReviews] = useState<ServiceProviderProfileResponse['reviews']>([]);
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationForm, setVerificationForm] = useState<VerificationFormState>({
    governmentIdUrl: '',
    selfieUrl: '',
    businessDocUrl: '',
    notes: '',
  });
  const [profileDraft, setProfileDraft] = useState({
    displayName: '',
    headline: '',
    bio: '',
    categories: [] as string[],
    defaultRate: '',
    rateCurrency: 'USD',
    status: 'draft' as ProviderStatus,
    isVerified: false,
  });
  const [badgeInsights, setBadgeInsights] = useState<ProviderBadgeInsights | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [trustSettings, setTrustSettings] = useState({
    showPaymentProtection: true,
    firstBookingDiscountEnabled: false,
    firstBookingDiscountPercent: '20',
  });
  const [savingTrustSettings, setSavingTrustSettings] = useState(false);
  const [trustFeedback, setTrustFeedback] = useState<{ error?: string; success?: string }>({});

  const [offeringDraft, setOfferingDraft] = useState<OfferingDraft>({
    title: '',
    category: SERVICE_CATEGORIES[0],
    description: '',
    rateAmount: '',
    rateCurrency: 'USD',
    rateUnit: 'hour',
    isActive: true,
  });

  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft>({
    mediaUrl: '',
    thumbnailUrl: '',
    caption: '',
    displayOrder: '',
  });

  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilityDraft>({
    startTime: '',
    endTime: '',
    isRecurring: false,
    recurrenceRule: '',
    isBookable: true,
  });

  const formatMoney = (amount: number, currency: string) =>
    `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadVerificationStatus = async () => {
    try {
      setLoadingVerification(true);
      setVerificationError(null);

      const response = await fetch(`/api/service-providers/${userId}/verification/status`);

      if (response.status === 404) {
        setVerificationStatus(null);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load verification status.');
      }

      setVerificationStatus(data.status ?? null);
    } catch (err) {
      console.error(err);
      setVerificationError(err instanceof Error ? err.message : 'Failed to load verification status.');
    } finally {
      setLoadingVerification(false);
    }
  };

  const loadBadgeInsights = async () => {
    try {
      setLoadingBadges(true);
      setBadgeError(null);
      const response = await fetch(`/api/service-providers/${userId}/badges`);

      if (response.status === 404) {
        setBadgeInsights(null);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load badge insights.');
      }

      if (data?.insights) {
        setBadgeInsights(data.insights);
        setTrustSettings({
          showPaymentProtection: data.insights.showPaymentProtection,
          firstBookingDiscountEnabled: data.insights.firstBookingDiscountEnabled,
          firstBookingDiscountPercent: String(data.insights.firstBookingDiscountPercent ?? 0),
        });
      } else {
        setBadgeInsights(null);
      }
    } catch (err) {
      console.error(err);
      setBadgeInsights(null);
      setBadgeError(err instanceof Error ? err.message : 'Failed to load badge insights.');
    } finally {
      setLoadingBadges(false);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [profileResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/service-providers/${userId}?include=offerings,portfolio,availability,reviews`),
        fetch(`/api/service-providers/${userId}/bookings`),
      ]);

      if (profileResponse.status === 404) {
        setProfileData(null);
        setOfferings([]);
        setPortfolioItems([]);
        setAvailability([]);
        setReviews([]);
        setBookings([]);
        setVerificationStatus(null);
        setProfileDraft((prev) => ({
          ...prev,
          displayName: '',
          headline: '',
          bio: '',
          categories: [],
          defaultRate: '',
        }));
        return;
      }

      const profileJson: ServiceProviderProfileResponse = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error((profileJson as unknown as { error?: string })?.error || 'Failed to load service provider data.');
      }

      if (profileJson.provider) {
        setProfileData(profileJson.provider);
        setProfileDraft({
          displayName: profileJson.provider.display_name || '',
          headline: profileJson.provider.headline || '',
          bio: profileJson.provider.bio || '',
          categories: profileJson.provider.categories || [],
          defaultRate: profileJson.provider.default_rate !== null ? String(profileJson.provider.default_rate) : '',
          rateCurrency: profileJson.provider.rate_currency || 'USD',
          status: profileJson.provider.status,
          isVerified: profileJson.provider.is_verified,
        });
      }

      setOfferings(profileJson.offerings || []);
      setPortfolioItems(profileJson.portfolio || []);
      setAvailability(profileJson.availability || []);
      setReviews(profileJson.reviews || []);

      if (bookingsResponse.status === 200) {
        const bookingsJson = await bookingsResponse.json();
        setBookings(bookingsJson.bookings ?? []);
      } else if (bookingsResponse.status === 404) {
        setBookings([]);
      } else {
        let bookingsJson: { error?: string } | null = null;
        try {
          bookingsJson = await bookingsResponse.json();
        } catch (parseError) {
          console.warn('Failed to parse bookings response', parseError);
        }

        if (bookingsResponse.status !== 401) {
          setError(
            bookingsJson?.error ||
              (bookingsResponse.status === 403
                ? 'You do not have permission to view these bookings.'
                : 'Failed to load booking data.'),
          );
        }
        setBookings([]);
      }

      await loadVerificationStatus();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load service provider data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadBadgeInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreateOrUpdateProfile = async () => {
    try {
      setSavingProfile(true);
      setError(null);

      const payload = {
        displayName: profileDraft.displayName.trim(),
        headline: profileDraft.headline || null,
        bio: profileDraft.bio || null,
        categories: profileDraft.categories,
        defaultRate: profileDraft.defaultRate ? Number(profileDraft.defaultRate) : null,
        rateCurrency: profileDraft.rateCurrency || null,
        status: profileDraft.status,
        isVerified: profileDraft.isVerified,
      };

      const method = profileData ? 'PATCH' : 'POST';
      const url = profileData ? `/api/service-providers/${userId}` : `/api/service-providers`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData ? payload : { ...payload, displayName: payload.displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save service provider profile.');
      }

      setProfileData(data.provider);
      setProfileDraft({
        displayName: data.provider.display_name,
        headline: data.provider.headline || '',
        bio: data.provider.bio || '',
        categories: data.provider.categories || [],
        defaultRate: data.provider.default_rate !== null ? String(data.provider.default_rate) : '',
        rateCurrency: data.provider.rate_currency || 'USD',
        status: data.provider.status,
        isVerified: data.provider.is_verified,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not save service provider profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTrustSettingChange = (
    key: 'showPaymentProtection' | 'firstBookingDiscountEnabled',
    value: boolean,
  ) => {
    setTrustFeedback({});
    setTrustSettings((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'firstBookingDiscountEnabled' && !value ? { firstBookingDiscountPercent: '0' } : {}),
    }));
  };

  const handleTrustPercentChange = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    setTrustFeedback({});
    setTrustSettings((prev) => ({
      ...prev,
      firstBookingDiscountPercent: cleaned,
    }));
  };

  const handleSaveTrustSettings = async () => {
    try {
      setSavingTrustSettings(true);
      setTrustFeedback({});

      const percentValue = Number(trustSettings.firstBookingDiscountPercent || 0);

      if (Number.isNaN(percentValue)) {
        setTrustFeedback({ error: 'Discount percent must be a number.' });
        return;
      }

      if (percentValue < 0 || percentValue > 50) {
        setTrustFeedback({ error: 'Discount percent must be between 0 and 50.' });
        return;
      }

      if (trustSettings.firstBookingDiscountEnabled && percentValue <= 0) {
        setTrustFeedback({ error: 'Set a discount percent greater than 0 to enable the first booking special.' });
        return;
      }

      const response = await fetch(`/api/service-providers/${userId}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showPaymentProtection: trustSettings.showPaymentProtection,
          firstBookingDiscountEnabled: trustSettings.firstBookingDiscountEnabled,
          firstBookingDiscountPercent: trustSettings.firstBookingDiscountEnabled ? percentValue : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update trust settings.');
      }

      if (data?.insights) {
        setBadgeInsights(data.insights);
        setTrustSettings({
          showPaymentProtection: data.insights.showPaymentProtection,
          firstBookingDiscountEnabled: data.insights.firstBookingDiscountEnabled,
          firstBookingDiscountPercent: String(data.insights.firstBookingDiscountPercent ?? 0),
        });
      }

      setTrustFeedback({ success: 'Trust settings updated.' });
    } catch (err) {
      console.error(err);
      setTrustFeedback({
        error: err instanceof Error ? err.message : 'Failed to update trust settings.',
      });
    } finally {
      setSavingTrustSettings(false);
    }
  };

  const handleAddOffering = async () => {
    try {
      if (!offeringDraft.title.trim()) {
        setError('Offering title is required.');
        return;
      }

      const response = await fetch(`/api/service-providers/${userId}/offerings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: offeringDraft.title.trim(),
          category: offeringDraft.category,
          description: offeringDraft.description || null,
          rateAmount: offeringDraft.rateAmount ? Number(offeringDraft.rateAmount) : null,
          rateCurrency: offeringDraft.rateCurrency || null,
          rateUnit: offeringDraft.rateUnit || 'hour',
          isActive: offeringDraft.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create offering.');
      }

      setOfferings((prev) => [data.offering, ...(prev || [])]);
      setOfferingDraft({
        title: '',
        category: SERVICE_CATEGORIES[0],
        description: '',
        rateAmount: '',
        rateCurrency: 'USD',
        rateUnit: 'hour',
        isActive: true,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not create offering.');
    }
  };

  const handleToggleOffering = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/service-providers/${userId}/offerings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to update offering.');

      setOfferings((prev) =>
        (prev || []).map((offering) => (offering.id === id ? { ...offering, is_active: data.offering.is_active } : offering)),
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not update offering.');
    }
  };

  const handleDeleteOffering = async (id: string) => {
    try {
      const response = await fetch(`/api/service-providers/${userId}/offerings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to delete offering.');

      setOfferings((prev) => (prev || []).filter((offering) => offering.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not delete offering.');
    }
  };

  const handleAddPortfolio = async () => {
    try {
      if (!portfolioDraft.mediaUrl.trim()) {
        setError('A media URL is required to add portfolio items.');
        return;
      }

      const response = await fetch(`/api/service-providers/${userId}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: portfolioDraft.mediaUrl.trim(),
          thumbnailUrl: portfolioDraft.thumbnailUrl.trim() || null,
          caption: portfolioDraft.caption || null,
          displayOrder: portfolioDraft.displayOrder ? Number(portfolioDraft.displayOrder) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to add portfolio item.');

      setPortfolioItems((prev) => [data.item, ...(prev || [])]);
      setPortfolioDraft({
        mediaUrl: '',
        thumbnailUrl: '',
        caption: '',
        displayOrder: '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not add portfolio item.');
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      const response = await fetch(`/api/service-providers/${userId}/portfolio/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to delete portfolio item.');

      setPortfolioItems((prev) => (prev || []).filter((item) => item.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not delete portfolio item.');
    }
  };

  const handleAddAvailability = async () => {
    try {
      if (!availabilityDraft.startTime || !availabilityDraft.endTime) {
        setError('Start and end time are required.');
        return;
      }

      const response = await fetch(`/api/service-providers/${userId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(availabilityDraft.startTime).toISOString(),
          endTime: new Date(availabilityDraft.endTime).toISOString(),
          isRecurring: availabilityDraft.isRecurring,
          recurrenceRule: availabilityDraft.recurrenceRule || null,
          isBookable: availabilityDraft.isBookable,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to add availability slot.');

      setAvailability((prev) => [data.availability, ...(prev || [])]);
      setAvailabilityDraft({
        startTime: '',
        endTime: '',
        isRecurring: false,
        recurrenceRule: '',
        isBookable: true,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not add availability slot.');
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/service-providers/${userId}/availability/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to delete availability slot.');

      setAvailability((prev) => (prev || []).filter((slot) => slot.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not delete availability slot.');
    }
  };

  const handleSubmitVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingVerification) return;

    const governmentIdUrl = verificationForm.governmentIdUrl.trim();
    const selfieUrl = verificationForm.selfieUrl.trim();
    const businessDocUrl = verificationForm.businessDocUrl.trim();

    if (!governmentIdUrl || !selfieUrl) {
      setVerificationError('Government ID and selfie documents are required.');
      return;
    }

    setSubmittingVerification(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const response = await fetch(`/api/service-providers/${userId}/verification/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: verificationForm.notes || undefined,
          documents: [
            { docType: 'government_id', storagePath: governmentIdUrl },
            { docType: 'selfie', storagePath: selfieUrl },
            ...(businessDocUrl ? [{ docType: 'business_document', storagePath: businessDocUrl }] : []),
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit verification request.');
      }

      setVerificationSuccess('Verification request submitted! We will notify you as soon as the review is complete.');
      setVerificationForm({
        governmentIdUrl: '',
        selfieUrl: '',
        businessDocUrl: '',
        notes: '',
      });
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              verification_status: 'pending',
            }
          : prev,
      );
      await loadVerificationStatus();
    } catch (submitError) {
      console.error(submitError);
      setVerificationError(
        submitError instanceof Error ? submitError.message : 'Failed to submit verification request.',
      );
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: BookingStatus, notes?: string | null) => {
    try {
      setError(null);
      setUpdatingBookingId(bookingId);
      const response = await fetch(`/api/service-providers/${userId}/bookings?bookingId=${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes ?? null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking status.');
      }

      if (data.booking) {
        setBookings((prev) =>
          prev.map((booking) => (booking.id === bookingId ? (data.booking as ProviderBooking) : booking)),
        );
      } else {
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not update booking status.');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const renderBookingsSection = () => (
    <SectionCard
      title="Bookings"
      action={
        <HelperPill tone="info">
          <CalendarClock size={14} /> Track requests and in-progress work.
        </HelperPill>
      }
    >
      {bookings && bookings.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {bookings.map((booking) => {
            const statusMeta = BOOKING_STATUS_META[booking.status];
            const start = new Date(booking.scheduled_start);
            const end = new Date(booking.scheduled_end);
            const isPast = end.getTime() < Date.now();
            const bookerName = booking.booker?.display_name || booking.booker?.username || 'Client';
            const offeringTitle = booking.offering?.title || 'Custom service';

            const actionButtons: React.ReactNode[] = [];
            if (booking.status === 'pending') {
              actionButtons.push(
                <button
                  key="confirm"
                  type="button"
                  onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed_awaiting_payment')}
                  disabled={updatingBookingId === booking.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #34d399 0%, #22d3ee 100%)',
                    color: '#0f172a',
                    fontWeight: 600,
                    cursor: updatingBookingId === booking.id ? 'wait' : 'pointer',
                    opacity: updatingBookingId === booking.id ? 0.7 : 1,
                  }}
                >
                  <CalendarCheck size={14} />
                  Confirm slot
                </button>,
              );
              actionButtons.push(
                <button
                  key="decline"
                  type="button"
                  onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                  disabled={updatingBookingId === booking.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'rgba(248,113,113,0.15)',
                    color: '#f87171',
                    fontWeight: 600,
                    cursor: updatingBookingId === booking.id ? 'wait' : 'pointer',
                    opacity: updatingBookingId === booking.id ? 0.7 : 1,
                  }}
                >
                  <CalendarX size={14} />
                  Decline
                </button>,
              );
            } else if (booking.status === 'confirmed_awaiting_payment') {
              actionButtons.push(
                <button
                  key="cancel-confirmed"
                  type="button"
                  onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                  disabled={updatingBookingId === booking.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'rgba(248,113,113,0.15)',
                    color: '#f87171',
                    fontWeight: 600,
                    cursor: updatingBookingId === booking.id ? 'wait' : 'pointer',
                    opacity: updatingBookingId === booking.id ? 0.7 : 1,
                  }}
                >
                  <CalendarX size={14} />
                  Cancel booking
                </button>,
              );
            } else if (booking.status === 'paid') {
              actionButtons.push(
                <button
                  key="complete"
                  type="button"
                  onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                  disabled={updatingBookingId === booking.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #16a34a 100%)',
                    color: '#0f172a',
                    fontWeight: 600,
                    cursor: updatingBookingId === booking.id ? 'wait' : 'pointer',
                    opacity: updatingBookingId === booking.id ? 0.7 : 1,
                  }}
                >
                  <CheckCircle size={14} />
                  Mark completed
                </button>,
              );
            }

            return (
              <div
                key={booking.id}
                style={{
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-primary)',
                  padding: '1rem',
                  display: 'grid',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        height: '2.5rem',
                        width: '2.5rem',
                        borderRadius: '999px',
                        background: 'rgba(148,163,184,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bookerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{booking.id.slice(0, 8)}</div>
                    </div>
                  </div>

                  <HelperPill tone={statusMeta.tone}>
                    {bookingStatusIcon(statusMeta.icon)}
                    <span>{statusMeta.label}</span>
                  </HelperPill>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{offeringTitle}</div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} /> {start.toLocaleString()} → {end.toLocaleString()}
                    </span>
                    <span>{booking.timezone}</span>
                    {isPast && (
                      <HelperPill tone="warning">
                        <CalendarClock size={12} /> Past date
                      </HelperPill>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <DollarSign size={14} /> Total {formatMoney(booking.total_amount, booking.currency)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldAlert size={14} /> Platform fee {formatMoney(booking.platform_fee, booking.currency)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CreditCard size={14} /> Payout {formatMoney(booking.provider_payout, booking.currency)}
                  </span>
                </div>

                {booking.booking_notes && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(148,163,184,0.12)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                    }}
                  >
                    Note from booker: {booking.booking_notes}
                  </div>
                )}

                {booking.cancellation_reason && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#fca5a5',
                      fontSize: '0.8rem',
                    }}
                  >
                    Cancellation reason: {booking.cancellation_reason}
                  </div>
                )}

                {(providerStatusDescriptionOverrides[booking.status] || statusMeta.description) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {providerStatusDescriptionOverrides[booking.status] ?? statusMeta.description}
                  </div>
                )}

                {actionButtons.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>{actionButtons}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          No bookings yet. Once clients request time with you, they'll appear here with full context.
        </div>
      )}
    </SectionCard>
  );

  const renderBadgesSection = () => {
    const currentBadge = badgeInsights?.badges.find((badge) => badge.isCurrent) ?? null;
    const nextBadge = badgeInsights?.nextBadge ?? null;
    const percentValue = Number(trustSettings.firstBookingDiscountPercent || 0);
    const discountDisabled =
      !!(badgeInsights && !badgeInsights.firstBookingDiscountEligible && !trustSettings.firstBookingDiscountEnabled);

    return (
      <SectionCard
        title="Badges & Trust"
        action={
          currentBadge ? (
            <HelperPill tone={badgeInsights?.badgeTier === 'top_rated' ? 'success' : 'info'}>
              <Sparkles size={14} /> {currentBadge.label}
            </HelperPill>
          ) : undefined
        }
      >
        {loadingBadges ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Loader2 size={16} className="animate-spin" /> Loading badge insights…
          </div>
        ) : badgeError ? (
          <div
            style={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.12)',
              color: '#fca5a5',
              padding: '0.9rem',
              fontSize: '0.85rem',
            }}
          >
            {badgeError}
          </div>
        ) : badgeInsights ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #DC2626, #EC4899)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={14} /> {badgeInsights.badgeLabel}
              </div>
              {badgeInsights.isVerified && (
                <HelperPill tone="success">
                  <ShieldCheck size={14} /> Verified
                </HelperPill>
              )}
              {badgeInsights.idVerified && (
                <HelperPill tone="info">
                  <ShieldCheck size={14} /> ID Verified
                </HelperPill>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
              {badgeInsights.badgeHeadline}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: '#e2e8f0' }}>
              <div style={{ minWidth: '140px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em' }}>
                  Completed bookings
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{badgeInsights.completedBookings}</div>
              </div>
              <div style={{ minWidth: '140px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em' }}>
                  Average rating
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{badgeInsights.averageRating.toFixed(1)}</div>
              </div>
              <div style={{ minWidth: '140px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em' }}>
                  Reviews
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{badgeInsights.reviewCount}</div>
              </div>
            </div>

            {nextBadge ? (
              <div
                style={{
                  border: '1px solid rgba(148,163,184,0.25)',
                  borderRadius: '1rem',
                  padding: '1.1rem',
                  background: 'rgba(15,23,42,0.45)',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    Next badge
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                    {nextBadge.remainingBookings > 0 && `${nextBadge.remainingBookings} more booking${nextBadge.remainingBookings === 1 ? '' : 's'}`}
                    {nextBadge.ratingShortfall > 0
                      ? ` · Improve rating by ${nextBadge.ratingShortfall.toFixed(1)}`
                      : ''}
                  </div>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>{nextBadge.label}</div>
                <p style={{ margin: 0, color: '#cbd5f5', fontSize: '0.9rem' }}>{nextBadge.description}</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem' }}>
                      <span>Bookings</span>
                      <span>
                        {nextBadge.progress.bookings.current}/{nextBadge.progress.bookings.required}
                      </span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(148,163,184,0.2)' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: '999px',
                          width: `${Math.min(100, nextBadge.progress.bookings.percentage * 100)}%`,
                          background: 'linear-gradient(135deg, #DC2626, #EC4899)',
                        }}
                      />
                    </div>
                  </div>
                  {nextBadge.progress.rating && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem' }}>
                        <span>Rating</span>
                        <span>
                          {nextBadge.progress.rating.current.toFixed(1)} /{' '}
                          {nextBadge.progress.rating.required.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(148,163,184,0.2)' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '999px',
                            width: `${Math.min(100, nextBadge.progress.rating.percentage * 100)}%`,
                            background: 'rgba(236,72,153,0.8)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '1rem',
                  padding: '1.1rem',
                  background: 'rgba(34,197,94,0.15)',
                  color: '#bbf7d0',
                  fontSize: '0.9rem',
                }}
              >
                You’ve unlocked every badge available. Keep delivering stellar sessions to maintain your top placement.
              </div>
            )}

            <div
              style={{
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: '1rem',
                background: 'rgba(15,23,42,0.45)',
                padding: '1.2rem',
                display: 'grid',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.05rem' }}>Public trust messaging</span>
                <button
                  type="button"
                  onClick={handleSaveTrustSettings}
                  disabled={savingTrustSettings}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #DC2626, #EC4899)',
                    color: '#1a1a1a',
                    fontWeight: 600,
                    cursor: savingTrustSettings ? 'wait' : 'pointer',
                    opacity: savingTrustSettings ? 0.8 : 1,
                  }}
                >
                  {savingTrustSettings ? <Loader2 size={16} className="animate-spin" /> : null}
                  Save trust settings
                </button>
              </div>

              {trustFeedback.error && (
                <div
                  style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(239,68,68,0.35)',
                    background: 'rgba(239,68,68,0.12)',
                    color: '#fca5a5',
                    padding: '0.85rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {trustFeedback.error}
                </div>
              )}

              {trustFeedback.success && (
                <div
                  style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'rgba(34,197,94,0.15)',
                    color: '#bbf7d0',
                    padding: '0.85rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {trustFeedback.success}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.9rem',
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'rgba(30,41,59,0.6)',
                }}
              >
                <input
                  type="checkbox"
                  checked={trustSettings.showPaymentProtection}
                  onChange={(event) => handleTrustSettingChange('showPaymentProtection', event.target.checked)}
                  style={{ width: '1.05rem', height: '1.05rem', marginTop: '0.3rem' }}
                />
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Payment protection banner</span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                    Display SoundBridge escrow messaging on your public profile to reassure clients that their funds are safe.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.9rem',
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'rgba(30,41,59,0.6)',
                }}
              >
                <input
                  type="checkbox"
                  checked={trustSettings.firstBookingDiscountEnabled}
                  disabled={!!discountDisabled}
                  onChange={(event) => handleTrustSettingChange('firstBookingDiscountEnabled', event.target.checked)}
                  style={{ width: '1.05rem', height: '1.05rem', marginTop: '0.3rem' }}
                />
                <div style={{ display: 'grid', gap: '0.4rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>First booking special</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Discount</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={5}
                        value={trustSettings.firstBookingDiscountPercent}
                        onChange={(event) => handleTrustPercentChange(event.target.value)}
                        disabled={!!discountDisabled || !trustSettings.firstBookingDiscountEnabled}
                        style={{
                          width: '72px',
                          padding: '0.45rem 0.5rem',
                          borderRadius: '0.6rem',
                          border: '1px solid rgba(148,163,184,0.35)',
                          background: 'rgba(15,23,42,0.6)',
                          color: '#f8fafc',
                          fontWeight: 600,
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>%</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                    Offer a limited-time discount on your first booking to convert interested clients faster.
                  </p>
                  {discountDisabled && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5' }}>
                      You’ve already completed your first booking, so the promo is no longer available.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {badgeInsights.history.length > 0 && (
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Recent badge milestones
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  {badgeInsights.history.map((entry) => {
                    const previousLabel =
                      entry.previousTier &&
                      badgeInsights.badges.find((badge) => badge.tier === entry.previousTier)?.label;
                    const newLabel =
                      badgeInsights.badges.find((badge) => badge.tier === entry.newTier)?.label ?? entry.newTier;
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          fontSize: '0.85rem',
                          color: '#cbd5f5',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          {new Date(entry.createdAt).toLocaleDateString()} ·{' '}
                          {previousLabel ? `${previousLabel} → ${newLabel}` : newLabel}
                        </span>
                        {entry.reason && <span style={{ color: '#94a3b8' }}>{entry.reason}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Badge insights will appear once bookings start to complete.
          </div>
        )}
      </SectionCard>
    );
  };

  const renderVerificationSection = () => {
    const derivedStatus = verificationStatus?.verificationStatus ?? profileData?.verification_status ?? 'not_requested';
    const meta = verificationStatusMeta[derivedStatus];
    const prerequisites = verificationStatus?.prerequisites ?? null;
    const unmetPrerequisites =
      verificationStatus?.prerequisites
        ? verificationPrerequisiteEntries.filter(({ id }) => !verificationStatus.prerequisites[id].met)
        : [];
    const canSubmit =
      verificationStatus &&
      verificationStatus.verificationStatus !== 'pending' &&
      verificationStatus.verificationStatus !== 'approved' &&
      Object.values(verificationStatus.prerequisites).every((item) => item.met);

    return (
      <SectionCard
        title="Verification"
        action={
          <HelperPill tone={meta.tone}>
            {derivedStatus === 'approved' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            {meta.label}
          </HelperPill>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{meta.description}</p>

        {verificationError && (
          <div
            style={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(248,113,113,0.35)',
              background: 'rgba(248,113,113,0.12)',
              color: '#fecaca',
              padding: '0.85rem',
              fontSize: '0.85rem',
            }}
          >
            {verificationError}
          </div>
        )}

        {verificationSuccess && (
          <div
            style={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(34,197,94,0.35)',
              background: 'rgba(34,197,94,0.15)',
              color: '#bbf7d0',
              padding: '0.85rem',
              fontSize: '0.85rem',
            }}
          >
            {verificationSuccess}
          </div>
        )}

        {loadingVerification ? (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
          >
            <Loader2 size={16} className="animate-spin" /> Checking verification status…
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '1rem',
                border: '1px solid rgba(148,163,184,0.25)',
                background: 'rgba(15,23,42,0.45)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>
                <ListChecks size={16} /> Requirements
              </div>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {verificationPrerequisiteEntries.map(({ id, label }) => {
                  const requirement = prerequisites ? prerequisites[id] : null;
                  const satisfied = requirement?.met ?? false;
                  const value = requirement?.value ?? null;
                  const required = requirement?.required ?? null;
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(148,163,184,0.18)',
                        background: 'rgba(15,23,42,0.35)',
                        color: satisfied ? '#bbf7d0' : '#fca5a5',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {satisfied ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                        {label}
                      </span>
                      <span style={{ color: satisfied ? '#bbf7d0' : '#fda4af' }}>
                        {value !== null && value !== undefined ? value : satisfied ? 'OK' : required ?? ''}
                        {required && typeof required === 'number' ? ` / ${required}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {verificationStatus?.latestRequest && (
              <div
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  padding: '1rem',
                  borderRadius: '1rem',
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'rgba(15,23,42,0.35)',
                  color: '#cbd5f5',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem' }}>Last submission</div>
                <div>Submitted {new Date(verificationStatus.latestRequest.submitted_at).toLocaleString()}</div>
                {verificationStatus.latestRequest.reviewer_notes && (
                  <div style={{ color: '#fca5a5' }}>
                    Admin feedback: {verificationStatus.latestRequest.reviewer_notes}
                  </div>
                )}
                {verificationStatus.latestRequest.provider_notes && (
                  <div style={{ color: '#94a3b8' }}>
                    Your notes: {verificationStatus.latestRequest.provider_notes}
                  </div>
                )}
                {verificationStatus.latestRequest.documents.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    Supporting documents:
                    {verificationStatus.latestRequest.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.storage_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {doc.doc_type.replace('_', ' ')}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {verificationStatus ? (
              <>
                <form onSubmit={handleSubmitVerification} style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <label style={{ display: 'grid', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Government ID (storage path)</span>
                      <input
                        value={verificationForm.governmentIdUrl}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, governmentIdUrl: event.target.value }))}
                        placeholder="supabase://storage/public/providers/uid/id-front.jpg"
                        required
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Selfie with ID</span>
                      <input
                        value={verificationForm.selfieUrl}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, selfieUrl: event.target.value }))}
                        placeholder="supabase://storage/public/providers/uid/id-selfie.jpg"
                        required
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Optional business document
                      </span>
                      <input
                        value={verificationForm.businessDocUrl}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, businessDocUrl: event.target.value }))}
                        placeholder="Insurance, licence or credential (optional)"
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </label>
                  </div>

                  <label style={{ display: 'grid', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Notes for review (optional)</span>
                    <textarea
                      value={verificationForm.notes}
                      onChange={(event) => setVerificationForm((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={3}
                      placeholder="Add context that helps the review team (eg. links to past work or credentials)"
                      style={{
                        resize: 'vertical',
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-primary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      disabled={!canSubmit || submittingVerification}
                      style={{
                        padding: '0.75rem 1.4rem',
                        borderRadius: '0.9rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: !canSubmit || submittingVerification ? 'not-allowed' : 'pointer',
                        opacity: !canSubmit || submittingVerification ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {submittingVerification ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      {submittingVerification ? 'Submitting…' : 'Request verification'}
                    </button>
                    {!canSubmit && (
                      <span style={{ fontSize: '0.8rem', color: '#fda4af' }}>
                        Complete all prerequisites to enable the verification request.
                      </span>
                    )}
                  </div>
                </form>

                {unmetPrerequisites.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                    Outstanding: {unmetPrerequisites.map((entry) => entry.label).join(', ')}.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Create your service provider profile and publish your first offering to unlock verification.
              </div>
            )}
          </>
        )}
      </SectionCard>
    );
  };

  const renderProfileSection = () => {
    const statusMeta = statusPill[profileDraft.status];
    const verificationState = verificationStatus?.verificationStatus ?? profileData?.verification_status ?? 'not_requested';
    const verificationMeta = verificationStatusMeta[verificationState];
    return (
      <SectionCard
        title="Service Provider Profile"
        action={
          profileData && (
            <HelperPill tone={verificationMeta.tone}>
              {verificationState === 'approved' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {verificationMeta.label}
            </HelperPill>
          )
        }
      >
        {!profileData && (
          <div
            style={{
              background: 'rgba(148,163,184,0.15)',
              border: '1px dashed rgba(148,163,184,0.35)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            You haven’t set up a service provider profile yet. Fill in the details below and click{' '}
            <strong>Create service provider profile</strong> to unlock bookings, offerings, and portfolio tools.
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Display name</span>
            <input
              value={profileDraft.displayName}
              onChange={(event) => setProfileDraft((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="e.g. Soundwave Studios"
              style={{
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Headline</span>
            <input
              value={profileDraft.headline}
              onChange={(event) => setProfileDraft((prev) => ({ ...prev, headline: event.target.value }))}
              placeholder="Short elevator pitch"
              style={{
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Bio</span>
          <textarea
            value={profileDraft.bio}
            onChange={(event) => setProfileDraft((prev) => ({ ...prev, bio: event.target.value }))}
            rows={4}
            placeholder="Tell creators and organizers what makes your services special."
            style={{
              resize: 'vertical',
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Default rate</span>
            <input
              value={profileDraft.defaultRate}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d*(\.\d{0,2})?$/.test(value) || value === '') {
                  setProfileDraft((prev) => ({ ...prev, defaultRate: value }));
                }
              }}
              placeholder="e.g. 150.00"
              style={{
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Currency</span>
            <select
              value={profileDraft.rateCurrency}
              onChange={(event) => setProfileDraft((prev) => ({ ...prev, rateCurrency: event.target.value }))}
              style={{
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
            <select
              value={profileDraft.status}
              onChange={(event) => setProfileDraft((prev) => ({ ...prev, status: event.target.value as ProviderStatus }))}
              style={{
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SERVICE_CATEGORIES.map((category) => {
            const isSelected = profileDraft.categories.includes(category);
            return (
              <button
                key={category}
                onClick={() =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    categories: isSelected
                      ? prev.categories.filter((item) => item !== category)
                      : [...prev.categories, category],
                  }))
                }
                type="button"
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: isSelected ? 'rgba(220, 38, 38, 0.6)' : 'var(--border-primary)',
                  color: isSelected ? '#fef2f2' : 'var(--text-secondary)',
                  background: isSelected ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {category.replace('_', ' ')}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleCreateOrUpdateProfile}
            disabled={savingProfile || profileDraft.displayName.trim().length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
              border: 'none',
              borderRadius: '0.75rem',
              color: 'white',
              fontWeight: 600,
              opacity: savingProfile ? 0.8 : 1,
              cursor: savingProfile ? 'wait' : 'pointer',
            }}
          >
            {savingProfile ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                {profileData ? 'Save changes' : 'Create service provider profile'}
              </>
            )}
          </button>

          {profileData && (
            <HelperPill>
              <span>Status:</span>
              <span
                style={{
                  background: statusMeta.bg,
                  color: statusMeta.text,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                }}
              >
                {statusMeta.label}
              </span>
            </HelperPill>
          )}
        </div>
      </SectionCard>
    );
  };

  const renderOfferingsSection = () => (
    <SectionCard
      title="Service Offerings"
      action={
        <HelperPill tone="warning">
          <Layers size={14} /> Tip: active offerings appear on your public profile.
        </HelperPill>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</span>
          <input
            value={offeringDraft.title}
            onChange={(event) => setOfferingDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="e.g. Full mix & master"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</span>
          <select
            value={offeringDraft.category}
            onChange={(event) => setOfferingDraft((prev) => ({ ...prev, category: event.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              textTransform: 'capitalize',
            }}
          >
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rate amount</span>
          <input
            value={offeringDraft.rateAmount}
            onChange={(event) => {
              const value = event.target.value;
              if (/^\d*(\.\d{0,2})?$/.test(value) || value === '') {
                setOfferingDraft((prev) => ({ ...prev, rateAmount: value }));
              }
            }}
            placeholder="e.g. 120.00"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rate currency</span>
          <select
            value={offeringDraft.rateCurrency}
            onChange={(event) => setOfferingDraft((prev) => ({ ...prev, rateCurrency: event.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rate unit</span>
          <input
            value={offeringDraft.rateUnit}
            onChange={(event) => setOfferingDraft((prev) => ({ ...prev, rateUnit: event.target.value }))}
            placeholder="hour, session, project…"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
      </div>

      <textarea
        value={offeringDraft.description}
        onChange={(event) => setOfferingDraft((prev) => ({ ...prev, description: event.target.value }))}
        rows={3}
        placeholder="Describe what clients receive (deliverables, revisions, timeline, etc.)"
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '0.75rem',
          borderRadius: '0.6rem',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleAddOffering}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.6rem 1.1rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add offering
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={offeringDraft.isActive}
            onChange={(event) => setOfferingDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Active by default
        </label>
      </div>

      {offerings && offerings.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {offerings.map((offering) => (
            <div
              key={offering.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border-primary)',
                padding: '1rem',
                background: 'var(--bg-primary)',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{offering.title}</h4>
                    {offering.is_active && (
                      <HelperPill tone="success">
                        <CheckCircle size={12} /> Active
                      </HelperPill>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {offering.category.replace('_', ' ')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleOffering(offering.id, !offering.is_active)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.6rem',
                      background: offering.is_active ? 'rgba(220,38,38,0.12)' : 'rgba(34,197,94,0.15)',
                      color: offering.is_active ? '#fca5a5' : '#34d399',
                      border: 'none',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {offering.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDeleteOffering(offering.id)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(248,113,113,0.15)',
                      color: '#f87171',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {offering.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{offering.description}</p>
              )}

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>
                  Rate:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {offering.rate_amount !== null ? `${offering.rate_currency ?? ''} ${offering.rate_amount}` : 'Custom'}
                  </strong>{' '}
                  per {offering.rate_unit}
                </span>
                <span>Created {new Date(offering.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          You haven’t added any offerings yet. Use the form above to outline your services.
        </div>
      )}
    </SectionCard>
  );

  const renderPortfolioSection = () => (
    <SectionCard
      title="Portfolio"
      action={
        <HelperPill>
          <Upload size={14} /> Showcase past projects and deliverables.
        </HelperPill>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Media URL</span>
          <input
            value={portfolioDraft.mediaUrl}
            onChange={(event) => setPortfolioDraft((prev) => ({ ...prev, mediaUrl: event.target.value }))}
            placeholder="https://…"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Thumbnail URL</span>
          <input
            value={portfolioDraft.thumbnailUrl}
            onChange={(event) => setPortfolioDraft((prev) => ({ ...prev, thumbnailUrl: event.target.value }))}
            placeholder="Optional"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Caption</span>
          <input
            value={portfolioDraft.caption}
            onChange={(event) => setPortfolioDraft((prev) => ({ ...prev, caption: event.target.value }))}
            placeholder="Description or client name"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Display order</span>
          <input
            value={portfolioDraft.displayOrder}
            onChange={(event) => {
              const value = event.target.value;
              if (/^\d*$/.test(value)) {
                setPortfolioDraft((prev) => ({ ...prev, displayOrder: value }));
              }
            }}
            placeholder="Optional"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
      </div>

      <button
        onClick={handleAddPortfolio}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.6rem 1.1rem',
          borderRadius: '0.75rem',
          border: 'none',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={16} /> Add portfolio item
      </button>

      {portfolioItems && portfolioItems.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginTop: '1rem',
          }}
        >
          {portfolioItems.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.caption ?? 'Portfolio thumbnail'}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    height: '180px',
                    background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Briefcase size={28} />
                </div>
              )}

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.caption || 'Portfolio item'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.7rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={14} /> Preview
                  </Link>

                  <button
                    onClick={() => handleDeletePortfolio(item.id)}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(248,113,113,0.15)',
                      color: '#f87171',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          No portfolio items yet. Add renders, mixing samples, or behind-the-scenes media to boost trust.
        </div>
      )}
    </SectionCard>
  );

  const renderAvailabilitySection = () => (
    <SectionCard
      title="Availability"
      action={
        <HelperPill>
          <Clock size={14} /> Control when clients can request sessions.
        </HelperPill>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start time</span>
          <input
            type="datetime-local"
            value={availabilityDraft.startTime}
            onChange={(event) => setAvailabilityDraft((prev) => ({ ...prev, startTime: event.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End time</span>
          <input
            type="datetime-local"
            value={availabilityDraft.endTime}
            onChange={(event) => setAvailabilityDraft((prev) => ({ ...prev, endTime: event.target.value }))}
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recurrence rule</span>
          <input
            value={availabilityDraft.recurrenceRule}
            onChange={(event) => setAvailabilityDraft((prev) => ({ ...prev, recurrenceRule: event.target.value }))}
            placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={availabilityDraft.isRecurring}
            onChange={(event) => setAvailabilityDraft((prev) => ({ ...prev, isRecurring: event.target.checked }))}
          />
          Recurring slot
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={availabilityDraft.isBookable}
            onChange={(event) => setAvailabilityDraft((prev) => ({ ...prev, isBookable: event.target.checked }))}
          />
          Clients can book this slot
        </label>

        <button
          onClick={handleAddAvailability}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.6rem 1.1rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add slot
        </button>
      </div>

      {availability && availability.length > 0 ? (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          {availability.map((slot) => (
            <div
              key={slot.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                padding: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {new Date(slot.start_time).toLocaleString()} → {new Date(slot.end_time).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem' }}>
                  <span>{slot.is_bookable ? 'Bookable' : 'Unavailable'}</span>
                  {slot.is_recurring && <span>Recurring</span>}
                  {slot.recurrence_rule && <span>{slot.recurrence_rule}</span>}
                </div>
              </div>

              <button
                onClick={() => handleDeleteAvailability(slot.id)}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(248,113,113,0.15)',
                  color: '#f87171',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          You haven’t added any availability slots yet. Add recurring or one-off availability to accept bookings.
        </div>
      )}
    </SectionCard>
  );

  const renderReviewsSection = () => (
    <SectionCard
      title="Reviews"
      action={
        profileData ? (
          <HelperPill>
            <Star size={14} style={{ color: '#facc15' }} />
            <span>
              {profileData.average_rating ? profileData.average_rating.toFixed(1) : '—'} · {profileData.review_count}{' '}
              {profileData.review_count === 1 ? 'review' : 'reviews'}
            </span>
          </HelperPill>
        ) : null
      }
    >
      {reviews && reviews.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                padding: '1rem',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(250, 204, 21, 0.18)',
                    color: '#fde68a',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  <Star size={14} /> {review.rating}
                </div>
                <HelperPill tone={review.status === 'published' ? 'success' : review.status === 'pending' ? 'warning' : 'default'}>
                  {review.status.replace('_', ' ')}
                </HelperPill>
              </div>

              {review.title && (
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{review.title}</h4>
              )}
              {review.comment && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{review.comment}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>By {review.reviewer?.display_name || review.reviewer?.username || 'Anonymous'}</span>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          No reviews yet. Encourage clients to leave feedback after successful collaborations.
        </div>
      )}
    </SectionCard>
  );

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2 size={24} className="animate-spin" />
        Loading service provider data…
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error && (
        <div
          style={{
            borderRadius: '0.75rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '1rem',
            color: '#fca5a5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ShieldAlert size={18} />
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
            }}
          >
            <RefreshCcw size={14} /> Try again
          </button>
        </div>
      )}

      {renderBadgesSection()}
      {renderVerificationSection()}
      {renderProfileSection()}
      {renderBookingsSection()}
      {renderOfferingsSection()}
      {renderPortfolioSection()}
      {renderAvailabilitySection()}
      {renderReviewsSection()}
    </div>
  );
};

export default ServiceProviderDashboard;



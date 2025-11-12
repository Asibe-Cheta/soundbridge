import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Briefcase, CheckCircle2, Clock, Layers, Shield, Sparkles, Star } from 'lucide-react';

import BookProviderDialog from '@/src/components/bookings/BookProviderDialog';
import { PortfolioItem } from '@/src/components/service-provider/PortfolioItem';
import { createServiceClient } from '@/src/lib/supabase';
import type { ServiceProviderSummary } from '@/src/lib/types/search';
import type { ProviderBadgeTier } from '@/src/lib/types';

interface ServiceProviderPageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type ProviderRecord = ServiceProviderSummary & {
  offerings: Array<{
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
  portfolio: Array<{
    id: string;
    media_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    display_order: number | null;
    created_at: string;
  }>;
  availability: Array<{
    id: string;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    recurrence_rule: string | null;
    is_bookable: boolean;
    created_at: string;
    updated_at: string;
  }>;
  reviews: Array<{
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
  badge_tier: ProviderBadgeTier;
  badge_updated_at: string;
  completed_booking_count: number;
  show_payment_protection: boolean;
  first_booking_discount_enabled: boolean;
  first_booking_discount_percent: number;
  id_verified: boolean;
};

const BADGE_COPY: Record<ProviderBadgeTier, { label: string; blurb: string }> = {
  new_provider: {
    label: 'New Provider',
    blurb: 'New to SoundBridge and ready to collaborate. Secure an experience to help them build momentum.',
  },
  rising_star: {
    label: 'Rising Star',
    blurb: 'Consistently delivering great sessions with enthusiastic reviews.',
  },
  established: {
    label: 'Established',
    blurb: 'A proven provider with a reliable track record of completed bookings.',
  },
  top_rated: {
    label: 'Top Rated',
    blurb: 'One of SoundBridge’s most acclaimed providers with outstanding client feedback.',
  },
};

const PAYMENT_PROTECTION_POINTS = [
  'Money held securely until the session is completed',
  'Full refund if the provider doesn’t show up',
  'Rate your experience after the booking',
];

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (amount === null || amount === undefined) return 'Custom pricing';
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
};

const formatDateTimeRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })} – ${endDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const fetchProvider = async (userId: string) => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('service_provider_profiles')
    .select(
      `
        *,
        offerings:service_offerings(*),
        portfolio:service_portfolio_items(*),
        availability:service_provider_availability(*),
        reviews:service_reviews(
          id,
          provider_id,
          reviewer_id,
          rating,
          title,
          comment,
          booking_reference,
          status,
          created_at,
          updated_at,
          reviewer:profiles!service_reviews_reviewer_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          )
        )
      `,
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Failed to load service provider profile:', error);
    return null;
  }

  if (!data || data.status !== 'active') {
    return null;
  }

  const provider: ProviderRecord = {
    user_id: data.user_id,
    display_name: data.display_name,
    headline: data.headline,
    bio: data.bio,
    categories: data.categories || [],
    default_rate: data.default_rate,
    rate_currency: data.rate_currency,
    average_rating: data.average_rating ?? 0,
    review_count: data.review_count ?? 0,
    status: data.status,
    is_verified: data.is_verified,
    badge_tier: (data.badge_tier ?? 'new_provider') as ProviderBadgeTier,
    badge_updated_at: data.badge_updated_at ?? data.updated_at,
    completed_booking_count: data.completed_booking_count ?? 0,
    show_payment_protection: data.show_payment_protection ?? true,
    first_booking_discount_enabled: data.first_booking_discount_enabled ?? false,
    first_booking_discount_percent: Number(data.first_booking_discount_percent ?? 0),
    id_verified: data.id_verified ?? false,
    created_at: data.created_at,
    updated_at: data.updated_at,
    offerings: (data.offerings as ProviderRecord['offerings']) || [],
    portfolio: (data.portfolio as ProviderRecord['portfolio']) || [],
    availability: (data.availability as ProviderRecord['availability']) || [],
    reviews: ((data.reviews as ProviderRecord['reviews']) || []).filter((review) => review.status === 'published'),
  };

  return provider;
};

export default async function ServiceProviderPage({ params }: ServiceProviderPageProps) {
  const { userId } = await params;
  const provider = await fetchProvider(userId);

  if (!provider) {
    notFound();
  }

  const hasPortfolio = provider.portfolio.length > 0;
  const hasOfferings = provider.offerings.length > 0;
  const hasAvailability = provider.availability.length > 0;
  const hasReviews = provider.reviews.length > 0;

  const activeOfferings = provider.offerings.filter((offering) => offering.is_active);
  const badgeInfo = BADGE_COPY[provider.badge_tier] ?? BADGE_COPY.new_provider;
  const showTrustCard = provider.show_payment_protection || provider.first_booking_discount_enabled;
  const discountPercent = provider.first_booking_discount_percent;
  const discountLabel = Number.isInteger(discountPercent)
    ? discountPercent.toString()
    : discountPercent.toFixed(1);

  return (
    <main
      className="main-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <Link
          href="/discover?tab=services"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            color: '#fca5a5',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Services
        </Link>

        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '1.5rem',
            padding: '2rem',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                color: 'white',
              }}
            >
              <Briefcase size={28} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', margin: 0 }}>{provider.display_name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, rgba(220,38,38,0.9), rgba(236,72,153,0.9))',
                    color: '#fefefe',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Sparkles size={14} /> {badgeInfo.label}
                </span>
                {provider.is_verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(34,197,94,0.18)',
                      color: '#34d399',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} /> Verified
                  </span>
                )}
                {provider.id_verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(96,165,250,0.18)',
                      color: '#93c5fd',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <Shield size={14} /> ID Verified
                  </span>
                )}
              </div>
              {provider.headline && (
                <p style={{ color: '#f3f4f6', fontSize: '1rem', margin: 0 }}>{provider.headline}</p>
              )}
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>{badgeInfo.blurb}</p>
            </div>
          </div>

          {provider.categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {provider.categories.map((category) => (
                <span
                  key={category}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                    letterSpacing: '0.03em',
                  }}
                >
                  <Layers size={12} />
                  {category.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.9rem',
              color: '#cbd5f5',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={16} style={{ color: '#facc15' }} />
              {provider.review_count > 0
                ? `${provider.average_rating.toFixed(1)} · ${provider.review_count} ${
                    provider.review_count === 1 ? 'review' : 'reviews'
                  }`
                : 'Awaiting reviews'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: '#34d399' }} />
              {provider.completed_booking_count} completed booking
              {provider.completed_booking_count === 1 ? '' : 's'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} style={{ color: '#fca5a5' }} />
              {formatRelativeDate(provider.updated_at)}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Briefcase size={16} style={{ color: '#38bdf8' }} />
              Established {new Date(provider.created_at).getFullYear()}
            </span>
          </div>

          {provider.bio && (
            <p style={{ color: '#d1d5db', lineHeight: 1.7, fontSize: '1rem', margin: 0 }}>{provider.bio}</p>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <BookProviderDialog
              providerId={provider.user_id}
              providerName={provider.display_name}
              defaultCurrency={provider.rate_currency}
              offerings={provider.offerings}
              availability={provider.availability}
            />
            <Link
              href="/discover?tab=services"
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '0.9rem',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Explore more services
            </Link>
          </div>
        </header>

        {showTrustCard && (
          <section
            style={{
              display: 'grid',
              gap: '1.1rem',
              borderRadius: '1.5rem',
              border: '1px solid rgba(220,38,38,0.25)',
              background: 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(236,72,153,0.1))',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#DC2626', fontWeight: 700, fontSize: '1.05rem' }}>
              <Shield size={22} /> Your payment is protected
            </div>
            <p style={{ margin: 0, color: '#1a1a1a', fontSize: '0.95rem' }}>
              SoundBridge keeps every booking secure from request to payout.
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.45rem' }}>
              {PAYMENT_PROTECTION_POINTS.map((point) => (
                <li
                  key={point}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#1a1a1a', fontSize: '0.95rem' }}
                >
                  <span
                    style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      marginTop: '0.4rem',
                      borderRadius: '999px',
                      background: '#DC2626',
                      flexShrink: 0,
                    }}
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {provider.first_booking_discount_enabled && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '999px',
                  background: 'rgba(220,38,38,0.18)',
                  color: '#DC2626',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  width: 'fit-content',
                }}
              >
                <Sparkles size={16} /> First booking special – {discountLabel}% off
              </div>
            )}
          </section>
        )}
      </div>

      <section
        style={{
          display: 'grid',
          gap: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            display: 'grid',
            gap: '1.25rem',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: 0 }}>Services</h2>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              {activeOfferings.length} active offering{activeOfferings.length === 1 ? '' : 's'}
            </span>
          </div>
          {hasOfferings ? (
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              {activeOfferings.map((offering) => (
                <div
                  key={offering.id}
                  style={{
                    borderRadius: '1rem',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '1.1rem',
                    display: 'grid',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>{offering.title}</h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#f97316',
                        }}
                      >
                        {formatCurrency(offering.rate_amount, offering.rate_currency)} / {offering.rate_unit}
                      </span>
                    </div>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', textTransform: 'capitalize', color: '#fda4af' }}>
                      {offering.category.replace('_', ' ')}
                    </p>
                  </div>
                  {offering.description && (
                    <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
                      {offering.description.length > 180
                        ? `${offering.description.slice(0, 177)}…`
                        : offering.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>This provider is setting up their offerings.</p>
          )}
        </div>

        <div
          className="card"
          style={{
            display: 'grid',
            gap: '1.25rem',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: 0 }}>Portfolio</h2>
            {hasPortfolio && (
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                {provider.portfolio.length} item{provider.portfolio.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {hasPortfolio ? (
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              {provider.portfolio.map((item) => (
                <PortfolioItem
                  key={item.id}
                  item={item}
                  formatRelativeDate={formatRelativeDate}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>This provider will share examples of their work soon.</p>
          )}
        </div>

        <div
          className="card"
          style={{
            display: 'grid',
            gap: '1.25rem',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: 0 }}>Availability</h2>
            {hasAvailability && (
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                {provider.availability.length} slot{provider.availability.length === 1 ? '' : 's'} published
              </span>
            )}
          </div>
          {hasAvailability ? (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {provider.availability
                .sort(
                  (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
                )
                .slice(0, 6)
                .map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: '0.9rem',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-secondary)',
                      padding: '0.9rem 1.1rem',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>
                        {formatDateTimeRange(slot.start_time, slot.end_time)}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {slot.is_recurring ? 'Repeats weekly' : 'One-off availability'}
                        {slot.recurrence_rule ? ` · ${slot.recurrence_rule}` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: slot.is_bookable ? '#34d399' : '#f87171',
                      }}
                    >
                      {slot.is_bookable ? 'Open for booking' : 'Not bookable'}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Availability calendar coming soon — use the booking button to request a custom time.
            </p>
          )}
        </div>

        <div
          className="card"
          style={{
            display: 'grid',
            gap: '1.25rem',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: 0 }}>Reviews</h2>
            {hasReviews && (
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                {provider.review_count} review{provider.review_count === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {hasReviews ? (
            <div
              style={{
                display: 'grid',
                gap: '1rem',
              }}
            >
              {provider.reviews.slice(0, 4).map((review) => (
                <div
                  key={review.id}
                  style={{
                    borderRadius: '1rem',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '1.1rem',
                    display: 'grid',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {review.reviewer?.avatar_url ? (
                      <Image
                        src={review.reviewer.avatar_url}
                        alt={review.reviewer.display_name || review.reviewer.username || 'Reviewer'}
                        width={40}
                        height={40}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(236,72,153,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f472b6',
                          fontWeight: 600,
                        }}
                      >
                        {(review.reviewer?.display_name || review.reviewer?.username || 'User').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>
                        {review.reviewer?.display_name || review.reviewer?.username || 'Anonymous'}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{formatRelativeDate(review.created_at)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#facc15' }}>
                      <Star size={16} /> {review.rating}
                    </div>
                  </div>
                  {review.title && (
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>{review.title}</h3>
                  )}
                  {review.comment && (
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#d1d5db', margin: 0 }}>{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Reviews will appear here once clients start sharing their feedback.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}


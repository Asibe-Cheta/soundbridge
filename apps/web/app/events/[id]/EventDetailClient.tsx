'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { EventTicketPurchaseModal } from '../../../src/components/events/EventTicketPurchaseModal';
import { EventBookmarkButton } from '../../../src/components/events/EventBookmarkButton';
import { EventShareButton } from '../../../src/components/events/EventShareButton';
import { EventAnalyticsPanel } from '../../../src/components/events/EventAnalyticsPanel';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useSubscription } from '../../../src/hooks/useSubscription';
import { eventService } from '../../../src/lib/event-service';
import { trackEventPageView } from '../../../src/lib/event-analytics-client';
import { recordEventView } from '../../../src/lib/user-behaviour-service';
import { createClient } from '../../../src/lib/supabase-browser';
import type { Event } from '../../../src/lib/types/event';
import { MapPin, Calendar, Users, Clock, Star, Heart, Share2, ArrowLeft, CheckCircle, AlertCircle, User, Music, DollarSign, Info, Loader2 } from 'lucide-react';

// Read-only display, reusing the same milestone thresholds the real reminder system
// already defines (apps/web/app/api/cron/process-pending-notifications/route.ts's
// buildEventReminderContent: two_weeks/one_week/48_hours/24_hours/event_day) as the
// source of truth for what counts as a countdown milestone — not new notification
// infrastructure, since this never sends anything, just reads the event's own date.
function getEventCountdownLabel(eventDate: string): string | null {
  const diffMs = new Date(eventDate).getTime() - Date.now();
  if (diffMs <= 0) return null; // event has already started/passed

  const hours = diffMs / (1000 * 60 * 60);
  const days = Math.ceil(hours / 24);

  if (hours <= 24) return 'Starts today';
  if (hours <= 48) return 'Starts tomorrow';
  if (days <= 7) return `${days} days until this event`;
  if (days <= 14) return `${Math.ceil(days / 7)} weeks until this event`;
  return `${days} days until this event`;
}

type TierPriceInfo = { standardPrice: number | null; effectivePrice: number | null; discountActive: boolean; soldOut: boolean; remaining: number | null };
type EventTicketTier = {
  id: string;
  name: string;
  description: string | null;
  gbp: TierPriceInfo;
  ngn: TierPriceInfo;
  ghs: TierPriceInfo;
};

/** First currency this tier actually has a price in, formatted with its symbol. */
function formatTierPrice(tier: EventTicketTier): string {
  const bySymbol: Array<[keyof Pick<EventTicketTier, 'gbp' | 'ngn' | 'ghs'>, string]> = [
    ['gbp', '£'],
    ['ngn', '₦'],
    ['ghs', '₵'],
  ];
  for (const [key, symbol] of bySymbol) {
    const info = tier[key];
    if (info?.standardPrice != null) {
      const price = info.effectivePrice ?? info.standardPrice;
      return `${symbol}${Number(price).toFixed(2)}`;
    }
  }
  return 'Price TBA';
}

export function EventDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const { data: subscriptionData } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTiers, setTicketTiers] = useState<EventTicketTier[]>([]);
  const resolvedParams = use(params);
  const subscriptionTier = subscriptionData?.subscription?.tier ?? 'free';

  useEffect(() => {
    if (!resolvedParams.id) return;
    trackEventPageView(resolvedParams.id, searchParams.get('ref'));
  }, [resolvedParams.id, searchParams]);

  // Note: Navigation and authentication are handled by the layout Header component

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await eventService.getEventById(resolvedParams.id);

        if (result.error) {
          setError(typeof result.error === 'string' ? result.error : 'Failed to load event');
          return;
        }

        if (!result.data) {
          setError('Event not found');
          return;
        }

        setEvent(result.data);
        setIsRSVPed(result.data.isAttending || false);
      } catch (err) {
        setError('Failed to load event');
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [resolvedParams.id]);

  // Ticket tiers are already public/no-auth (GET /api/events/[id]/ticket-tiers) — an empty
  // array just means this event uses its own flat price_gbp/price_ngn/price_ghs instead,
  // which the existing price display below already handles unchanged.
  useEffect(() => {
    if (!resolvedParams.id) return;
    fetch(`/api/events/${resolvedParams.id}/ticket-tiers`)
      .then((res) => (res.ok ? res.json() : { tiers: [] }))
      .then((json) => setTicketTiers(Array.isArray(json.tiers) ? json.tiers : []))
      .catch(() => setTicketTiers([]));
  }, [resolvedParams.id]);

  useEffect(() => {
    if (!user?.id || !event?.id) return;
    const supabase = createClient();
    void recordEventView(supabase, user.id, event.id, event.city || event.location);
  }, [user?.id, event?.id, event?.city, event?.location]);

  const handleRSVP = async () => {
    // Login-gating for a logged-out visitor happens at the call site
    // (saveIntentAndGoToLogin) — this guard is just defensive.
    if (!user || !event) return;

    try {
      setRsvpLoading(true);
      const status = isRSVPed ? 'not_going' : 'attending';
      const result = await eventService.rsvpToEvent(event.id, status);

      if (result.success) {
        setIsRSVPed(!isRSVPed);
        // Update the event data
        setEvent(prev => prev ? {
          ...prev,
          isAttending: !isRSVPed,
          attendeeCount: isRSVPed ? (prev.attendeeCount || 1) - 1 : (prev.attendeeCount || 0) + 1
        } : null);
      } else {
        console.error('RSVP failed:', result.error);
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  // Saves what a logged-out visitor was trying to do, then sends them to login. Uses
  // localStorage (not sessionStorage) because it needs to survive not just this tab but a
  // same-browser round trip through email verification (the existing signup flow already
  // relies on localStorage for exactly that reason — see 'signup_email'/'signup_profile_data'
  // in the signup page). Consumed by the effect below the moment `user` becomes truthy.
  const saveIntentAndGoToLogin = (action: 'rsvp' | 'buy_ticket') => {
    try {
      localStorage.setItem(
        'pending_event_action',
        JSON.stringify({ action, eventId: resolvedParams.id, ts: Date.now() }),
      );
    } catch {
      /* localStorage unavailable (private browsing etc.) — login still works, just won't auto-resume */
    }
    router.push(`/login?redirectTo=${encodeURIComponent(`/events/${resolvedParams.id}`)}`);
  };

  // Resumes a saved intent the moment the visitor is authenticated — completes the RSVP
  // immediately, or opens the ticket modal, rather than leaving them on a generic page after
  // login. Ignores anything older than 30 minutes or for a different event (e.g. they opened
  // a second event's link in the same browser before finishing login on the first).
  useEffect(() => {
    if (!user?.id || !event?.id) return;
    let pending: { action: 'rsvp' | 'buy_ticket'; eventId: string; ts: number } | null = null;
    try {
      const raw = localStorage.getItem('pending_event_action');
      pending = raw ? JSON.parse(raw) : null;
    } catch {
      pending = null;
    }
    if (!pending || pending.eventId !== event.id || Date.now() - pending.ts > 30 * 60 * 1000) return;

    try {
      localStorage.removeItem('pending_event_action');
    } catch {
      /* ignore */
    }

    if (pending.action === 'rsvp') {
      void handleRSVP();
    } else if (pending.action === 'buy_ticket') {
      setShowTicketModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, event?.id]);

  const handleTicketPurchaseSuccess = (ticketData: any) => {
    console.log('Ticket purchased successfully:', ticketData);
    // Optionally refresh event data or show success message
    setShowTicketModal(false);
    // You could also show a success notification here
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'location', label: 'Location', icon: MapPin }
  ];

  const renderTabContent = () => {
    if (!event) return null;

    switch (activeTab) {
      case 'details':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Description</h3>
            <div style={{ lineHeight: '1.6', color: '#ccc', marginBottom: '2rem' }}>
              {event.description ? (
                event.description.split('\n').map((paragraph, index) => (
                  <p key={index} style={{ marginBottom: '1rem' }}>{paragraph}</p>
                ))
              ) : (
                <p>No description available for this event.</p>
              )}
            </div>

            <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Music size={16} style={{ color: '#EC4899' }} />
                <span>{event.category}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Users size={16} style={{ color: '#EC4899' }} />
                <span>{event.attendeeCount || 0} attending</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <DollarSign size={16} style={{ color: '#EC4899' }} />
                <span>{event.formattedPrice}</span>
              </div>
              {event.max_attendees && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                  <Users size={16} style={{ color: '#EC4899' }} />
                  <span>Max {event.max_attendees} attendees</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Schedule</h3>
            <div style={{ color: '#ccc' }}>
              <p>Event starts at {new Date(event.event_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p>Please arrive 15-30 minutes before the event starts.</p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Location</h3>
            <div style={{ color: '#ccc', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{event.venue || event.location}</p>
              <p>{event.location}</p>
            </div>
            {event.latitude && event.longitude ? (
              <div style={{
                width: '100%',
                height: '200px',
                background: '#333',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                Map placeholder - Coordinates: {event.latitude}, {event.longitude}
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '200px',
                background: '#333',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                Map not available
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <main className="main-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#EC4899' }} />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="main-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Event Not Found</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>{error || 'The event you are looking for does not exist.'}</p>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Back to Events</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Main Content */}
      <main className="main-container">
        {/* Back Button */}
        <section className="section">
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} />
              Back to Events
            </button>
          </Link>
        </section>

        {/* Event Header */}
        <section className="hero-section">
          <div
            className="featured-creator"
            style={{
              // .featured-creator's own CSS sets a random stock-photo background — this
              // overrides it with the event's real flyer/image (falling back to a plain
              // gradient when the event has none), and gives it a real minimum height so
              // the photo is actually visible once .hero-section drops to `height: auto`
              // on mobile instead of collapsing to just the text's height. A dark gradient
              // is layered on top of the photo itself (not just relying on the shared
              // .featured-creator::before fade) since event flyers are often busy, bright
              // designs that already have their own title text baked in — title/date/
              // buttons need to stay readable against any flyer, not just plain photos.
              backgroundImage: event.image_url
                ? `linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.55) 40%, rgba(0, 0, 0, 0.85) 100%), url(${event.image_url})`
                : 'linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(236, 72, 153, 0.6))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '320px',
            }}
          >
            <div className="featured-creator-content">
              {event.isFeatured && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '15px',
                  fontWeight: '600'
                }}>
                  Featured Event
                </div>
              )}
              <h1 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>{event.title}</h1>
              <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                {event.creator?.display_name || 'Unknown Creator'}
              </p>
              {/* flexWrap so this reflows to multiple lines on narrow screens instead of
                  overflowing the card and getting cut off (e.g. the attending count) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem 1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} />
                  <span>{event.formattedDate}</span>
                </div>
                {getEventCountdownLabel(event.event_date) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      background: 'rgba(236, 72, 153, 0.15)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      color: '#EC4899',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    {getEventCountdownLabel(event.event_date)}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} />
                  <span>{event.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} />
                  <span>{(event.attendeeCount || 0).toLocaleString()} attending</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Buy Ticket / RSVP are visible to every visitor, logged in or not — viewing
                    never requires login, only completing the action does. A logged-out tap
                    saves the intent (saveIntentAndGoToLogin) and sends them to login; the
                    pending-intent effect above resumes it the moment they're authenticated. */}
                {event && ((event.price_gbp && event.price_gbp > 0) || (event.price_ngn && event.price_ngn > 0) || (event.price_ghs && event.price_ghs > 0)) ? (
                  <button
                    className="btn-primary"
                    onClick={() => (user ? setShowTicketModal(true) : saveIntentAndGoToLogin('buy_ticket'))}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EC4899' }}
                  >
                    <DollarSign size={16} />
                    Buy Ticket
                  </button>
                ) : (
                  /* RSVP button for free events */
                  <button
                    className={isRSVPed ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => (user ? handleRSVP() : saveIntentAndGoToLogin('rsvp'))}
                    disabled={rsvpLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {rsvpLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isRSVPed ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Calendar size={16} />
                    )}
                    {isRSVPed ? 'Cancel RSVP' : 'RSVP Now'}
                  </button>
                )}
                <EventBookmarkButton eventId={event.id} />
                <EventShareButton
                  eventId={event.id}
                  eventTitle={event.title}
                  eventDate={event.event_date}
                  eventLocation={event.location}
                  variant="button"
                />
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Event Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ticketTiers.length > 0 ? (
                <div>
                  <span style={{ display: 'block', marginBottom: '0.5rem' }}>Ticket Tiers</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ticketTiers.map((tier) => {
                      const soldOut = tier.gbp?.soldOut || tier.ngn?.soldOut || tier.ghs?.soldOut;
                      return (
                        <div
                          key={tier.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            opacity: soldOut ? 0.6 : 1,
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tier.name}
                            {soldOut ? ' (Sold Out)' : ''}
                          </span>
                          <span style={{ color: '#EC4899', fontWeight: '600', flexShrink: 0 }}>{formatTierPrice(tier)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Price</span>
                  <span style={{ color: '#EC4899', fontWeight: '600' }}>{event.formattedPrice}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Genre</span>
                <span>{event.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rating</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={14} style={{ color: '#FFD700' }} />
                  {event.rating?.toFixed(1) || '4.5'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capacity</span>
                <span>{(event.attendeeCount || 0).toLocaleString()}/{event.max_attendees?.toLocaleString() || '∞'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="section">
          <div className="tab-navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </section>

        {/* Creator analytics */}
        {user && event.creator_id === user.id && (
          <section className="section">
            <div className="card">
              <EventAnalyticsPanel eventId={event.id} tier={subscriptionTier} />
            </div>
          </section>
        )}

        {/* Organizer Info */}
        <section className="section">
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Organizer</h3>
            {event.creator ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Link href={`/creator/${event.creator.username}`} style={{ flexShrink: 0 }}>
                  {event.creator.avatar_url ? (
                    <img
                      src={event.creator.avatar_url}
                      alt={event.creator.display_name}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#333' }}></div>
                  )}
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/creator/${event.creator.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.creator.display_name}</h4>
                  </Link>
                  <p style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                    {event.creator.bio || 'Event organizer'}
                  </p>
                  {event.creator.location && (
                    <p style={{ color: '#999', marginBottom: '0.5rem' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {event.creator.location}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/creator/${event.creator.username}`} style={{ textDecoration: 'none' }}>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                        <User size={12} />
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#ccc' }}>Organizer information not available.</p>
            )}
          </div>
        </section>

        <Footer />
      </main>

      {/* Ticket Purchase Modal */}
      {event && (
        <EventTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={event}
          onSuccess={handleTicketPurchaseSuccess}
        />
      )}
    </>
  );
} 
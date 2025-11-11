import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle2, DoorClosed, Home, MapPin, Users, Wrench } from 'lucide-react';

import { createServiceClient } from '@/src/lib/supabase';

interface VenueRecord {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  capacity: number | null;
  amenities: string[] | null;
  status: 'draft' | 'pending_review' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

const formatAddress = (address: VenueRecord['address']) => {
  if (!address) return 'Location coming soon';
  const parts = [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(', ');
  return parts || 'Location coming soon';
};

const fetchVenue = async (id: string) => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to load venue:', error);
    return null;
  }

  if (!data || data.status !== 'active') {
    return null;
  }

  const venue: VenueRecord = {
    id: data.id,
    owner_id: data.owner_id,
    name: data.name,
    description: data.description,
    address: data.address,
    capacity: data.capacity,
    amenities: data.amenities,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return venue;
};

interface VenuePageProps {
  params: Promise<{ id: string }>;
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { id } = await params;

  const venue = await fetchVenue(id);

  if (!venue) {
    notFound();
  }

  const hasAmenities = venue.amenities && venue.amenities.length > 0;

  return (
    <main
      className="main-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <Link
          href="/discover?tab=venues"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            color: '#fca5a5',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Venues
        </Link>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
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
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Home size={32} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '2.1rem', fontWeight: 700, color: 'white', margin: 0 }}>{venue.name}</h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(59,130,246,0.18)',
                    color: '#93c5fd',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <p
                style={{
                  color: '#e2e8f0',
                  fontSize: '1rem',
                  margin: 0,
                }}
              >
                {formatAddress(venue.address)}
              </p>
            </div>
          </div>

          {venue.description && (
            <p
              style={{
                color: '#d1d5db',
                lineHeight: 1.7,
                fontSize: '1rem',
                margin: 0,
              }}
            >
              {venue.description}
            </p>
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
              <Users size={16} style={{ color: '#38bdf8' }} />
              {venue.capacity ? `${venue.capacity.toLocaleString()} capacity` : 'Capacity TBC'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} style={{ color: '#f97316' }} />
              Added {new Date(venue.created_at).toLocaleDateString()}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <DoorClosed size={16} style={{ color: '#fca5a5' }} />
              Available for bookings
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/events/create"
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '0.9rem',
                background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                color: 'white',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Calendar size={16} /> Request booking
            </Link>
            <Link
              href="/discover?tab=venues"
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '0.9rem',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Browse other venues
            </Link>
          </div>
        </div>
      </header>

      <section
        className="card"
        style={{
          padding: '1.75rem',
          display: 'grid',
          gap: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: 0 }}>Venue Details</h2>

        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <div
            style={{
              borderRadius: '1rem',
              border: '1px solid var(--border-primary)',
              background: 'rgba(37, 99, 235, 0.08)',
              padding: '1.1rem',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase' }}>Capacity</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
              {venue.capacity ? `${venue.capacity.toLocaleString()} guests` : 'To be confirmed'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#bfdbfe' }}>Ideal for concerts, showcases, and community events.</span>
          </div>

          <div
            style={{
              borderRadius: '1rem',
              border: '1px solid var(--border-primary)',
              background: 'rgba(14, 165, 233, 0.08)',
              padding: '1.1rem',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 600, textTransform: 'uppercase' }}>Location</span>
            <span style={{ fontSize: '1rem', color: 'white' }}>{formatAddress(venue.address)}</span>
            <span style={{ fontSize: '0.8rem', color: '#bae6fd' }}>
              <MapPin size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              Perfectly situated for artists and organizers.
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: '1rem',
            border: '1px solid var(--border-primary)',
            background: 'rgba(34, 197, 94, 0.08)',
            padding: '1.2rem',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#bbf7d0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wrench size={16} /> Amenities
          </h3>
          {hasAmenities ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.75rem' }}>
              {venue.amenities!.map((amenity) => (
                <span
                  key={amenity}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(34,197,94,0.35)',
                    color: '#bbf7d0',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                  }}
                >
                  {amenity.replace('_', ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: '#bbf7d0', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              Amenity list coming soon—contact the venue to request technical specifications.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}


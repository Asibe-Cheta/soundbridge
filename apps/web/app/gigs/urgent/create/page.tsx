'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { createUrgentGig } from '@/src/services/urgentGigService';
import { geocodeAddress } from '@/src/lib/geocoding';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const SKILLS = [
  'Trumpeter', 'Vocalist', 'Drummer', 'DJ', 'Sound Engineer', 'Pianist', 'Guitarist', 'Bassist',
  'Violinist', 'Saxophonist', 'Vocal Coach', 'Music Producer', 'Choir Director', 'Percussionist',
  'Backing Singer', 'MC/Host', 'Other',
];

const GENRES = [
  'Gospel', 'Jazz', 'R&B', 'Classical', 'Afrobeats', 'Hip-Hop', 'Pop', 'Rock', 'Soul',
  'Country', 'Worship', 'Latin', 'Electronic', 'Other',
];

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN'];

function PaymentStep({
  clientSecret,
  gigId,
  onSuccess,
}: {
  clientSecret: string;
  gigId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/gigs/urgent/create?step=3&gig_id=${gigId}`,
      },
    });
    if (err) {
      setError(err.message || 'Payment failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? 'Processing...' : 'Confirm & Pay'}
      </Button>
    </form>
  );
}

function CreateUrgentGigPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const urlStep = searchParams.get('step');
  const urlGigId = searchParams.get('gig_id');

  const [step, setStep] = useState(1);
  const [skillRequired, setSkillRequired] = useState('');
  const [genre, setGenre] = useState<string[]>([]);
  const [dateNeeded, setDateNeeded] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationRadiusKm, setLocationRadiusKm] = useState(20);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('GBP');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [gigId, setGigId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ status: string }[]>([]);

  useEffect(() => {
    if (urlStep === '3' && urlGigId) {
      setStep(3);
      setGigId(urlGigId);
    }
  }, [urlStep, urlGigId]);

  useEffect(() => {
    if (!user) return;
    if (step !== 1) return;
    const oneHour = new Date(Date.now() + 60 * 60 * 1000);
    oneHour.setMinutes(0);
    const defaultDate = oneHour.toISOString().slice(0, 16);
    if (!dateNeeded) setDateNeeded(defaultDate);
  }, [user, step, dateNeeded]);

  const validStep1 =
    skillRequired &&
    dateNeeded &&
    new Date(dateNeeded).getTime() >= Date.now() + 60 * 60 * 1000 &&
    locationLat != null &&
    locationLng != null &&
    Number(paymentAmount) > 0;

  const handleLocationBlur = async () => {
    const addr = locationAddress.trim();
    if (!addr) return;
    const result = await geocodeAddress(addr);
    if (result.success) {
      setLocationLat(result.latitude);
      setLocationLng(result.longitude);
    }
  };

  const toggleGenre = (g: string) => {
    setGenre((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const handleConfirmPay = async () => {
    if (!validStep1) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createUrgentGig({
        skill_required: skillRequired,
        date_needed: new Date(dateNeeded).toISOString(),
        payment_amount: Number(paymentAmount),
        location_lat: locationLat!,
        location_lng: locationLng!,
        genre: genre.length ? genre : undefined,
        duration_hours: durationHours,
        location_address: locationAddress.trim() || undefined,
        location_radius_km: locationRadiusKm,
        payment_currency: paymentCurrency,
        description: description.slice(0, 500) || undefined,
      });
      setGigId(result.gig_id);
      setClientSecret(result.stripe_client_secret || null);
      if (result.stripe_client_secret) {
        setStep(2);
      } else {
        setStep(3);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create gig');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Please sign in to post a gig.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link href="/gigs/new" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className={step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
          {step > 1 ? '✓' : '●'} 1
        </span>
        <span className="text-muted-foreground">—</span>
        <span className={step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
          {step > 2 ? '✓' : '●'} 2
        </span>
        <span className="text-muted-foreground">—</span>
        <span className={step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
          ● 3
        </span>
      </div>

      {step === 1 && (
        <>
          <h1 className="text-xl font-semibold mb-4">Gig details</h1>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Skill needed</label>
              <select
                value={skillRequired}
                onChange={(e) => setSkillRequired(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Genre (optional)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      genre.includes(g) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Date & time</label>
              <input
                type="datetime-local"
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
                min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (hours)</label>
              <input
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
              <span className="text-xs text-muted-foreground">{durationHours} hours</span>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                placeholder="Address or area"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                onBlur={handleLocationBlur}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Search radius (km)</label>
              <div className="flex gap-2 mt-1">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLocationRadiusKm(r)}
                    className={`px-2 py-1 rounded text-sm ${locationRadiusKm === r ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium">Payment amount</label>
                <Input
                  type="number"
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-24">
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={paymentCurrency}
                  onChange={(e) => setPaymentCurrency(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional, max 500)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                className="w-full mt-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">{description.length}/500</p>
            </div>
            <Button onClick={() => setStep(2)} disabled={!validStep1} className="w-full">
              Continue →
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-xl font-semibold mb-4">Payment</h1>
          <Card variant="glass" className="mb-4">
            <CardContent className="pt-4">
              <p className="font-medium">{skillRequired} — {new Date(dateNeeded).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
              <p className="text-sm text-muted-foreground">
                {genre.slice(0, 3).join(' · ') || '—'} · {durationHours}h · {locationAddress || 'Location'} ({locationRadiusKm}km)
              </p>
              <p className="font-semibold mt-2">{paymentCurrency} {paymentAmount}</p>
              <p className="text-xs text-muted-foreground mt-2">
                This amount will be held in escrow until the service is confirmed complete.
              </p>
              <p className="text-xs mt-1">Platform fee (12%): {paymentCurrency} {(Number(paymentAmount) * 0.12).toFixed(2)}</p>
            </CardContent>
          </Card>
          {!clientSecret && (
            <>
              {createError && <p className="text-destructive text-sm mb-4">{createError}</p>}
              <Button onClick={handleConfirmPay} disabled={creating} className="w-full mb-4">
                {creating ? 'Creating...' : 'Confirm & Pay →'}
              </Button>
            </>
          )}
          {clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <PaymentStep
                clientSecret={clientSecret}
                gigId={gigId!}
                onSuccess={() => setStep(3)}
              />
            </Elements>
          )}
        </>
      )}

      {step === 3 && gigId && (
        <>
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <h2 className="text-lg font-semibold mb-1">Finding the best {skillRequired.toLowerCase()}s near you...</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Accepting responses now — usually fills in minutes.
            </p>
            <Button asChild className="w-full max-w-xs">
              <Link href={`/gigs/${gigId}/responses`}>View Responses →</Link>
            </Button>
            <Link href="/feed" className="text-sm text-muted-foreground mt-4 hover:underline">Back to feed</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function CreateUrgentGigPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateUrgentGigPageContent />
    </Suspense>
  );
}

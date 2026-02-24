'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { getMyAvailability, updateAvailability, updateLocation } from '@/src/services/availabilityService';
import { geocodeAddress } from '@/src/lib/geocoding';
import type {
  UserAvailability,
  AvailabilitySchedule,
  DayAvailability,
} from '@/src/lib/types/user-availability.types';

const RADIUS_OPTIONS = [5, 10, 20, 50, 100] as const;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DEFAULT_DAY: DayAvailability = { available: false };
const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_DAY },
  sunday: { ...DEFAULT_DAY },
};

function normalizeSchedule(schedule: AvailabilitySchedule | null): AvailabilitySchedule {
  if (!schedule || typeof schedule !== 'object') return { ...DEFAULT_SCHEDULE };
  const out = { ...DEFAULT_SCHEDULE };
  for (const day of DAYS) {
    const d = schedule[day];
    if (d && typeof d === 'object') {
      out[day] = {
        available: !!d.available,
        hours: d.hours ?? undefined,
      };
    }
  }
  return out;
}

export default function ProviderAvailabilityPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [availableForUrgentGigs, setAvailableForUrgentGigs] = useState(false);
  const [locationMode, setLocationMode] = useState<'gps' | 'area'>('area');
  const [generalArea, setGeneralArea] = useState('');
  const [currentLat, setCurrentLat] = useState<number | undefined>();
  const [currentLng, setCurrentLng] = useState<number | undefined>();
  const [generalAreaLat, setGeneralAreaLat] = useState<number | undefined>();
  const [generalAreaLng, setGeneralAreaLng] = useState<number | undefined>();
  const [maxRadiusKm, setMaxRadiusKm] = useState(20);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [perGigRate, setPerGigRate] = useState<string>('');
  const [rateNegotiable, setRateNegotiable] = useState(false);
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(() => ({ ...DEFAULT_SCHEDULE }));
  const [maxNotificationsPerDay, setMaxNotificationsPerDay] = useState(5);
  const [dndStart, setDndStart] = useState('');
  const [dndEnd, setDndEnd] = useState('');
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setError(null);
      try {
        const data = await getMyAvailability();
        setAvailableForUrgentGigs(data.available_for_urgent_gigs);
        const hasGps = data.current_lat != null && data.current_lng != null;
        const hasArea = (data.general_area_lat != null && data.general_area_lng != null) || (data.general_area && data.general_area.trim());
        setLocationMode(hasGps && !hasArea ? 'gps' : 'area');
        setGeneralArea(data.general_area ?? '');
        setCurrentLat(data.current_lat);
        setCurrentLng(data.current_lng);
        setGeneralAreaLat(data.general_area_lat);
        setGeneralAreaLng(data.general_area_lng);
        setMaxRadiusKm(data.max_radius_km ?? 20);
        setHourlyRate(data.hourly_rate != null ? String(data.hourly_rate) : '');
        setPerGigRate(data.per_gig_rate != null ? String(data.per_gig_rate) : '');
        setRateNegotiable(data.rate_negotiable ?? false);
        setSchedule(normalizeSchedule(data.availability_schedule));
        setMaxNotificationsPerDay(data.max_notifications_per_day ?? 5);
        setDndStart(data.dnd_start ?? '');
        setDndEnd(data.dnd_end ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (availableForUrgentGigs && locationMode === 'gps') {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          try {
            await updateLocation(lat, lng);
          } catch {}
        },
        () => {}
      );
    }
  }, [availableForUrgentGigs, locationMode]);

  const handleGeocode = async () => {
    const area = generalArea.trim();
    if (!area) return;
    setGeocodeError(null);
    const result = await geocodeAddress(area);
    if (result.success) {
      setGeneralAreaLat(result.latitude);
      setGeneralAreaLng(result.longitude);
    } else {
      setGeocodeError(result.error ?? 'Could not find location');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const payload: Partial<UserAvailability> = {
        available_for_urgent_gigs: availableForUrgentGigs,
        max_radius_km: maxRadiusKm,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        per_gig_rate: perGigRate ? parseFloat(perGigRate) : undefined,
        rate_negotiable: rateNegotiable,
        availability_schedule: schedule,
        max_notifications_per_day: maxNotificationsPerDay,
        dnd_start: dndStart || undefined,
        dnd_end: dndEnd || undefined,
      };
      if (locationMode === 'gps') {
        payload.current_lat = currentLat;
        payload.current_lng = currentLng;
        payload.general_area = undefined;
        payload.general_area_lat = undefined;
        payload.general_area_lng = undefined;
      } else {
        payload.general_area = generalArea.trim() || undefined;
        payload.general_area_lat = generalAreaLat;
        payload.general_area_lng = generalAreaLng;
        payload.current_lat = undefined;
        payload.current_lng = undefined;
      }
      await updateAvailability(payload);
      setToast('Availability saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: (typeof DAYS)[number], patch: Partial<DayAvailability>) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Settings
      </Link>

      <h1 className="text-2xl font-semibold mb-2">Urgent Gig Availability</h1>
      <p className="text-sm text-muted-foreground mb-6">
        When on, you&apos;ll receive real-time notifications for last-minute gigs near you.
      </p>

      {/* Section A — Master toggle */}
      <Card variant="glass" size="sm" className="mb-6">
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Available for Urgent Gigs</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={availableForUrgentGigs}
            onClick={() => setAvailableForUrgentGigs((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              availableForUrgentGigs ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                availableForUrgentGigs ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {!availableForUrgentGigs && (
        <p className="text-sm text-muted-foreground mb-6">
          Turn on the toggle above to set your location, radius, rates, and schedule.
        </p>
      )}

      {availableForUrgentGigs && (
        <>
          {/* Section B — Location mode */}
          <Card variant="glass" size="default" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === 'gps'}
                    onChange={() => setLocationMode('gps')}
                  />
                  Use my current location (GPS)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === 'area'}
                    onChange={() => setLocationMode('area')}
                  />
                  Use a general area
                </label>
              </div>
              {locationMode === 'area' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="City or area name"
                      value={generalArea}
                      onChange={(e) => setGeneralArea(e.target.value)}
                      onBlur={handleGeocode}
                      onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationMode('gps')}
                    >
                      Use my location instead
                    </Button>
                  </div>
                  {geocodeError && <p className="text-xs text-destructive">{geocodeError}</p>}
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll geocode the area on blur or when you click the button.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C — Travel radius */}
          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">How far will you travel?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setMaxRadiusKm(km)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      maxRadiusKm === km
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section D — Rates */}
          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Your rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Hourly rate (£)</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Per gig rate (£)</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={perGigRate}
                  onChange={(e) => setPerGigRate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rateNegotiable}
                  onChange={(e) => setRateNegotiable(e.target.checked)}
                />
                <span className="text-sm">Rates are negotiable</span>
              </label>
            </CardContent>
          </Card>

          {/* Section E — Weekly schedule */}
          <Card variant="glass" size="default" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Weekly availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS.map((day) => (
                <div key={day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium">{day}</span>
                    <button
                      type="button"
                      role="switch"
                      onClick={() =>
                        updateDay(day, {
                          available: !schedule[day].available,
                          hours: schedule[day].available ? schedule[day].hours : 'all_day',
                        })
                      }
                      className={`w-10 h-5 rounded-full transition-colors ${
                        schedule[day].available ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                          schedule[day].available ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {schedule[day].available && (
                    <div className="flex items-center gap-4 pl-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${day}-hours`}
                          checked={schedule[day].hours === 'all_day'}
                          onChange={() => updateDay(day, { hours: 'all_day' })}
                        />
                        <span className="text-sm">All day</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${day}-hours`}
                          checked={schedule[day].hours !== 'all_day' && !!schedule[day].hours}
                          onChange={() => updateDay(day, { hours: '09:00-17:00' })}
                        />
                        <span className="text-sm">Specific hours:</span>
                      </label>
                      {schedule[day].hours && schedule[day].hours !== 'all_day' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={schedule[day].hours?.split('-')[0] ?? '09:00'}
                            onChange={(e) => {
                              const to = schedule[day].hours?.split('-')[1] ?? '17:00';
                              updateDay(day, { hours: `${e.target.value}-${to}` });
                            }}
                            className="rounded border border-input bg-background px-2 py-1 text-sm"
                          />
                          <span className="text-sm">to</span>
                          <input
                            type="time"
                            value={schedule[day].hours?.split('-')[1] ?? '17:00'}
                            onChange={(e) => {
                              const from = schedule[day].hours?.split('-')[0] ?? '09:00';
                              updateDay(day, { hours: `${from}-${e.target.value}` });
                            }}
                            className="rounded border border-input bg-background px-2 py-1 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section F — Notification limit */}
          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Max urgent gig notifications per day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMaxNotificationsPerDay((n) => Math.max(1, n - 1))}
                  className="w-9 h-9 rounded-full border border-input flex items-center justify-center font-medium"
                >
                  −
                </button>
                <span className="text-lg font-medium w-8 text-center">{maxNotificationsPerDay}</span>
                <button
                  type="button"
                  onClick={() => setMaxNotificationsPerDay((n) => Math.min(10, n + 1))}
                  className="w-9 h-9 rounded-full border border-input flex items-center justify-center font-medium"
                >
                  +
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Section G — DND */}
          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Do not disturb</CardTitle>
              <p className="text-xs text-muted-foreground">Times are in your local timezone.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">From</span>
                <input
                  type="time"
                  value={dndStart}
                  onChange={(e) => setDndStart(e.target.value)}
                  className="rounded border border-input bg-background px-2 py-1.5 text-sm"
                />
                <span className="text-sm">To</span>
                <input
                  type="time"
                  value={dndEnd}
                  onChange={(e) => setDndEnd(e.target.value)}
                  className="rounded border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}
      {toast && <p className="text-green-600 dark:text-green-400 text-sm mb-4">{toast}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Availability Settings'}
      </Button>
    </div>
  );
}

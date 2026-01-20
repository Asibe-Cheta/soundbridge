'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Globe, Lock, Users, Send, Clock, Save, MapPin, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useSubscription } from '../../../src/hooks/useSubscription';
import { eventService } from '../../../src/lib/event-service';
import type { EventCreateData, EventCategory } from '../../../src/lib/types/event';
import { useImageUpload } from '../../../src/hooks/useImageUpload';
import { useLocation } from '../../../src/hooks/useLocation';
import { ImageUpload } from '../../../src/components/ui/ImageUpload';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { COUNTRY_ADDRESS_CONFIGS, DEFAULT_CONFIG, getCountryConfig, extractCityFromAddressFields } from '../../../src/config/countryAddressConfigs';
import { geocodeAddress, buildAddressString } from '../../../src/lib/geocoding';

export default function CreateEventPage() {
  const { user } = useAuth();
  const { data: subscriptionData, refresh: refreshSubscription } = useSubscription();
  const [imageState, imageActions] = useImageUpload();
  const { location, isLoading: locationLoading, error: locationError, detectLocation } = useLocation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  // Location states (country-based address fields)
  const [selectedCountry, setSelectedCountry] = useState<string>('GB'); // Default to UK
  const [addressFields, setAddressFields] = useState<Record<string, string>>({});
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const subscriptionTier = subscriptionData?.subscription?.tier || 'free';
  const subscriptionStatus = subscriptionData?.subscription?.status || 'active';
  const canHostPaidEvents =
    ['premium', 'unlimited'].includes(subscriptionTier) && subscriptionStatus === 'active';
  const paidPriceValue = parseFloat(price.replace(/[£₦$€₹¥R$]/g, ''));
  const isPaidEvent = Number.isFinite(paidPriceValue) && paidPriceValue > 0;

  // Type adapter for ImageUpload component
  const adaptUploadFile = (file: any) => {
    if (!file) return null;
    return {
      ...file,
      metadata: file.metadata as Record<string, unknown>
    };
  };

  const genres = [
    'Gospel', 'Christian', 'Afrobeat', 'Hip-Hop', 'Jazz', 'Classical', 
    'Rock', 'Pop', 'Carnival', 'Secular', 'Other'
  ];

  // Get selected country config
  const selectedCountryConfig = getCountryConfig(selectedCountry) || DEFAULT_CONFIG;

  // Auto-set country based on detected location
  useEffect(() => {
    if (location && location.isDetected) {
      // Auto-select country based on detected country code
      if (location.countryCode === 'GB' || location.countryCode === 'UK') {
        setSelectedCountry('GB');
      } else if (location.countryCode === 'NG') {
        setSelectedCountry('NG');
      } else if (location.countryCode === 'US') {
        setSelectedCountry('US');
      } else if (location.countryCode === 'CA') {
        setSelectedCountry('CA');
      } else if (location.countryCode === 'AU') {
        setSelectedCountry('AU');
      }
      // Reset address fields when country changes
      setAddressFields({});
      setLatitude(null);
      setLongitude(null);
    }
  }, [location]);

  // Reset address fields when country changes
  useEffect(() => {
    setAddressFields({});
    setLatitude(null);
    setLongitude(null);
    setGeocodeError(null);
  }, [selectedCountry]);

  useEffect(() => {
    if (!user?.id) return;

    const handleFocus = () => {
      refreshSubscription();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, refreshSubscription]);

  // Auto-upload image when imageFile is set
  useEffect(() => {
    if (imageState.imageFile && !imageState.uploadedUrl && !imageState.isUploading) {
      console.log('🖼️ useEffect: Image file detected, starting upload...');
      const uploadImage = async () => {
        const result = await imageActions.uploadEventImage();
        console.log('🖼️ useEffect: Upload result:', result);
        if (result) {
          console.log('🖼️ useEffect: Image uploaded successfully!');
        } else {
          console.log('🖼️ useEffect: Image upload failed!');
        }
      };
      uploadImage();
    }
  }, [imageState.imageFile, imageState.uploadedUrl, imageState.isUploading, imageActions]);



  const handleAddressFieldChange = (fieldName: string, value: string) => {
    setAddressFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear coordinates when address changes
    if (latitude !== null || longitude !== null) {
      setLatitude(null);
      setLongitude(null);
    }
    setGeocodeError(null);
  };

  const handleGeocode = async () => {
    const addressParts = Object.entries(addressFields)
      .filter(([_, value]) => value && value.trim())
      .map(([_, value]) => value.trim());

    if (addressParts.length === 0) {
      setGeocodeError('Please enter address details first');
      return;
    }

    const fullAddress = buildAddressString(addressFields, selectedCountryConfig.countryName);

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocodeAddress(fullAddress);
      
      if (result.success) {
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setGeocodeError(null);
      } else {
        setGeocodeError(result.error || 'Failed to get coordinates');
        setLatitude(null);
        setLongitude(null);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Failed to geocode address. You can still create the event.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('Event title is required');
      return false;
    }
    if (!description.trim()) {
      setError('Event description is required');
      return false;
    }
    if (!genre) {
      setError('Please select a genre');
      return false;
    }
    if (!date) {
      setError('Event date is required');
      return false;
    }
    if (!time) {
      setError('Event time is required');
      return false;
    }
    
    // Validate address fields - check required fields
    const requiredFields = selectedCountryConfig.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!addressFields[field.name] || !addressFields[field.name].trim()) {
        setError(`${field.label} is required`);
        return false;
      }
    }

    // Validate that we have either city or coordinates
    const city = extractCityFromAddressFields(addressFields);
    if (!city && !latitude) {
      setError('Either city or coordinates are required for notifications. Please fill in address fields and click "Get Coordinates".');
      return false;
    }

    return true;
  };

  const handlePublish = async () => {
    if (!user) {
      setError('Please log in to create events');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);

      if (isPaidEvent && !canHostPaidEvents) {
        setError('Premium or Unlimited subscription required for paid events.');
        setPublishStatus('error');
        setIsPublishing(false);
        return;
      }

      // Combine date and time
      const eventDateTime = new Date(`${date}T${time}`);

      // Extract city from address fields (REQUIRED for notifications)
      const city = extractCityFromAddressFields(addressFields);
      
      // Build location string from address fields
      const locationParts = Object.entries(addressFields)
        .filter(([_, value]) => value && value.trim())
        .map(([_, value]) => value.trim());
      const locationString = locationParts.join(', ');

      // Parse price based on selected country currency
      let priceGbp = null;
      let priceNgn = null;
      let priceUsd = null;
      let priceEur = null;
      
      if (price && price !== '0') {
        const numericPrice = parseFloat(price.replace(/[£₦$€₹¥R$]/g, ''));
        
        if (selectedCountryConfig.currency === 'GBP') {
          priceGbp = numericPrice;
        } else if (selectedCountryConfig.currency === 'NGN') {
          priceNgn = numericPrice;
        } else if (selectedCountryConfig.currency === 'USD') {
          priceUsd = numericPrice;
        } else if (selectedCountryConfig.currency === 'EUR') {
          priceEur = numericPrice;
        }
      }

      console.log('📅 Creating event with data:', {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDateTime.toISOString(),
        location: locationString,
        city: city.trim(),
        country: selectedCountry,
        latitude,
        longitude,
        category: genre as EventCategory,
        price_gbp: priceGbp || undefined,
        price_ngn: priceNgn || undefined,
        price_usd: priceUsd || undefined,
        price_eur: priceEur || undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        image_url: imageState.uploadedUrl || undefined,
        address_data: {
          country: selectedCountry,
          fields: addressFields
        }
      });

      const eventData: EventCreateData = {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDateTime.toISOString(),
        location: locationString,
        city: city.trim(), // REQUIRED for notifications
        country: selectedCountry,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        category: genre as EventCategory,
        price_gbp: priceGbp || undefined,
        price_ngn: priceNgn || undefined,
        price_usd: priceUsd || undefined,
        price_eur: priceEur || undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        image_url: imageState.uploadedUrl || undefined,
        address_data: {
          country: selectedCountry,
          fields: addressFields
        }
      };

      const result = await eventService.createEvent(eventData);

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create event');
        setPublishStatus('error');
      } else {
        setPublishStatus('success');
        // Reset form
        setTitle('');
        setDescription('');
        setGenre('');
        setDate('');
        setTime('');
        setSelectedCountry('GB');
        setAddressFields({});
        setLatitude(null);
        setLongitude(null);
        setPrice('');
        setMaxAttendees('');
        setGeocodeError(null);
        imageActions.resetUpload();
      }
    } catch (error) {
      console.error('Event creation error:', error);
      setError('Failed to create event');
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    // TODO: Implement draft saving
    console.log('Saving draft...');
  };

  const formatPrice = (value: string) => {
    if (!location) return value;
    
    // Remove any existing currency symbols
    const numericValue = value.replace(/[£₦$€]/g, '');
    
    if (numericValue === '') return '';
    
    // Add the detected currency symbol
    return `${location.currencySymbol}${numericValue}`;
  };

  const handlePriceChange = (value: string) => {
    // Remove any existing currency symbols and set the raw numeric value
    const numericValue = value.replace(/[£₦$€]/g, '');
    setPrice(numericValue);
  };

  return (
    <>
      {/* Main Content */}
      <main className="main-container">
        {/* Back to Events */}
        <div style={{ padding: '2rem 2rem 0' }}>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Events
            </button>
          </Link>
        </div>

        {/* Create Event Form */}
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              Create New Event
            </h1>
            <p style={{ color: '#ccc', fontSize: '1.1rem' }}>
              Share your music event with the world
            </p>
          </div>

          {/* Location Detection Status */}
          {location && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={20} color="#EC4899" />
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>
                    {location.isDetected ? `Detected: ${location.country}` : 'Location not detected'}
                  </div>
                  {location.city && (
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                      {location.city}, {location.region}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>
                  Currency: {location.currencySymbol} ({location.currency})
                </span>
                <button
                  onClick={detectLocation}
                  disabled={locationLoading}
                  style={{
                    background: 'rgba(236, 72, 153, 0.2)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: locationLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RefreshCw size={16} color="#EC4899" className={locationLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {locationError && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#FCD34D',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              Location detection failed. Using default currency (£).
            </div>
          )}

          {/* Form */}
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Basic Information */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Basic Information
              </h3>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter event title"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your event..."
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Genre *
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select genre</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Date & Time
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Time *
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Location - Country-based Address Fields */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Event Location
              </h3>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Country Selector */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Country *
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  >
                    {COUNTRY_ADDRESS_CONFIGS.map((config) => (
                      <option key={config.countryCode} value={config.countryCode}>
                        {config.countryName} ({config.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Address Fields */}
                {selectedCountryConfig.fields.map((field) => (
                  <div key={field.name}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      {field.label} {field.required && '*'}
                    </label>
                    <input
                      type="text"
                      value={addressFields[field.name] || ''}
                      onChange={(e) => handleAddressFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                ))}

                {/* Geocode Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={isGeocoding || Object.keys(addressFields).length === 0}
                    style={{
                      width: '100%',
                      background: isGeocoding || Object.keys(addressFields).length === 0
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: isGeocoding || Object.keys(addressFields).length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: isGeocoding || Object.keys(addressFields).length === 0 ? 0.5 : 1
                    }}
                  >
                    {isGeocoding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Getting Coordinates...
                      </>
                    ) : (
                      <>
                        <MapPin size={16} />
                        Get Coordinates
                      </>
                    )}
                  </button>
                  
                  {geocodeError && (
                    <div style={{
                      marginTop: '0.5rem',
                      color: '#FCA5A5',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={14} />
                      {geocodeError}
                    </div>
                  )}

                  {latitude && longitude && (
                    <div style={{
                      marginTop: '0.5rem',
                      color: '#86EFAC',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <CheckCircle size={14} />
                      Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </div>
                  )}

                  <div style={{ color: '#ccc', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Optional: Get coordinates for better location matching. You can still create the event without coordinates.
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Pricing
              </h3>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Ticket Price ({location?.currencySymbol || '£'})
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formatPrice(price)}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder={`0.00`}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                    {locationLoading && (
                      <div style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}>
                        <Loader2 size={16} className="animate-spin" color="#EC4899" />
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Leave empty for free events. Currency: {selectedCountryConfig.currencySymbol} ({selectedCountryConfig.currency})
                  </div>
                  {isPaidEvent && !canHostPaidEvents && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(236, 72, 153, 0.4)',
                        background: 'rgba(236, 72, 153, 0.08)',
                        color: '#FDE2E2'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                        Premium or Unlimited required
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#FECACA' }}>
                        Paid events are available only to Premium or Unlimited subscribers with an active plan.
                      </div>
                      <ul style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#FECACA', paddingLeft: '1.25rem' }}>
                        <li>Host paid events</li>
                        <li>Sell audio downloads</li>
                        <li>Advanced analytics</li>
                        <li>Priority support</li>
                      </ul>
                      <Link href="/pricing" className="btn-primary">
                        Upgrade to Premium
                      </Link>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Maximum Attendees
                  </label>
                  <input
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value)}
                    placeholder="No limit"
                    min="1"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Event Image */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Event Image
              </h3>
              
              <ImageUpload
                onImageSelect={async (file) => {
                  console.log('🖼️ Image selected:', file);
                  await imageActions.setImageFile(file);
                  // The useEffect will handle the automatic upload
                }}
                onImageRemove={() => imageActions.setImageFile(null)}
                selectedFile={adaptUploadFile(imageState.imageFile)}
                previewUrl={imageState.previewUrl}
                isUploading={imageState.isUploading}
                uploadProgress={imageState.uploadProgress}
                uploadStatus={imageState.uploadStatus}
                error={imageState.error}
                title="Upload Event Image"
                subtitle="Drag & drop or click to browse"
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
              />
            </div>

            {/* Privacy & Publishing */}
            <div className="card">
              <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Privacy & Publishing
              </h3>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Privacy Setting
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                      { value: 'public', label: 'Public', icon: Globe },
                      { value: 'followers', label: 'Followers Only', icon: Users },
                      { value: 'private', label: 'Private', icon: Lock }
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setPrivacy(option.value as any)}
                          style={{
                            flex: 1,
                            background: privacy === option.value ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: privacy === option.value ? '2px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Icon size={20} />
                          <span style={{ fontSize: '0.9rem' }}>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Publishing Option
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                      { value: 'now', label: 'Publish Now', icon: Send },
                      { value: 'schedule', label: 'Schedule', icon: Clock },
                      { value: 'draft', label: 'Save Draft', icon: Save }
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setPublishOption(option.value as any)}
                          style={{
                            flex: 1,
                            background: publishOption === option.value ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: publishOption === option.value ? '2px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Icon size={20} />
                          <span style={{ fontSize: '0.9rem' }}>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {publishOption === 'schedule' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Schedule Date
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleSaveDraft}
                disabled={isPublishing}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Save size={20} />
                Save Draft
              </button>

              <button
                onClick={handlePublish}
                disabled={isPublishing || locationLoading}
                style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: isPublishing || locationLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isPublishing || locationLoading ? 0.6 : 1
                }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Publish Event
                  </>
                )}
              </button>
            </div>

            {/* Success Message */}
            {publishStatus === 'success' && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                color: '#86EFAC',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={20} />
                Event published successfully!
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Upload Music</div>
          </Link>
          <div className="quick-action">Start Podcast</div>
          <div className="quick-action">Create Event</div>
          <div className="quick-action">Find Collaborators</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>John is listening to &quot;Praise Medley&quot;</div>
          <div>Sarah posted a new track</div>
          <div>Mike joined Gospel Night event</div>
        </div>
      </FloatingCard>
    </>
  );
} 
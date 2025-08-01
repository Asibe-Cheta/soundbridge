'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Mic,
  MapPin,
  DollarSign,
  ImageIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { createEvent } from '../../../src/lib/event-service';
import type { EventCreateData } from '../../../src/lib/types/event';

export default function CreateEventPage() {
  const { user } = useAuth();
  const [imageState, imageActions] = useImageUpload();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  const genres = [
    'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop',
    'R&B', 'Pop', 'Rock', 'Electronic', 'Classical', 'Folk', 'Country'
  ];

  const locations = [
    'London, UK', 'Lagos, Nigeria', 'Abuja, Nigeria', 'Manchester, UK',
    'Birmingham, UK', 'Liverpool, UK', 'Port Harcourt, Nigeria', 'Kano, Nigeria'
  ];

  const handleImageUpload = async () => {
    if (!user) return;

    try {
      await imageActions.uploadEventImage();
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload image');
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
    if (!location) {
      setError('Event location is required');
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

      // Combine date and time
      const eventDateTime = new Date(`${date}T${time}`);

      // Parse price
      let priceGbp = null;
      let priceNgn = null;
      if (price && price !== '0') {
        if (price.includes('£')) {
          priceGbp = parseFloat(price.replace('£', ''));
        } else if (price.includes('₦')) {
          priceNgn = parseFloat(price.replace('₦', '').replace(',', ''));
        } else {
          // Assume GBP if no currency symbol
          priceGbp = parseFloat(price);
        }
      }

      const eventData: EventCreateData = {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDateTime.toISOString(),
        location: location,
        venue: address || undefined,
        category: genre as 'Christian' | 'Secular' | 'Carnival' | 'Gospel' | 'Hip-Hop' | 'Afrobeat' | 'Jazz' | 'Classical' | 'Rock' | 'Pop' | 'Other',
        price_gbp: priceGbp || undefined,
        price_ngn: priceNgn || undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        image_url: imageState.uploadedUrl || undefined
      };

      const result = await createEvent(eventData);

      if (result.error) {
        setError(result.error);
        setPublishStatus('error');
      } else {
        setPublishStatus('success');
        // Reset form
        setTitle('');
        setDescription('');
        setGenre('');
        setDate('');
        setTime('');
        setLocation('');
        setAddress('');
        setPrice('');
        setMaxAttendees('');
        imageActions.resetUpload();
      }
    } catch (err) {
      setError('Failed to create event');
      setPublishStatus('error');
      console.error('Event creation error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    // For now, we'll just save as a regular event
    // In a real implementation, you might want a separate draft status
    await handlePublish();
  };

  if (!user) {
    return (
      <>
        <header className="header">
          <div className="logo">
            🌉 SoundBridge
          </div>
          <nav className="nav">
            <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
              For You
            </Link>
            <a href="#">Discover</a>
            <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>
              Events
            </Link>
            <a href="#">Creators</a>
            <Link href="/upload" style={{ textDecoration: 'none', color: 'white' }}>
              Upload
            </Link>
          </nav>
          <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." />
          <div className="auth-buttons">
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">Login</button>
            </Link>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Sign Up</button>
            </Link>
          </div>
        </header>

        <main className="main-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Authentication Required</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>Please log in to create events.</p>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Login</button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          🌉 SoundBridge
        </div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
            For You
          </Link>
          <a href="#">Discover</a>
          <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>
            Events
          </Link>
          <a href="#">Creators</a>
          <Link href="/upload" style={{ textDecoration: 'none', color: 'white' }}>
            Upload
          </Link>
        </nav>
        <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." />
        <div className="auth-buttons">
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">Login</button>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Sign Up</button>
          </Link>
        </div>
      </header>

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

        {/* Success Message */}
        {publishStatus === 'success' && (
          <section className="section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#22c55e'
            }}>
              <CheckCircle size={16} />
              <span>Event created successfully!</span>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <section className="section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </section>
        )}

        {/* Create Event Form */}
        <section className="section">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <Calendar size={24} style={{ color: '#EC4899' }} />
              <h2 style={{ fontWeight: '600', color: '#EC4899' }}>Create New Event</h2>
            </div>

            <div className="grid grid-2" style={{ gap: '2rem' }}>
              {/* Left Column - Main Form */}
              <div>
                <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Details</h3>

                {/* Event Title */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Event Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter event title..."
                    className="form-input"
                    style={{ fontSize: '1.1rem' }}
                  />
                </div>

                {/* Event Description */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Event Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your event..."
                    className="form-input"
                    rows={6}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Genre and Category */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Genre/Category *</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a genre</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="form-label">Event Date *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="form-label">Event Time *</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Location */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Location *</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a location</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Venue/Address */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Venue/Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter venue or address details..."
                    className="form-input"
                  />
                </div>

                {/* Price and Capacity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="form-label">Price</label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="£25 or ₦5000"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Max Attendees</label>
                    <input
                      type="number"
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value)}
                      placeholder="100"
                      className="form-input"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Image Upload and Settings */}
              <div>
                <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Image</h3>

                {/* Image Upload */}
                <div style={{ marginBottom: '2rem' }}>
                  <ImageUpload
                    onImageSelect={(file) => imageActions.setImageFile(file)}
                    onImageRemove={() => imageActions.resetUpload()}
                    selectedFile={imageState.imageFile}
                    previewUrl={imageState.previewUrl}
                    isUploading={imageState.isUploading}
                    uploadProgress={imageState.uploadProgress}
                    uploadStatus={imageState.uploadStatus}
                    error={imageState.error}
                    title="Upload Event Image"
                    subtitle="Drag & drop or click to browse (recommended: 1200x800px)"
                    aspectRatio={1.5}
                    disabled={imageState.isUploading}
                  />

                  {/* Upload Button */}
                  {imageState.imageFile && !imageState.uploadedUrl && (
                    <button
                      onClick={handleImageUpload}
                      disabled={imageState.isUploading}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {imageState.isUploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload Image
                        </>
                      )}
                    </button>
                  )}

                  {/* Upload Success Message */}
                  {imageState.uploadedUrl && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      color: '#22c55e',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <CheckCircle size={16} />
                      Image uploaded successfully!
                    </div>
                  )}
                </div>

                <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Publishing Options</h3>

                {/* Privacy Settings */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Privacy</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="privacy"
                        value="public"
                        checked={privacy === 'public'}
                        onChange={(e) => setPrivacy(e.target.value as 'public' | 'private' | 'invite-only')}
                      />
                      <Globe size={16} />
                      <span>Public - Anyone can see and RSVP</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="privacy"
                        value="private"
                        checked={privacy === 'private'}
                        onChange={(e) => setPrivacy(e.target.value as 'public' | 'private' | 'invite-only')}
                      />
                      <Lock size={16} />
                      <span>Private - Only you can see</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="privacy"
                        value="invite-only"
                        checked={privacy === 'invite-only'}
                        onChange={(e) => setPrivacy(e.target.value as 'public' | 'private' | 'invite-only')}
                      />
                      <Users size={16} />
                      <span>Invite Only - Only specific users can see</span>
                    </label>
                  </div>
                </div>

                {/* Publish Options */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Publish Option</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="publishOption"
                        value="now"
                        checked={publishOption === 'now'}
                        onChange={(e) => setPublishOption(e.target.value as 'draft' | 'published' | 'scheduled')}
                      />
                      <Send size={16} />
                      <span>Publish Now</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="publishOption"
                        value="schedule"
                        checked={publishOption === 'schedule'}
                        onChange={(e) => setPublishOption(e.target.value as 'draft' | 'published' | 'scheduled')}
                      />
                      <Clock size={16} />
                      <span>Schedule for later</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="publishOption"
                        value="draft"
                        checked={publishOption === 'draft'}
                        onChange={(e) => setPublishOption(e.target.value as 'draft' | 'published' | 'scheduled')}
                      />
                      <Save size={16} />
                      <span>Save as draft</span>
                    </label>
                  </div>
                </div>

                {/* Schedule Date (if scheduling) */}
                {publishOption === 'schedule' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Schedule Date</label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="form-input"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  {publishOption === 'draft' ? (
                    <button
                      onClick={handleSaveDraft}
                      disabled={isPublishing}
                      className="btn-secondary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isPublishing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Draft
                    </button>
                  ) : (
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isPublishing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {publishOption === 'now' ? 'Publish Event' : 'Schedule Event'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Event Creation Tips">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>📝 Write a compelling description</div>
          <div>📅 Choose a date at least 1 week ahead</div>
          <div>📍 Be specific about the location</div>
          <div>💰 Set a reasonable price</div>
          <div>📸 Add an attractive image</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Event Categories</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          {genres.slice(0, 6).map((genre) => (
            <div key={genre} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <Music size={14} />
              {genre}
            </div>
          ))}
        </div>
      </FloatingCard>
    </>
  );
} 
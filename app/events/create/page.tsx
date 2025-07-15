'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Music, 
  Image as ImageIcon,
  Users,
  Globe,
  Lock,
  Save,
  Send,
  ArrowLeft,
  Upload,
  X,
  CheckCircle
} from 'lucide-react';

export default function CreateEventPage() {
  const [dragActive, setDragActive] = useState(false);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  
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

  const imageInputRef = useRef<HTMLInputElement>(null);

  const genres = [
    'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop',
    'R&B', 'Pop', 'Rock', 'Electronic', 'Classical', 'Folk', 'Country'
  ];

  const locations = [
    'London, UK', 'Lagos, Nigeria', 'Abuja, Nigeria', 'Manchester, UK',
    'Birmingham, UK', 'Liverpool, UK', 'Port Harcourt, Nigeria', 'Kano, Nigeria'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleImageUpload(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setEventImage(file);
  };

  const simulatePublish = () => {
    if (!title.trim() || !date || !time || !location) {
      alert('Please fill in all required fields');
      return;
    }

    setIsPublishing(true);
    setPublishStatus('publishing');

    setTimeout(() => {
      setIsPublishing(false);
      setPublishStatus('success');
    }, 2000);
  };

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
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'none', 
              border: 'none', 
              color: '#EC4899', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Events
            </button>
          </Link>
        </div>

        <div className="section-header">
          <h1 className="section-title">Create Event</h1>
          <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
            Share your music event with the SoundBridge community
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: '2rem' }}>
          {/* Event Image Upload */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <ImageIcon size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Event Image
            </h3>

            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => imageInputRef.current?.click()}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              
              {!eventImage ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <ImageIcon size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
                  <h4 style={{ marginBottom: '0.5rem' }}>Upload Event Image</h4>
                  <p style={{ color: '#999', marginBottom: '1rem' }}>
                    Drag & drop or click to browse
                  </p>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Recommended: 1200x600px, Max 5MB
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <ImageIcon size={24} style={{ color: '#EC4899' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{eventImage.name}</div>
                      <div style={{ color: '#999', fontSize: '0.9rem' }}>
                        {(eventImage.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventImage(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        padding: '0.5rem'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Form */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Calendar size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Event Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div>
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="form-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event..."
                  rows={4}
                  className="form-textarea"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="form-label">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select genre</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Date, Time & Location */}
        <div className="grid grid-3" style={{ gap: '2rem', marginTop: '2rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Calendar size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Date & Time
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <MapPin size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Location
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">City *</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select city</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <DollarSign size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Pricing & Capacity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Price</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., £25-45 or Free Entry"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Max Attendees</label>
                <input
                  type="number"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="Maximum capacity"
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Publishing Settings */}
        <div className="grid grid-2" style={{ gap: '2rem', marginTop: '2rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Lock size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Privacy Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                />
                <Globe size={16} />
                <span>Public - Anyone can view</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="followers"
                  checked={privacy === 'followers'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                />
                <Users size={16} />
                <span>Followers Only</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                />
                <Lock size={16} />
                <span>Private - Only you can view</span>
              </label>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Send size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Publishing Options
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="now"
                  checked={publishOption === 'now'}
                  onChange={(e) => setPublishOption(e.target.value as any)}
                />
                <span>Publish Now</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="schedule"
                  checked={publishOption === 'schedule'}
                  onChange={(e) => setPublishOption(e.target.value as any)}
                />
                <span>Schedule for Later</span>
              </label>
              {publishOption === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="form-input"
                  style={{ marginLeft: '1.5rem' }}
                />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="draft"
                  checked={publishOption === 'draft'}
                  onChange={(e) => setPublishOption(e.target.value as any)}
                />
                <Save size={16} />
                <span>Save as Draft</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
          <button className="btn-secondary" style={{ padding: '1rem 2rem' }}>
            Save Draft
          </button>
          <button 
            className="btn-primary" 
            style={{ padding: '1rem 2rem' }}
            onClick={simulatePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                Publishing...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={16} />
                Publish Event
              </div>
            )}
          </button>
        </div>

        {/* Success Message */}
        {publishStatus === 'success' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '1rem', 
            background: 'rgba(16, 185, 129, 0.1)', 
            color: '#10B981', 
            borderRadius: '8px', 
            marginTop: '1rem',
            justifyContent: 'center'
          }}>
            <CheckCircle size={16} />
            Event published successfully!
          </div>
        )}

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Event Tips Card */}
      <FloatingCard title="Event Tips">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>📅 Set realistic dates and times</div>
          <div>📍 Choose accessible venues</div>
          <div>💰 Price competitively for your market</div>
          <div>📸 Use high-quality event images</div>
          <div>📝 Write compelling descriptions</div>
        </div>
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Recent Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Gospel Night Live - London</div>
          <div>Afrobeats Carnival - Lagos</div>
          <div>UK Drill Showcase - Birmingham</div>
        </div>
      </FloatingCard>
    </>
  );
} 
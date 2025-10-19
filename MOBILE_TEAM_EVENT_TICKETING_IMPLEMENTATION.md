# 🎫 Event Ticketing System - Mobile Implementation Guide

**Date:** October 16, 2025  
**Priority:** HIGH - Revenue Generating Feature  
**Status:** Web Implementation Complete - Mobile Integration Needed

---

## 📋 **OVERVIEW**

The SoundBridge web app now has a complete event ticketing system with smart features. This document provides everything the mobile team needs to implement the same functionality on iOS/Android.

### **🎯 Key Features to Implement:**
- ✅ **Ticket Purchase Flow** - Buy tickets via Stripe
- ✅ **QR Code Display** - Show tickets for event entry
- ✅ **Smart Recommendations** - "You like Artist X → See their event"
- ✅ **Friends Attending** - "5 of your friends are going"
- ✅ **Album + Ticket Bundles** - Discounted packages
- ✅ **Email Notifications** - Ticket confirmations

---

## 🔗 **API ENDPOINTS**

### **1. Event Tickets & Purchase**

#### **Get Event Tickets**
```http
GET /api/events/{eventId}/tickets
```

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "id": "uuid",
      "ticket_name": "General Admission",
      "ticket_type": "general_admission",
      "description": "Standard event access",
      "price_gbp": 25.00,
      "quantity_available": 100,
      "includes_features": ["General seating", "Access to bar"]
    }
  ],
  "bundles": [
    {
      "id": "uuid",
      "bundle_name": "VIP + Exclusive Album",
      "description": "VIP ticket plus exclusive album access",
      "individual_price": 65.00,
      "bundle_price": 55.00,
      "discount_percent": 15.4,
      "bundled_track_ids": ["track-uuid-1", "track-uuid-2"]
    }
  ]
}
```

#### **Purchase Tickets**
```http
POST /api/tickets/purchase
```

**Request:**
```json
{
  "ticketId": "uuid",
  "quantity": 2,
  "buyerName": "John Doe",
  "buyerEmail": "john@example.com",
  "buyerPhone": "+44 7xxx xxx xxx"
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 50.00,
  "platformFee": 1.75,
  "promoterRevenue": 48.25,
  "ticketCodes": ["SB-A1B2-C3D4-E5F6", "SB-G7H8-I9J0-K1L2"]
}
```

#### **Purchase Bundle**
```http
POST /api/bundles/purchase
```

**Request:**
```json
{
  "bundleId": "uuid",
  "buyerName": "John Doe",
  "buyerEmail": "john@example.com",
  "buyerPhone": "+44 7xxx xxx xxx"
}
```

#### **Get User's Tickets**
```http
GET /api/tickets/purchase?eventId={eventId}
```

**Response:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": "uuid",
      "ticket_code": "SB-A1B2-C3D4-E5F6",
      "qr_code_url": "data:image/png;base64,iVBOR...",
      "status": "completed",
      "event": {
        "id": "uuid",
        "title": "Gospel Concert 2025",
        "event_date": "2025-12-25T19:00:00Z",
        "location": "London, UK"
      },
      "ticket": {
        "ticket_name": "VIP Pass",
        "ticket_type": "vip"
      }
    }
  ]
}
```

### **2. Smart Recommendations**

#### **Get Personalized Event Recommendations**
```http
GET /api/events/recommendations?limit=10
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "event_id": "uuid",
      "event_title": "Gospel Festival 2025",
      "event_date": "2025-12-25T19:00:00Z",
      "location": "London, UK",
      "min_price": 25.00,
      "recommendation_score": 50,
      "recommendation_reason": "You listen to Gospel Artist X",
      "friends_attending": [
        {
          "friend_id": "uuid",
          "friend_name": "Sarah Johnson",
          "friend_avatar": "https://..."
        }
      ],
      "friends_count": 3,
      "bundles": [
        {
          "id": "uuid",
          "bundle_name": "Festival + Album Bundle",
          "bundle_price": 45.00,
          "discount_percent": 20.0
        }
      ],
      "has_bundle": true
    }
  ]
}
```

### **3. Artist Events**

#### **Get Artist's Upcoming Events**
```http
GET /api/artists/{artistId}/events
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "uuid",
      "event_title": "Artist X Live Concert",
      "event_date": "2025-12-25T19:00:00Z",
      "location": "London, UK",
      "min_price": 30.00,
      "total_tickets_available": 150,
      "tickets": [
        {
          "id": "uuid",
          "ticket_name": "General Admission",
          "price_gbp": 30.00
        }
      ],
      "bundles": [
        {
          "id": "uuid",
          "bundle_name": "Concert + Album Bundle",
          "bundle_price": 45.00,
          "discount_percent": 15.0
        }
      ]
    }
  ]
}
```

### **4. Friends Attending**

#### **Get Friends Attending Event**
```http
GET /api/events/{eventId}/friends-attending
```

**Response:**
```json
{
  "success": true,
  "friends_attending": [
    {
      "friend_id": "uuid",
      "friend_name": "Sarah Johnson",
      "friend_avatar": "https://...",
      "profile": {
        "display_name": "Sarah Johnson",
        "username": "sarah_j"
      },
      "ticket_info": {
        "ticket": {
          "ticket_name": "VIP Pass",
          "ticket_type": "vip"
        }
      }
    }
  ],
  "total": 3
}
```

---

## 📱 **MOBILE IMPLEMENTATION GUIDE**

### **1. Dependencies**

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@stripe/stripe-react-native": "^0.37.2",
    "react-native-qrcode-svg": "^6.2.0",
    "react-native-svg": "^13.4.0"
  }
}
```

### **2. Stripe Setup**

#### **Install Stripe React Native**
```bash
npm install @stripe/stripe-react-native
cd ios && pod install
```

#### **Initialize Stripe**
```typescript
// App.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

const publishableKey = 'pk_live_xxxxx'; // Your Stripe publishable key

export default function App() {
  return (
    <StripeProvider publishableKey={publishableKey}>
      {/* Your app components */}
    </StripeProvider>
  );
}
```

### **3. Ticket Purchase Flow**

#### **Create Ticket Purchase Component**
```typescript
// components/TicketPurchaseModal.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

interface Ticket {
  id: string;
  ticket_name: string;
  price_gbp: number;
  quantity_available: number;
}

interface Bundle {
  id: string;
  bundle_name: string;
  bundle_price: number;
  discount_percent: number;
}

export function TicketPurchaseModal({ eventId, tickets, bundles, onClose }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!selectedTicket && !selectedBundle) {
      Alert.alert('Error', 'Please select a ticket or bundle');
      return;
    }

    setIsLoading(true);

    try {
      // Call your API to create payment intent
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket,
          bundleId: selectedBundle,
          quantity,
          buyerName: 'User Name', // Get from user profile
          buyerEmail: 'user@example.com', // Get from user profile
          buyerPhone: '+44 7xxx xxx xxx' // Get from user profile
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Initialize payment sheet
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'SoundBridge Events'
      });

      if (error) {
        throw new Error(error.message);
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        throw new Error(presentError.message);
      }

      // Success!
      Alert.alert('Success', 'Ticket purchased successfully! Check your email for confirmation.');
      onClose();

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.modal}>
      {/* Ticket selection UI */}
      <Text style={styles.title}>Get Tickets</Text>
      
      {/* Bundle selection */}
      {bundles.map(bundle => (
        <TouchableOpacity
          key={bundle.id}
          style={[
            styles.option,
            selectedBundle === bundle.id && styles.selected
          ]}
          onPress={() => {
            setSelectedBundle(bundle.id);
            setSelectedTicket(null);
          }}
        >
          <Text style={styles.optionTitle}>{bundle.bundle_name}</Text>
          <Text style={styles.price}>£{bundle.bundle_price}</Text>
          <Text style={styles.discount}>Save {bundle.discount_percent}%!</Text>
        </TouchableOpacity>
      ))}

      {/* Ticket selection */}
      {tickets.map(ticket => (
        <TouchableOpacity
          key={ticket.id}
          style={[
            styles.option,
            selectedTicket === ticket.id && styles.selected
          ]}
          onPress={() => {
            setSelectedTicket(ticket.id);
            setSelectedBundle(null);
          }}
        >
          <Text style={styles.optionTitle}>{ticket.ticket_name}</Text>
          <Text style={styles.price}>£{ticket.price_gbp}</Text>
        </TouchableOpacity>
      ))}

      {/* Purchase button */}
      <TouchableOpacity
        style={[styles.purchaseButton, isLoading && styles.disabled]}
        onPress={handlePurchase}
        disabled={isLoading}
      >
        <Text style={styles.purchaseButtonText}>
          {isLoading ? 'Processing...' : 'Continue to Payment'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### **4. QR Code Display**

#### **Create Ticket Display Component**
```typescript
// components/TicketDisplay.tsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface Ticket {
  ticket_code: string;
  qr_code_url?: string;
  event: {
    title: string;
    event_date: string;
    location: string;
  };
  ticket: {
    ticket_name: string;
  };
}

export function TicketDisplay({ ticket }: { ticket: Ticket }) {
  return (
    <View style={styles.ticketContainer}>
      <Text style={styles.eventTitle}>{ticket.event.title}</Text>
      <Text style={styles.eventDate}>
        {new Date(ticket.event.event_date).toLocaleDateString()}
      </Text>
      <Text style={styles.eventLocation}>{ticket.event.location}</Text>
      
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketName}>{ticket.ticket.ticket_name}</Text>
        <Text style={styles.ticketCode}>{ticket.ticket_code}</Text>
      </View>

      {/* QR Code */}
      {ticket.qr_code_url ? (
        <Image source={{ uri: ticket.qr_code_url }} style={styles.qrCode} />
      ) : (
        <QRCode
          value={ticket.ticket_code}
          size={200}
          color="black"
          backgroundColor="white"
        />
      )}

      <Text style={styles.instructions}>
        Present this QR code at the venue for entry
      </Text>
    </View>
  );
}
```

### **5. Smart Recommendations**

#### **Create Recommendations Component**
```typescript
// components/EventRecommendations.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';

interface Recommendation {
  event_id: string;
  event_title: string;
  event_date: string;
  location: string;
  min_price: number;
  recommendation_score: number;
  recommendation_reason: string;
  friends_attending: Array<{
    friend_id: string;
    friend_name: string;
    friend_avatar: string;
  }>;
  friends_count: number;
  bundles: Array<{
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
  has_bundle: boolean;
}

export function EventRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/events/recommendations?limit=10');
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecommendation = ({ item }: { item: Recommendation }) => (
    <TouchableOpacity style={styles.recommendationCard}>
      <Text style={styles.eventTitle}>{item.event_title}</Text>
      
      {/* Recommendation reason */}
      <View style={styles.recommendationBadge}>
        <Text style={styles.recommendationText}>{item.recommendation_reason}</Text>
      </View>

      {/* Event details */}
      <Text style={styles.eventDate}>
        {new Date(item.event_date).toLocaleDateString()}
      </Text>
      <Text style={styles.eventLocation}>{item.location}</Text>
      <Text style={styles.eventPrice}>From £{item.min_price}</Text>

      {/* Friends attending */}
      {item.friends_count > 0 && (
        <View style={styles.friendsContainer}>
          <Text style={styles.friendsText}>
            {item.friends_count} {item.friends_count === 1 ? 'friend' : 'friends'} attending
          </Text>
        </View>
      )}

      {/* Bundle badge */}
      {item.has_bundle && (
        <View style={styles.bundleBadge}>
          <Text style={styles.bundleText}>Bundle Available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended For You</Text>
      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item) => item.event_id}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
```

### **6. Artist Events Section**

#### **Create Artist Events Component**
```typescript
// components/ArtistEventsSection.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

interface ArtistEvent {
  event_id: string;
  event_title: string;
  event_date: string;
  location: string;
  min_price: number;
  total_tickets_available: number;
  tickets: Array<{
    ticket_name: string;
    price_gbp: number;
  }>;
  bundles: Array<{
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
}

export function ArtistEventsSection({ artistId, artistName }) {
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArtistEvents();
  }, [artistId]);

  const fetchArtistEvents = async () => {
    try {
      const response = await fetch(`/api/artists/${artistId}/events`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching artist events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEvent = ({ item }: { item: ArtistEvent }) => (
    <TouchableOpacity style={styles.eventCard}>
      <Text style={styles.eventTitle}>{item.event_title}</Text>
      <Text style={styles.eventDate}>
        {new Date(item.event_date).toLocaleDateString()}
      </Text>
      <Text style={styles.eventLocation}>{item.location}</Text>
      <Text style={styles.eventPrice}>From £{item.min_price}</Text>
      
      {item.bundles.length > 0 && (
        <View style={styles.bundleBadge}>
          <Text style={styles.bundleText}>Bundle Available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return <Text>Loading events...</Text>;
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No upcoming events yet</Text>
        <Text style={styles.emptySubtext}>
          Check back later for {artistName}'s upcoming shows
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Events</Text>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.event_id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
```

### **7. Friends Attending Component**

```typescript
// components/FriendsAttending.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';

interface Friend {
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  profile: {
    display_name: string;
    username: string;
  };
  ticket_info: {
    ticket: {
      ticket_name: string;
      ticket_type: string;
    };
  };
}

export function FriendsAttending({ eventId }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFriendsAttending();
  }, [eventId]);

  const fetchFriendsAttending = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/friends-attending`);
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends_attending);
      }
    } catch (error) {
      console.error('Error fetching friends attending:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (friends.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends Attending</Text>
      <Text style={styles.count}>{friends.length} friends</Text>
      
      <FlatList
        data={friends}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.friendContainer}>
            <Image source={{ uri: item.friend_avatar }} style={styles.avatar} />
            <Text style={styles.friendName}>{item.profile.display_name}</Text>
            <Text style={styles.ticketType}>{item.ticket_info.ticket.ticket_name}</Text>
          </View>
        )}
        keyExtractor={(item) => item.friend_id}
      />
    </View>
  );
}
```

---

## 🎨 **UI/UX RECOMMENDATIONS**

### **Design Patterns**

1. **Ticket Purchase Flow:**
   - Modal overlay with ticket options
   - Clear pricing display
   - Bundle savings highlighted
   - Stripe payment integration

2. **QR Code Display:**
   - Full-screen ticket view
   - Large, scannable QR code
   - Event details clearly visible
   - "Screenshot to save" functionality

3. **Recommendations:**
   - Horizontal scroll cards
   - Recommendation reason badges
   - Friend avatars overlay
   - Bundle availability indicators

4. **Artist Events:**
   - Clean event cards
   - Price and date prominence
   - Bundle badges
   - "View all" link

### **Color Scheme**
- **Primary:** Your existing brand colors
- **Success:** Green for completed purchases
- **Warning:** Orange for limited availability
- **Bundle:** Purple for special offers

---

## 🔧 **INTEGRATION STEPS**

### **Step 1: Dependencies**
```bash
npm install @stripe/stripe-react-native react-native-qrcode-svg react-native-svg
cd ios && pod install
```

### **Step 2: Stripe Configuration**
- Add Stripe publishable key to your environment
- Initialize StripeProvider in your app root
- Test with Stripe test keys first

### **Step 3: API Integration**
- Implement the API endpoints listed above
- Add proper error handling
- Include loading states

### **Step 4: UI Components**
- Build ticket purchase modal
- Create QR code display
- Implement recommendations feed
- Add artist events section

### **Step 5: Testing**
- Test with Stripe test cards
- Verify QR code generation
- Test email notifications
- Validate bundle purchases

---

## 📊 **REVENUE IMPACT**

### **Expected Results:**
- **Ticket Sales:** Direct revenue from event tickets
- **Bundle Sales:** Higher value transactions
- **User Engagement:** Increased time in app
- **Artist Retention:** Better creator monetization

### **Key Metrics to Track:**
- Ticket purchase conversion rate
- Bundle vs individual ticket ratio
- Average transaction value
- User engagement with events

---

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] Stripe integration working
- [ ] QR codes displaying correctly
- [ ] Email notifications sending
- [ ] Bundle purchases functional
- [ ] Recommendations loading
- [ ] Friends attending display
- [ ] Artist events showing
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Test purchases completed

---

## 📞 **SUPPORT & QUESTIONS**

For any questions or issues during implementation:

1. **API Issues:** Check web app logs at `https://soundbridge.live`
2. **Stripe Problems:** Verify keys and webhook setup
3. **UI/UX Questions:** Reference the design patterns above
4. **Integration Help:** Follow the step-by-step guide

---

## 🎉 **SUCCESS CRITERIA**

The implementation is successful when:
- ✅ Users can purchase tickets via mobile app
- ✅ QR codes display correctly for event entry
- ✅ Smart recommendations show relevant events
- ✅ Friends attending feature works
- ✅ Bundle purchases process correctly
- ✅ Email confirmations are received

**Ready to implement? Let's make SoundBridge the go-to platform for music events! 🎵🎫**

import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface TicketDisplayProps {
  ticket: {
    ticket_code: string;
    qr_code_url?: string;
    status: string;
    event: {
      title: string;
      event_date: string;
      location: string;
    };
    ticket: {
      ticket_name: string;
      ticket_type: string;
    };
  };
}

export default function TicketDisplay({ ticket }: TicketDisplayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const getTicketTypeIcon = (type: string) => {
    switch (type) {
      case 'vip':
        return 'star';
      case 'early_bird':
        return 'time';
      case 'general_admission':
        return 'ticket';
      default:
        return 'ticket-outline';
    }
  };

  const getTicketTypeColor = (type: string) => {
    switch (type) {
      case 'vip':
        return ['#FFD700', '#FFA500'];
      case 'early_bird':
        return ['#00CED1', '#1E90FF'];
      case 'general_admission':
        return ['#DC2626', '#991B1B'];
      default:
        return ['#666', '#444'];
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getTicketTypeColor(ticket.ticket.ticket_type)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ticketCard}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons 
              name={getTicketTypeIcon(ticket.ticket.ticket_type)} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.ticketType}>{ticket.ticket.ticket_name}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            ticket.status === 'completed' && styles.statusActive,
          ]}>
            <Text style={styles.statusText}>
              {ticket.status === 'completed' ? 'ACTIVE' : ticket.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.detailText}>{formatDate(ticket.event.event_date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.detailText}>{ticket.event.location}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerHole} />
          <View style={styles.dividerLine} />
          <View style={styles.dividerHole} />
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            {ticket.qr_code_url ? (
              <Image 
                source={{ uri: ticket.qr_code_url }} 
                style={styles.qrCode}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={ticket.ticket_code}
                  size={200}
                  color="#000"
                  backgroundColor="#fff"
                  logo={require('../../../assets/icon.png')}
                  logoSize={40}
                  logoBackgroundColor="#fff"
                  logoBorderRadius={20}
                />
              </View>
            )}
          </View>

          <Text style={styles.ticketCode}>{ticket.ticket_code}</Text>
          <Text style={styles.instructions}>
            Present this QR code at the venue for entry
          </Text>
        </View>

        {/* Footer Pattern */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SoundBridge Events</Text>
        </View>
      </LinearGradient>

      {/* Shadow/Glow Effect */}
      <View style={[styles.shadow, { 
        shadowColor: getTicketTypeColor(ticket.ticket.ticket_type)[0] 
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  ticketCard: {
    width: width - 40,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
  },
  shadow: {
    position: 'absolute',
    width: width - 40,
    height: '100%',
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusActive: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  eventDetails: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerHole: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodeWrapper: {
    // Wrapper for QRCode component
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  ticketCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  instructions: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});


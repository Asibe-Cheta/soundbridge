import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Ticket {
  id: string;
  ticket_name: string;
  ticket_type: string;
  description: string;
  price_gbp: number;
  quantity_available: number;
  includes_features: string[];
}

interface Bundle {
  id: string;
  bundle_name: string;
  description: string;
  individual_price: number;
  bundle_price: number;
  discount_percent: number;
  bundled_track_ids: string[];
}

interface TicketPurchaseModalProps {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  tickets: Ticket[];
  bundles: Bundle[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketPurchaseModal({
  visible,
  eventId,
  eventTitle,
  tickets,
  bundles,
  onClose,
  onSuccess,
}: TicketPurchaseModalProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load user profile data
  React.useEffect(() => {
    loadUserProfile();
  }, [visible]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setBuyerEmail(user.email || '');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, phone')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setBuyerName(profile.display_name || '');
          setBuyerPhone(profile.phone || '');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const getSelectedItem = () => {
    if (selectedBundle) {
      return bundles.find(b => b.id === selectedBundle);
    }
    if (selectedTicket) {
      return tickets.find(t => t.id === selectedTicket);
    }
    return null;
  };

  const getTotalPrice = () => {
    const item = getSelectedItem();
    if (!item) return 0;
    
    if (selectedBundle) {
      return (item as Bundle).bundle_price;
    }
    return (item as Ticket).price_gbp * quantity;
  };

  const handlePurchase = async () => {
    // Validation
    if (!selectedTicket && !selectedBundle) {
      Alert.alert('Error', 'Please select a ticket or bundle');
      return;
    }

    if (!buyerName || !buyerEmail || !buyerPhone) {
      Alert.alert('Error', 'Please fill in all your contact information');
      return;
    }

    setIsLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to purchase tickets');
      }

      // Call API to create payment intent
      const endpoint = selectedBundle ? '/api/bundles/purchase' : '/api/tickets/purchase';
      const requestBody = selectedBundle 
        ? {
            bundleId: selectedBundle,
            buyerName,
            buyerEmail,
            buyerPhone,
          }
        : {
            ticketId: selectedTicket,
            quantity,
            buyerName,
            buyerEmail,
            buyerPhone,
          };

      const response = await fetch(`https://soundbridge.live${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'SoundBridge Events',
        style: 'alwaysDark',
        returnURL: 'soundbridge://payment-complete',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled
        if (presentError.code === 'Canceled') {
          return;
        }
        throw new Error(presentError.message);
      }

      // Success!
      Alert.alert(
        'Success! ­ƒÄë',
        'Your ticket has been purchased successfully! Check your email for confirmation and your ticket QR code.',
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
        }}]
      );

    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', error.message || 'An error occurred while processing your payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Get Tickets</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Title */}
          <Text style={styles.eventTitle}>{eventTitle}</Text>

          {/* Bundles Section */}
          {bundles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="gift" size={20} color="#DC2626" />
                <Text style={styles.sectionTitle}>Special Bundles</Text>
              </View>
              
              {bundles.map(bundle => (
                <TouchableOpacity
                  key={bundle.id}
                  style={[
                    styles.optionCard,
                    selectedBundle === bundle.id && styles.selectedCard,
                  ]}
                  onPress={() => {
                    setSelectedBundle(bundle.id);
                    setSelectedTicket(null);
                  }}
                >
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      SAVE {bundle.discount_percent.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={styles.optionTitle}>{bundle.bundle_name}</Text>
                  <Text style={styles.optionDescription}>{bundle.description}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.originalPrice}>┬ú{bundle.individual_price.toFixed(2)}</Text>
                    <Text style={styles.bundlePrice}>┬ú{bundle.bundle_price.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tickets Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            
            {tickets.map(ticket => (
              <TouchableOpacity
                key={ticket.id}
                style={[
                  styles.optionCard,
                  selectedTicket === ticket.id && styles.selectedCard,
                ]}
                onPress={() => {
                  setSelectedTicket(ticket.id);
                  setSelectedBundle(null);
                }}
              >
                <View style={styles.ticketHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{ticket.ticket_name}</Text>
                    <Text style={styles.optionDescription}>{ticket.description}</Text>
                  </View>
                  <Text style={styles.ticketPrice}>┬ú{ticket.price_gbp.toFixed(2)}</Text>
                </View>
                
                {ticket.includes_features && ticket.includes_features.length > 0 && (
                  <View style={styles.features}>
                    {ticket.includes_features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {ticket.quantity_available < 20 && (
                  <View style={styles.limitedBadge}>
                    <Text style={styles.limitedText}>
                      Only {ticket.quantity_available} left!
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity Selector (only for individual tickets) */}
          {selectedTicket && !selectedBundle && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={24} color={quantity <= 1 ? '#666' : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Buyer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="John Doe"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={buyerEmail}
                onChangeText={setBuyerEmail}
                placeholder="john@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                placeholder="+44 7xxx xxx xxx"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Total Price */}
          {(selectedTicket || selectedBundle) && (
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>┬ú{getTotalPrice().toFixed(2)}</Text>
            </View>
          )}
        </ScrollView>

        {/* Purchase Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.purchaseButtonWrapper,
              (!selectedTicket && !selectedBundle || isLoading) && styles.disabledButton,
            ]}
            onPress={handlePurchase}
            disabled={!selectedTicket && !selectedBundle || isLoading}
          >
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.purchaseButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.purchaseButtonText}>Continue to Payment</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginLeft: 8,
  },
  optionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
  bundlePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  features: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  limitedBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  limitedText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '600',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 12,
    gap: 24,
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    minWidth: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  totalPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#DC2626',
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchaseButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});


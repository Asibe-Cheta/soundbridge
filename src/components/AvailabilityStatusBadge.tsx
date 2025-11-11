import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface RawAvailabilitySlot {
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  is_available?: boolean;
}

interface AvailabilityStatusBadgeProps {
  creatorId: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function AvailabilityStatusBadge({
  creatorId,
  size = 'medium',
  showText = true,
}: AvailabilityStatusBadgeProps) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<RawAvailabilitySlot[]>([]);

  useEffect(() => {
    checkAvailability();

    // Refresh availability every minute
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, [creatorId]);

  const normaliseSlot = (slot: RawAvailabilitySlot) => ({
    start: slot.start_time || slot.start_date || null,
    end: slot.end_time || slot.end_date || null,
  });

  const checkAvailability = async () => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('creator_availability')
        .select('start_date, end_date, is_available')
        .eq('creator_id', creatorId)
        .eq('is_available', true)
        .gte('end_date', now)
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      setSlots(data || []);
    } catch (error) {
      console.error('AvailabilityStatusBadge: Error checking availability', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const { isAvailableNow, nextSlot } = useMemo(() => {
    if (!slots.length) {
      return { isAvailableNow: false, nextSlot: null as { start: string; end: string } | null };
    }

    const normalised = slots
      .map(normaliseSlot)
      .filter(slot => slot.start && slot.end) as { start: string; end: string }[];

    const nowTime = Date.now();
    const availableNow = normalised.some(slot => {
      const startTime = new Date(slot.start).getTime();
      const endTime = new Date(slot.end).getTime();
      return startTime <= nowTime && endTime >= nowTime;
    });

    return {
      isAvailableNow: availableNow,
      nextSlot: normalised.length ? normalised[0] : null,
    };
  }, [slots]);

  const getAvailabilityInfo = () => {
    if (isAvailableNow) {
      return {
        text: 'Available Now',
        color: '#10B981',
        icon: 'checkmark-circle' as const,
        bgColor: '#10B98120',
      };
    } else if (nextSlot) {
      const startTime = new Date(nextSlot.start);
      const isToday = startTime.toDateString() === new Date().toDateString();
      const isTomorrow = startTime.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

      if (isToday) {
        return {
          text: `Today ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          color: '#3B82F6',
          icon: 'time' as const,
          bgColor: '#3B82F620',
        };
      } else if (isTomorrow) {
        return {
          text: `Tomorrow ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          color: '#8B5CF6',
          icon: 'calendar' as const,
          bgColor: '#8B5CF620',
        };
      } else {
        return {
          text: `${startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
          color: '#6B7280',
          icon: 'calendar-outline' as const,
          bgColor: '#6B728020',
        };
      }
    } else {
      return {
        text: 'No Availability',
        color: '#9CA3AF',
        icon: 'close-circle' as const,
        bgColor: '#9CA3AF20',
      };
    }
  };

  const sizeStyles = {
    small: { paddingHorizontal: 8, paddingVertical: 4 },
    medium: { paddingHorizontal: 12, paddingVertical: 6 },
    large: { paddingHorizontal: 16, paddingVertical: 8 },
  };

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16,
  };

  const textSizes = {
    small: 11,
    medium: 13,
    large: 15,
  };

  if (loading) {
    return (
      <View style={[styles.loadingBadge, sizeStyles[size]]}>
        <ActivityIndicator size="small" color="#6B7280" />
      </View>
    );
  }

  const info = getAvailabilityInfo();

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: info.bgColor }]}>
      <Ionicons name={info.icon} size={iconSizes[size]} color={info.color} />
      {showText && <Text style={[styles.text, { color: info.color, fontSize: textSizes[size] }]}>{info.text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    gap: 6,
    alignSelf: 'flex-start',
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB40',
  },
  text: {
    fontWeight: '600',
  },
});


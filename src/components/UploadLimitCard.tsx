import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { UploadQuota } from '../services/UploadQuotaService';

type UploadLimitCardProps = {
  quota: UploadQuota | null;
  loading?: boolean;
  onUpgrade?: () => void;
};

export default function UploadLimitCard({ quota, loading, onUpgrade }: UploadLimitCardProps) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.title, { color: theme.colors.text }]}>Checking your upload quotaÔÇª</Text>
      </View>
    );
  }

  if (!quota) {
    return null;
  }

  const remaining = quota.remaining ?? (quota.upload_limit !== null ? quota.upload_limit - quota.uploads_this_month : null);
  const tier = quota.tier?.toLowerCase() ?? 'free';
  const tierLabel = (() => {
    switch (tier) {
      case 'free':
        return 'Free';
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Enterprise';
      default:
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    }
  })();
  const isFree = tier === 'free';
  const isPro = tier === 'pro';
  const resetDate = quota.reset_date ? new Date(quota.reset_date) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      accessibilityRole="summary"
    >
      <View style={styles.headerRow}>
        <Ionicons name="musical-notes" size={22} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{tierLabel}</Text>
      </View>

      {quota.is_unlimited ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>You can upload unlimited tracks this month.</Text>
      ) : (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Upload limit: {quota.upload_limit ?? 'ÔÇö'} tracks per month ┬À {remaining ?? 0} remaining
        </Text>
      )}

      {resetDate && !quota.is_unlimited && (
        <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>Resets on {resetDate.toLocaleDateString()}</Text>
      )}

      {isFree && onUpgrade && (
        <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
          onPress={onUpgrade}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" style={styles.upgradeIcon} />
          <Text style={styles.upgradeText}>Need more uploads? Upgrade</Text>
        </TouchableOpacity>
      )}

      {!quota.can_upload && (
        <View style={[styles.warning, { backgroundColor: '#FEE2E2', borderColor: '#F87171' }]}
          accessibilityRole="alert"
        >
          <Ionicons name="alert-circle" size={18} color="#B91C1C" style={styles.warningIcon} />
          <Text style={[styles.warningText, { color: '#B91C1C' }]}>Upload limit reached. Add a new plan or wait for reset.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  resetText: {
    fontSize: 12,
    marginBottom: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  upgradeIcon: {
    marginRight: 4,
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  warning: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
  },
});




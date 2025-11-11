// src/components/analytics/MetricCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  onPress,
  size = 'medium',
}: MetricCardProps) {
  const { theme } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: 12,
          iconSize: 20,
          titleSize: 12,
          valueSize: 18,
          subtitleSize: 10,
        };
      case 'large':
        return {
          padding: 20,
          iconSize: 32,
          titleSize: 16,
          valueSize: 28,
          subtitleSize: 14,
        };
      default: // medium
        return {
          padding: 16,
          iconSize: 24,
          titleSize: 14,
          valueSize: 22,
          subtitleSize: 12,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          padding: sizeStyles.padding,
        },
        onPress && styles.pressable,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={sizeStyles.iconSize}
            color={iconColor || theme.colors.primary}
          />
        </View>
        
        {trend && (
          <View style={[
            styles.trendContainer,
            { backgroundColor: trend.isPositive ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.trendText}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[
          styles.title,
          { color: theme.colors.textSecondary, fontSize: sizeStyles.titleSize }
        ]}>
          {title}
        </Text>
        
        <Text style={[
          styles.value,
          { color: theme.colors.text, fontSize: sizeStyles.valueSize }
        ]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        
        {subtitle && (
          <Text style={[
            styles.subtitle,
            { color: theme.colors.textSecondary, fontSize: sizeStyles.subtitleSize }
          ]}>
            {subtitle}
          </Text>
        )}
      </View>
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pressable: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  content: {
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.8,
  },
});

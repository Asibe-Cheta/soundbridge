// src/components/analytics/PerformanceIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface PerformanceIndicatorProps {
  label: string;
  currentValue: number;
  previousValue: number;
  format?: 'number' | 'percentage' | 'currency';
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
}

export default function PerformanceIndicator({
  label,
  currentValue,
  previousValue,
  format = 'number',
  icon,
  size = 'medium',
}: PerformanceIndicatorProps) {
  const { theme } = useTheme();

  const calculateChange = () => {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const change = calculateChange();
  const isPositive = change >= 0;
  const isSignificant = Math.abs(change) >= 5; // 5% threshold for significant change

  const formatValue = (value: number) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        return value.toLocaleString();
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          containerPadding: 8,
          iconSize: 16,
          labelSize: 12,
          valueSize: 14,
          changeSize: 10,
        };
      case 'large':
        return {
          containerPadding: 16,
          iconSize: 28,
          labelSize: 16,
          valueSize: 24,
          changeSize: 14,
        };
      default: // medium
        return {
          containerPadding: 12,
          iconSize: 20,
          labelSize: 14,
          valueSize: 18,
          changeSize: 12,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const getChangeColor = () => {
    if (!isSignificant) return theme.colors.textSecondary;
    return isPositive ? '#4CAF50' : '#F44336';
  };

  const getChangeIcon = () => {
    if (!isSignificant) return 'remove';
    return isPositive ? 'trending-up' : 'trending-down';
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        padding: sizeStyles.containerPadding,
      }
    ]}>
      <View style={styles.header}>
        {icon && (
          <Ionicons
            name={icon}
            size={sizeStyles.iconSize}
            color={theme.colors.primary}
            style={styles.icon}
          />
        )}
        <Text style={[
          styles.label,
          { color: theme.colors.textSecondary, fontSize: sizeStyles.labelSize }
        ]}>
          {label}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[
          styles.currentValue,
          { color: theme.colors.text, fontSize: sizeStyles.valueSize }
        ]}>
          {formatValue(currentValue)}
        </Text>

        <View style={styles.changeContainer}>
          <Ionicons
            name={getChangeIcon()}
            size={sizeStyles.changeSize}
            color={getChangeColor()}
          />
          <Text style={[
            styles.changeText,
            { color: getChangeColor(), fontSize: sizeStyles.changeSize }
          ]}>
            {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
      </View>

      {previousValue > 0 && (
        <Text style={[
          styles.previousValue,
          { color: theme.colors.textSecondary, fontSize: sizeStyles.changeSize }
        ]}>
          Previous: {formatValue(previousValue)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontWeight: '500',
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentValue: {
    fontWeight: 'bold',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontWeight: '600',
    marginLeft: 4,
  },
  previousValue: {
    opacity: 0.7,
  },
});

import React from 'react';
import { Pressable, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type BackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function BackButton({
  onPress,
  style,
  accessibilityLabel = 'Go back',
}: BackButtonProps) {
  const { theme } = useTheme();

  const backgroundColor = theme.isDark
    ? theme.colors.primary
    : 'rgba(0, 0, 0, 0.85)';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, shadowColor: theme.isDark ? '#000000' : '#0F172A' },
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});


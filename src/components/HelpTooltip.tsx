import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface HelpTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
}

const { width } = Dimensions.get('window');

export default function HelpTooltip({ 
  content, 
  title, 
  position = 'top',
  size = 'medium' 
}: HelpTooltipProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const getTooltipStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 1000,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      maxWidth: width * 0.8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: 30,
          left: 0,
          right: 0,
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: 30,
          left: 0,
          right: 0,
        };
      case 'left':
        return {
          ...baseStyle,
          right: 30,
          top: 0,
        };
      case 'right':
        return {
          ...baseStyle,
          left: 30,
          top: 0,
        };
      default:
        return baseStyle;
    }
  };

  const getArrowStyle = () => {
    const baseArrow = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
    };

    switch (position) {
      case 'top':
        return {
          ...baseArrow,
          top: -8,
          left: 20,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderBottomWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: theme.colors.card,
        };
      case 'bottom':
        return {
          ...baseArrow,
          bottom: -8,
          left: 20,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.colors.card,
        };
      case 'left':
        return {
          ...baseArrow,
          left: -8,
          top: 20,
          borderTopWidth: 8,
          borderBottomWidth: 8,
          borderRightWidth: 8,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: theme.colors.card,
        };
      case 'right':
        return {
          ...baseArrow,
          right: -8,
          top: 20,
          borderTopWidth: 8,
          borderBottomWidth: 8,
          borderLeftWidth: 8,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: theme.colors.card,
        };
      default:
        return baseArrow;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => setVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name="help-circle-outline" 
          size={16} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={getTooltipStyle()}>
            <View style={getArrowStyle()} />
            {title && (
              <Text style={[
                styles.tooltipTitle, 
                { color: theme.colors.text, fontSize: getTextSize() + 2 }
              ]}>
                {title}
              </Text>
            )}
            <Text style={[
              styles.tooltipContent, 
              { color: theme.colors.textSecondary, fontSize: getTextSize() }
            ]}>
              {content}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    padding: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipContent: {
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
});

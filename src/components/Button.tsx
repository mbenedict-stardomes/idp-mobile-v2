import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';
type Size = 'small' | 'medium' | 'large';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}: Props) {
  const { colors, gradients, buttonSizes, borderRadius: br } = useTheme();
  const s = buttonSizes[size];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const base: ViewStyle = {
    height: s.height,
    paddingHorizontal: s.paddingHorizontal,
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  const textColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'danger'
        ? colors.error.main
        : colors.primary[500];

  const textStyle = {
    color: textColor,
    fontSize: s.fontSize,
    fontWeight: '700' as const,
    letterSpacing: 1,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={style}
      >
        <LinearGradient
          colors={[...gradients.cyanGlow.colors]}
          start={gradients.cyanGlow.start}
          end={gradients.cyanGlow.end}
          style={[base, styles.gradient]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={textStyle}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const borderStyle: ViewStyle =
    variant === 'danger'
      ? { borderWidth: 1, borderColor: colors.error.main }
      : variant === 'outline' || variant === 'secondary'
        ? { borderWidth: 1, borderColor: colors.primary[500] }
        : {};

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[base, borderStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    overflow: 'hidden',
  },
});

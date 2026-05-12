import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: Props) {
  const { t, borderRadius, shadows, spacing } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: t.border,
          ...shadows.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

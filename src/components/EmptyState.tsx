import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Button from './Button';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  submessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  message,
  submessage,
  actionLabel,
  onAction,
}: Props) {
  const { t, colors, typography, spacing, iconSizes } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
      }}
    >
      <Ionicons
        name={icon}
        size={iconSizes.xxl}
        color={t.textMuted}
        style={{ marginBottom: spacing.lg }}
      />
      <Text
        style={[
          typography.h3,
          { color: t.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
        ]}
      >
        {message}
      </Text>
      {submessage && (
        <Text
          style={[
            typography.body,
            { color: t.textMuted, textAlign: 'center', marginBottom: spacing.lg },
          ]}
        >
          {submessage}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
}

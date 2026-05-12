import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  onPress?: () => void;
  last?: boolean;
}

export default function SettingsRow({
  icon,
  label,
  value,
  badge,
  chevron = false,
  danger = false,
  onPress,
  last = false,
}: Props) {
  const { t, colors, typography, spacing, iconSizes } = useTheme();

  const textColor = danger ? colors.error.main : t.textPrimary;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.divider,
      }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={iconSizes.md}
          color={danger ? colors.error.main : colors.primary[500]}
          style={{ marginRight: spacing.md }}
        />
      )}
      <Text style={[typography.body, { color: textColor, flex: 1 }]}>
        {label}
      </Text>
      {badge}
      {value && (
        <Text style={[typography.bodySmall, { color: t.textMuted, marginRight: spacing.sm }]}>
          {value}
        </Text>
      )}
      {(chevron || onPress) && (
        <Ionicons
          name="chevron-forward-outline"
          size={iconSizes.sm}
          color={t.textMuted}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  title: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, action, onAction }: Props) {
  const { t, colors, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
      }}
    >
      <Text style={[typography.overline, { color: t.textMuted }]}>
        {title}
      </Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[typography.bodySmall, { color: colors.primary[500] }]}>
            {action}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

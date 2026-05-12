import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

type Status = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'ACTIVE' | 'LOCKED' | 'REVOKED';

interface Props {
  status: Status;
}

const STATUS_MAP: Record<Status, { bgKey: string; textKey: string }> = {
  PENDING:  { bgKey: 'warning', textKey: 'warning' },
  APPROVED: { bgKey: 'success', textKey: 'success' },
  ACTIVE:   { bgKey: 'success', textKey: 'success' },
  DENIED:   { bgKey: 'error',   textKey: 'error' },
  REVOKED:  { bgKey: 'error',   textKey: 'error' },
  LOCKED:   { bgKey: 'error',   textKey: 'error' },
  EXPIRED:  { bgKey: 'neutral', textKey: 'neutral' },
};

export default function StatusBadge({ status }: Props) {
  const { colors, borderRadius, typography } = useTheme();

  const mapping = STATUS_MAP[status] || STATUS_MAP.EXPIRED;
  const semantic = (colors as any)[mapping.textKey];
  const textColor = semantic?.main || colors.neutral[600];
  const bgColor = semantic?.light
    ? `${textColor}1A` // 10% opacity
    : colors.neutral[200];

  return (
    <View
      style={{
        backgroundColor: bgColor,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={[
          typography.overline,
          { color: textColor, fontSize: 11 },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

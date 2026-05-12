import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...rest }: Props) {
  const { t, colors, spacing, inputSizes, borderRadius, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error.main
    : focused
      ? colors.primary[500]
      : t.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text
          style={[
            typography.bodySmall,
            { color: t.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={t.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            height: inputSizes.height,
            paddingHorizontal: inputSizes.paddingHorizontal,
            fontSize: inputSizes.fontSize,
            backgroundColor: t.surface,
            color: t.textPrimary,
            borderWidth: inputSizes.borderWidth,
            borderColor,
            borderRadius: borderRadius.md,
          },
          style,
        ]}
        {...rest}
      />
      {error && (
        <Text
          style={[
            typography.caption,
            { color: colors.error.main, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
});

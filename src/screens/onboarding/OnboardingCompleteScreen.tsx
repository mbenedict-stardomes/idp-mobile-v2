import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import { useAppContext } from '../../navigation/AppContext';
import { getOnboardingState } from '../../services/onboarding';
import { saveFullSession } from '../../services/session';
import { endJourney } from '../../services/journeyTelemetry';

export default function OnboardingCompleteScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing, iconSizes } = useTheme();
  const { onOnboardingDone } = useAppContext();

  const handleContinue = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Build session from onboarding data
    const state = await getOnboardingState();
    await saveFullSession(
      `session-${Date.now()}`, // Phase 1: generated session token
      state.identityId || '',
      state.identityId || '',
      state.deviceId || '',
    );

    endJourney();
    onOnboardingDone();
  };

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        {/* Step indicator — all complete */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.accent[500], // All teal = complete
              }}
            />
          ))}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${colors.accent[500]}20`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.xl,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={iconSizes.xxl}
              color={colors.accent[500]}
            />
          </View>

          <Text
            style={[
              typography.h1,
              { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            You're All Set!
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: '#9E9FBB',
                textAlign: 'center',
                paddingHorizontal: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            Your Stardomes identity is secured with hardware-backed credentials.
          </Text>

          <Text
            style={[
              typography.subtitle,
              { color: colors.primary[500], marginTop: spacing.md },
            ]}
          >
            AN EMCREDIT VENTURE
          </Text>
        </View>

        <Button
          title="Get Started"
          onPress={handleContinue}
          size="large"
          style={{ marginBottom: spacing.md }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

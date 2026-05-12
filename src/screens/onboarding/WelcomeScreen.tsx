import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import { saveOnboardingStep, OnboardingStep } from '../../services/onboarding';
import { startJourney, setJourneyStep } from '../../services/journeyTelemetry';

export default function WelcomeScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing } = useTheme();

  const handleGetStarted = async () => {
    startJourney('FLOW_ONBOARD_REGISTRATION', 'WELCOME');
    setJourneyStep('REGISTER_IDENTITY');
    await saveOnboardingStep(OnboardingStep.REGISTER_IDENTITY);
    navigation.navigate('RegisterIdentity');
  };

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Satellite icon from brand */}
          <Ionicons
            name="radio-outline"
            size={80}
            color={colors.primary[500]}
            style={{ marginBottom: spacing.lg }}
          />

          <Text
            style={[
              typography.hero,
              { color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' },
            ]}
          >
            STARDOMES
          </Text>

          <Text
            style={[
              typography.subtitle,
              { color: colors.primary[500], marginTop: spacing.sm, marginBottom: spacing.xl },
            ]}
          >
            AN EMCREDIT VENTURE
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: '#9E9FBB',
                textAlign: 'center',
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            Protect your banking transactions and identity with hardware-backed
            security and satellite connectivity.
          </Text>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Button title="Get Started" onPress={handleGetStarted} size="large" />

          {/* Step indicator */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <View
                key={i}
                style={{
                  width: i === 0 ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === 0 ? colors.primary[500] : colors.secondary[400],
                }}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

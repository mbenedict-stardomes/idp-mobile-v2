import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import { getBiometricStatus, authenticate } from '../../services/biometric';
import { markBiometricEnrolled } from '../../services/onboarding';
import { setJourneyStep } from '../../services/journeyTelemetry';

export default function BiometricSetupScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing, iconSizes } = useTheme();
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await getBiometricStatus();
      setBiometricLabel(status.biometricLabel);
      if (!status.hasHardware || !status.isEnrolled) {
        setAvailable(false);
      }
    })();
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await authenticate(`Enable ${biometricLabel} for Stardomes`);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await markBiometricEnrolled();
        setJourneyStep('PIN_SETUP');
        navigation.navigate('PINSetup');
      } else {
        Alert.alert('Failed', `${biometricLabel} authentication failed. Try again or skip.`);
      }
    } catch {
      Alert.alert('Error', 'Could not enable biometric authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await markBiometricEnrolled();
    setJourneyStep('PIN_SETUP');
    navigation.navigate('PINSetup');
  };

  const iconName = biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline';
  const stepIndex = 3;

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        {/* Step indicator */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: i === stepIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i <= stepIndex ? colors.primary[500] : colors.secondary[400],
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
              backgroundColor: colors.secondary[500],
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.xl,
            }}
          >
            <Ionicons name={iconName} size={iconSizes.xxl} color={colors.primary[500]} />
          </View>

          <Text style={[typography.h1, { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.sm }]}>
            {available ? `Enable ${biometricLabel}` : 'Biometric Unavailable'}
          </Text>

          <Text
            style={[
              typography.body,
              { color: '#9E9FBB', textAlign: 'center', paddingHorizontal: spacing.md },
            ]}
          >
            {available
              ? `Use ${biometricLabel} to quickly and securely approve transactions and unlock the app.`
              : 'No biometric hardware detected or not enrolled. You can set this up later in Settings.'}
          </Text>
        </View>

        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          {available ? (
            <Button
              title={`Enable ${biometricLabel}`}
              onPress={handleEnable}
              loading={loading}
              size="large"
            />
          ) : null}
          <Button
            title={available ? 'Skip for Now' : 'Continue'}
            onPress={handleSkip}
            variant="secondary"
            size="large"
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

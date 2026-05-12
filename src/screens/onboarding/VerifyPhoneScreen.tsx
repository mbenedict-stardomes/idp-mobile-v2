import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import { markPhoneVerified } from '../../services/onboarding';
import { setJourneyStep } from '../../services/journeyTelemetry';

const OTP_LENGTH = 6;
const DEFAULT_OTP = ['1', '2', '3', '4', '5', '6']; // Phase 1: pre-filled for testing

export default function VerifyPhoneScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing, borderRadius } = useTheme();
  const [otp, setOtp] = useState<string[]>([...DEFAULT_OTP]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      // Phase 1: Accept any 6-digit code (simulated verification)
      await new Promise((r) => setTimeout(r, 800));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await markPhoneVerified();
      setJourneyStep('BIOMETRIC_SETUP');
      navigation.navigate('BiometricSetup');
    } catch {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = 2;

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
          >
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

            <Text style={[typography.h1, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
              Verify Phone
            </Text>
            <Text style={[typography.body, { color: '#9E9FBB', marginBottom: spacing.xxl }]}>
              Enter the 6-digit code sent to your phone number.
            </Text>

            {/* OTP Input Boxes */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => {
                    inputs.current[i] = ref;
                  }}
                  value={digit}
                  onChangeText={(text) => handleChange(text, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={{
                    width: 48,
                    height: 56,
                    borderRadius: borderRadius.md,
                    borderWidth: 2,
                    borderColor: digit
                      ? colors.primary[500]
                      : colors.secondary[400],
                    backgroundColor: colors.secondary[500],
                    color: '#FFFFFF',
                    fontSize: 24,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                  selectionColor={colors.primary[500]}
                />
              ))}
            </View>

            {/* Resend link */}
            <Text
              style={[
                typography.bodySmall,
                { color: colors.primary[500], textAlign: 'center', marginBottom: spacing.lg },
              ]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              Resend Code
            </Text>

            <Text
              style={[
                typography.caption,
                { color: '#9E9FBB', textAlign: 'center', marginBottom: spacing.xl },
              ]}
            >
              Phase 1: Pre-filled with 123456 for testing
            </Text>

            {/* Verify button — inside ScrollView so keyboard doesn't hide it */}
            <Button
              title="Verify"
              onPress={handleVerify}
              loading={loading}
              disabled={loading}
              size="large"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

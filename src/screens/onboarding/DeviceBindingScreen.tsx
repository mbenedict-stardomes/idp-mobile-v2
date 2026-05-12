import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import { api, ApiError } from '../../services/api';
import { saveDeviceData, getOnboardingState } from '../../services/onboarding';
import { setJourneyStep } from '../../services/journeyTelemetry';
import { getSecureItem, saveSecureItem } from '../../services/secureStorage';
import { FidoService } from '../../services/fido';

export default function DeviceBindingScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing, iconSizes } = useTheme();
  const [status, setStatus] = useState<'binding' | 'success' | 'error'>('binding');
  const [errorMsg, setErrorMsg] = useState('');

  const bindDevice = async () => {
    setStatus('binding');
    setErrorMsg('');

    try {
      const onboarding = await getOnboardingState();
      if (!onboarding.identityId) {
        throw new Error('Identity ID not found. Please restart onboarding.');
      }

      // Constants.installationId is removed in expo-constants 17+; use a stable ID persisted in secure storage.
      // An empty string means a previous attempt failed and the ID was cleared — generate a new one.
      let devicePermanentId = await getSecureItem('DEVICE_PERMANENT_ID');
      if (!devicePermanentId || devicePermanentId === '') {
        devicePermanentId = `device-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        await saveSecureItem('DEVICE_PERMANENT_ID', devicePermanentId);
      }
      
      // Step 1: Get Registration Challenge
      const challengeResponse = await api.getRegistrationChallenge(onboarding.identityId);
      const { session_id, challenge } = challengeResponse;

      // Step 2: Generate FIDO2 keypair and store in secure enclave (biometric prompt)
      const attestation = await FidoService.generateKeyAndAttest(devicePermanentId, challenge);

      // Step 3: Register Device with Attestation
      const deviceInfo = {
        session_id,
        identity_id: onboarding.identityId,
        device_permanent_id: devicePermanentId,
        device_model:
          (Constants as any).deviceName || `${Platform.OS} Device`,
        os_type: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        os_version: String(Platform.Version || 'unknown'),
        attestation_response: attestation,
      };

      const result = await api.registerDevice(deviceInfo);
      await saveDeviceData(result.device_id);
      setJourneyStep('COMPLETE');
      setStatus('success');

      // Auto-advance after brief pause
      setTimeout(() => {
        navigation.navigate('OnboardingComplete');
      }, 1200);
    } catch (err) {
      // Clear the persisted device permanent ID on any registration failure so
      // the next retry generates a fresh one (avoids UNIQUE constraint conflicts
      // from partially-inserted rows that were cleaned up server-side).
      await saveSecureItem('DEVICE_PERMANENT_ID', '');
      setStatus('error');
      if (err instanceof ApiError) {
        console.error(`[DeviceBinding] API Error ${err.status} | code: ${err.code} | desc: ${err.description}`);
        setErrorMsg(err.description ?? `Server error (${err.status})`);
      } else if (err instanceof Error) {
        console.error(`[DeviceBinding] Error: ${err.message}`);
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    }
  };

  useEffect(() => {
    bindDevice();
  }, []);

  const stepIndex = 5;

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
          {status === 'binding' && (
            <>
              <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginBottom: spacing.lg }} />
              <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.sm }]}>
                Binding Your Device
              </Text>
              <Text style={[typography.body, { color: '#9E9FBB', textAlign: 'center' }]}>
                Registering hardware-backed credentials with the IdP server...
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <Ionicons
                name="checkmark-circle"
                size={iconSizes.xxl}
                color={colors.accent[500]}
                style={{ marginBottom: spacing.lg }}
              />
              <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center' }]}>
                Device Bound
              </Text>
            </>
          )}

          {status === 'error' && (
            <>
              <Ionicons
                name="alert-circle-outline"
                size={iconSizes.xxl}
                color={colors.error.main}
                style={{ marginBottom: spacing.lg }}
              />
              <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.sm }]}>
                Binding Failed
              </Text>
              <Text style={[typography.body, { color: '#9E9FBB', textAlign: 'center', marginBottom: spacing.xl }]}>
                {errorMsg}
              </Text>
              <Button title="Retry" onPress={bindDevice} size="large" />
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

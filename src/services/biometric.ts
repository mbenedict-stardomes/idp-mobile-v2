import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricLabel: string; // 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Biometric'
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let biometricLabel = 'Biometric';
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    biometricLabel = 'Face ID';
  } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    biometricLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }

  return { hasHardware, isEnrolled, supportedTypes, biometricLabel };
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  });
  return result.success;
}

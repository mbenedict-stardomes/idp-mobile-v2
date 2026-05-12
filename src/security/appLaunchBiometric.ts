import * as LocalAuthentication from 'expo-local-authentication';

export const authenticateAppLaunch = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // Fallback if no biometric hardware or not enrolled (e.g. simulator)
    return true; 
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Stardomes IdP',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  });

  return result.success;
};

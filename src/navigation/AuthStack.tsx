import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { OnboardingStep } from '../services/onboarding';

import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import RegisterScreen from '../screens/onboarding/RegisterScreen';
import VerifyPhoneScreen from '../screens/onboarding/VerifyPhoneScreen';
import BiometricSetupScreen from '../screens/onboarding/BiometricSetupScreen';
import PINSetupScreen from '../screens/onboarding/PINSetupScreen';
import DeviceBindingScreen from '../screens/onboarding/DeviceBindingScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const STEP_TO_SCREEN: Record<number, keyof AuthStackParamList> = {
  [OnboardingStep.WELCOME]: 'Welcome',
  [OnboardingStep.REGISTER_IDENTITY]: 'RegisterIdentity',
  [OnboardingStep.VERIFY_PHONE]: 'VerifyPhone',
  [OnboardingStep.BIOMETRIC_SETUP]: 'BiometricSetup',
  [OnboardingStep.PIN_SETUP]: 'PINSetup',
  [OnboardingStep.DEVICE_BINDING]: 'DeviceBinding',
  [OnboardingStep.COMPLETE]: 'OnboardingComplete',
};

interface Props {
  initialStep?: OnboardingStep;
}

export default function AuthStack({ initialStep = OnboardingStep.WELCOME }: Props) {
  const initialRoute = STEP_TO_SCREEN[initialStep] || 'Welcome';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RegisterIdentity" component={RegisterScreen} />
      <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="PINSetup" component={PINSetupScreen} />
      <Stack.Screen name="DeviceBinding" component={DeviceBindingScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </Stack.Navigator>
  );
}

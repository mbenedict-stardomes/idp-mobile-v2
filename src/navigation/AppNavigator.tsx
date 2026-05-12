import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { TerminalScreen } from '../screens/settings/TerminalScreen';
import { AppContextProvider } from './AppContext';
import { getSessionToken } from '../services/session';
import {
  getOnboardingState,
  isOnboardingComplete,
  OnboardingStep,
} from '../services/onboarding';
import { colors } from '../theme';

type RootRoutes = {
  Auth: undefined;
  Main: undefined;
  Terminal: undefined;
};

const RootStack = createNativeStackNavigator<RootRoutes>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [route, setRoute] = useState<'Auth' | 'Main'>('Auth');
  const [initialStep, setInitialStep] = useState(OnboardingStep.WELCOME);

  const bootstrap = useCallback(async () => {
    try {
      const [token, onboarding] = await Promise.all([
        getSessionToken(),
        getOnboardingState(),
      ]);

      if (token && isOnboardingComplete(onboarding)) {
        setRoute('Main');
      } else if (onboarding.step > OnboardingStep.WELCOME) {
        setRoute('Auth');
        setInitialStep(onboarding.step);
      } else {
        setRoute('Auth');
        setInitialStep(OnboardingStep.WELCOME);
      }
    } catch {
      setRoute('Auth');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onOnboardingDone = useCallback(() => {
    setRoute('Main');
  }, []);

  const onLogout = useCallback(() => {
    setRoute('Auth');
    setInitialStep(OnboardingStep.WELCOME);
  }, []);

  const appContext = useMemo(
    () => ({ onOnboardingDone, onLogout }),
    [onOnboardingDone, onLogout],
  );

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.secondary[900],
        }}
      >
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <AppContextProvider value={appContext}>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {route === 'Main' ? (
            <RootStack.Group>
              <RootStack.Screen name="Main" component={MainTabs} />
              <RootStack.Screen name="Terminal" component={TerminalScreen} options={{ headerShown: true, headerStyle: { backgroundColor: '#0A0B25' }, headerTintColor: '#fff', title: '' }} />
            </RootStack.Group>
          ) : (
            <RootStack.Screen name="Auth">
              {() => <AuthStack initialStep={initialStep} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
}

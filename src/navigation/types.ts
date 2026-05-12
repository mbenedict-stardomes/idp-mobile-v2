export type AuthStackParamList = {
  Welcome: undefined;
  RegisterIdentity: undefined;
  VerifyPhone: undefined;
  BiometricSetup: undefined;
  PINSetup: undefined;
  DeviceBinding: undefined;
  OnboardingComplete: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Account: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: { initialStep?: number };
  Main: undefined;
  Terminal: undefined;
};

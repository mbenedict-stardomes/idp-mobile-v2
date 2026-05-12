import { saveSecureItem, getSecureItem, deleteSecureItem } from './secureStorage';

// ---------------------------------------------------------------------------
// Onboarding step enum — each step maps to a screen in AuthStack
// ---------------------------------------------------------------------------

export enum OnboardingStep {
  WELCOME = 0,
  REGISTER_IDENTITY = 1,
  VERIFY_PHONE = 2,
  BIOMETRIC_SETUP = 3,
  PIN_SETUP = 4,
  DEVICE_BINDING = 5,
  COMPLETE = 6,
}

// ---------------------------------------------------------------------------
// SecureStore keys
// ---------------------------------------------------------------------------

const KEYS = {
  STEP: 'ONBOARDING_STEP',
  IDENTITY_ID: 'ONBOARDING_IDENTITY_ID',
  SUBJECT_ID: 'ONBOARDING_SUBJECT_ID',
  DISPLAY_NAME: 'ONBOARDING_DISPLAY_NAME',
  EMAIL: 'ONBOARDING_EMAIL',
  PHONE: 'ONBOARDING_PHONE',
  DEVICE_ID: 'ONBOARDING_DEVICE_ID',
  BIOMETRIC_ENROLLED: 'ONBOARDING_BIOMETRIC_ENROLLED',
  PIN_SET: 'ONBOARDING_PIN_SET',
} as const;

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface OnboardingState {
  step: OnboardingStep;
  identityId: string | null;
  subjectId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  deviceId: string | null;
  biometricEnrolled: boolean;
  pinSet: boolean;
}

// ---------------------------------------------------------------------------
// Read full state (called on app launch)
// ---------------------------------------------------------------------------

export async function getOnboardingState(): Promise<OnboardingState> {
  const [step, identityId, subjectId, displayName, email, phone, deviceId, biometric, pin] =
    await Promise.all([
      getSecureItem(KEYS.STEP),
      getSecureItem(KEYS.IDENTITY_ID),
      getSecureItem(KEYS.SUBJECT_ID),
      getSecureItem(KEYS.DISPLAY_NAME),
      getSecureItem(KEYS.EMAIL),
      getSecureItem(KEYS.PHONE),
      getSecureItem(KEYS.DEVICE_ID),
      getSecureItem(KEYS.BIOMETRIC_ENROLLED),
      getSecureItem(KEYS.PIN_SET),
    ]);

  return {
    step: step ? (parseInt(step, 10) as OnboardingStep) : OnboardingStep.WELCOME,
    identityId: identityId || null,
    subjectId: subjectId || null,
    displayName: displayName || null,
    email: email || null,
    phone: phone || null,
    deviceId: deviceId || null,
    biometricEnrolled: biometric === 'true',
    pinSet: pin === 'true',
  };
}

// ---------------------------------------------------------------------------
// Step-specific savers (persist data + advance step atomically)
// ---------------------------------------------------------------------------

export async function saveOnboardingStep(step: OnboardingStep): Promise<void> {
  await saveSecureItem(KEYS.STEP, step.toString());
}

/** Called after POST /v1/app/identity/register succeeds */
export async function saveIdentityData(data: {
  identityId: string;
  subjectId: string;
  displayName: string;
  email: string;
  phone: string;
}): Promise<void> {
  await Promise.all([
    saveSecureItem(KEYS.IDENTITY_ID, data.identityId),
    saveSecureItem(KEYS.SUBJECT_ID, data.subjectId),
    saveSecureItem(KEYS.DISPLAY_NAME, data.displayName),
    saveSecureItem(KEYS.EMAIL, data.email),
    saveSecureItem(KEYS.PHONE, data.phone),
    saveOnboardingStep(OnboardingStep.VERIFY_PHONE),
  ]);
}

/** Called after phone OTP verified */
export async function markPhoneVerified(): Promise<void> {
  await saveOnboardingStep(OnboardingStep.BIOMETRIC_SETUP);
}

/** Called after biometric enrolled (or skipped) */
export async function markBiometricEnrolled(): Promise<void> {
  await Promise.all([
    saveSecureItem(KEYS.BIOMETRIC_ENROLLED, 'true'),
    saveOnboardingStep(OnboardingStep.PIN_SETUP),
  ]);
}

/** Called after fallback PIN is set */
export async function markPinSet(): Promise<void> {
  await Promise.all([
    saveSecureItem(KEYS.PIN_SET, 'true'),
    saveOnboardingStep(OnboardingStep.DEVICE_BINDING),
  ]);
}

/** Called after POST /v1/app/device/register succeeds */
export async function saveDeviceData(deviceId: string): Promise<void> {
  await Promise.all([
    saveSecureItem(KEYS.DEVICE_ID, deviceId),
    saveOnboardingStep(OnboardingStep.COMPLETE),
  ]);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export async function clearOnboardingState(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => deleteSecureItem(key)));
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.step >= OnboardingStep.COMPLETE;
}

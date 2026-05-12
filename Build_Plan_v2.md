s# IdP Mobile App (Stardomes 2FA) — Build Plan & Function Points

> **Version:** 1.0
> **Framework:** React Native (iOS + Android)
> **Purpose:** End-user 2FA authenticator app with FIDO2/biometric, OTP display, device binding, and satellite (BLE) channel support
> **Security:** Secure Enclave (iOS) / StrongBox TEE (Android) for key storage

---

## 1. Mobile App Scope

The Stardomes Mobile App is the **end-user authenticator** — Person A uses this app to:

1. Register identity and verify via UAE ID
2. Bind their device with hardware-backed FIDO2 keys
3. Receive and respond to 2FA challenges (push + satellite/BLE)
4. Display OTP for simplex (satellite) mode
5. Approve/deny transactions with biometric authentication

```
┌──────────────────────────────────────────────────────────┐
│                  Stardomes Mobile App                     │
│           (React Native — iOS + Android)                  │
└────────┬───────────────────────────┬─────────────────────┘
         │                           │
   HTTPS (WiFi/5G)           BLE (Satellite Mode)
         │                           │
┌────────▼───────────┐    ┌──────────▼──────────────────┐
│   Kong Gateway     │    │  ESP32-LoRa Terminal        │
│  → IdP Backend     │    │  (GATT: RX_DATA, TX_DATA)   │
│  /v1/app/*         │    └─────────────────────────────┘
└────────────────────┘
```

---

## 2. App Modules & Function Points

### Module 1: Onboarding & Registration

| FP#      | Function           | Type  | Description                                                      |
| -------- | ------------------ | ----- | ---------------------------------------------------------------- |
| M-REG-01 | welcomeScreen      | UI    | App intro with privacy policy and terms acceptance               |
| M-REG-02 | registerIdentity   | Write | Collect name, email, phone → call POST /v1/app/identity/register |
| M-REG-03 | verifyPhone        | Write | OTP verification of phone number                                 |
| M-REG-04 | verifyEmail        | Write | Email verification link/code                                     |
| M-REG-05 | initiateUAEPassKYC | Write | Launch UAE Pass SDK for Emirates ID verification                 |
| M-REG-06 | submitKYCResult    | Write | Send verification checksum → POST /v1/app/identity/{id}/verify   |
| M-REG-07 | setupBiometric     | Write | Enroll FaceID/TouchID/Fingerprint for app-level auth             |
| M-REG-08 | setupPIN           | Write | Fallback PIN setup for biometric failure                         |

### Module 2: Device Binding & FIDO2

| FP#      | Function               | Type     | Description                                                       |
| -------- | ---------------------- | -------- | ----------------------------------------------------------------- |
| M-DEV-01 | fetchRegChallenge      | Write    | POST /v1/app/device/registration-challenge to get FIDO2 challenge |
| M-DEV-02 | generateFIDO2KeyPair   | Internal | Generate key pair & attestation (Secure Enclave/StrongBox)        |
| M-DEV-03 | registerDevice         | Write    | POST /v1/app/device/register with session_id + attestation        |
| M-DEV-04 | storeDeviceCredentials | Internal | Persist device_id and FIDO2 credential ID in secure storage       |
| M-DEV-05 | checkAttestationStatus | Read     | Poll device trust status until is_trusted = true                  |
| M-DEV-06 | viewDeviceInfo         | Read     | Display device registration status and key info                   |
| M-DEV-07 | revokeOwnDevice        | Write    | Self-service device revocation (REPLACED scenario)                |

### Module 3: Push Notification Channel (WiFi/5G Mode)

| FP#       | Function                | Type     | Description                                               |
| --------- | ----------------------- | -------- | --------------------------------------------------------- |
| M-PUSH-01 | registerPushToken       | Write    | Register APNs/FCM push token with IdP backend             |
| M-PUSH-02 | receivePushNotification | Internal | Handle incoming push notification payload                 |
| M-PUSH-03 | wakeAndFetchChallenge   | Read     | On push receipt → GET /v1/app/challenge/pending           |
| M-PUSH-04 | displayChallengeAlert   | UI       | Show notification banner with bank name + binding message |
| M-PUSH-05 | backgroundRefresh       | Internal | Periodic background fetch for pending challenges          |

### Module 4: BLE Satellite Channel

| FP#      | Function                | Type     | Description                                                 |
| -------- | ----------------------- | -------- | ----------------------------------------------------------- |
| M-BLE-01 | scanForTerminal         | Internal | Background BLE scan for UUID_STARDOMES_SERVICE              |
| M-BLE-02 | connectAndPair          | Internal | LESC secure pairing with Stardomes terminal                 |
| M-BLE-03 | subscribeRXData         | Internal | Subscribe to UUID_RX_DATA notifications                     |
| M-BLE-04 | receiveEncryptedBlob    | Internal | Receive reassembled satellite payload via BLE               |
| M-BLE-05 | decryptPayload          | Internal | Decrypt blob using Secure Enclave private key               |
| M-BLE-06 | sendSignedResponse      | Write    | Write FIDO2 signed response to UUID_TX_DATA (duplex)        |
| M-BLE-07 | handleDisconnection     | Internal | Cache last payload, auto-reconnect on BLE drop              |
| M-BLE-08 | terminalStatusIndicator | UI       | Display BLE connection status (connected/searching/offline) |

### Module 5: Authentication Challenge UX

| FP#       | Function           | Type     | Description                                                  |
| --------- | ------------------ | -------- | ------------------------------------------------------------ |
| M-AUTH-01 | displayChallenge   | UI       | Full-screen challenge: bank name, amount, payee, timestamp   |
| M-AUTH-02 | showBindingMessage | UI       | Display human-readable binding_message from CIBA request     |
| M-AUTH-03 | promptBiometric    | Internal | Trigger FaceID/TouchID/Fingerprint to unlock FIDO2 key       |
| M-AUTH-04 | promptPIN          | Internal | Fallback PIN entry if biometric fails                        |
| M-AUTH-05 | signChallenge      | Internal | Sign backend FIDO2 challenge (generate authData, clientData) |
| M-AUTH-06 | submitApproval     | Write    | POST /v1/app/challenge/{id}/respond with fido2_assertion     |
| M-AUTH-07 | submitDenial       | Write    | POST /v1/app/challenge/{id}/respond with action=DENY         |
| M-AUTH-08 | displayOTP         | UI       | Large bold OTP with countdown timer (simplex satellite mode) |
| M-AUTH-09 | displayResult      | UI       | Success/failure confirmation screen                          |
| M-AUTH-10 | vibrateAndSound    | Internal | Haptic feedback + alert sound on challenge arrival           |

### Module 6: PAR Flow (App-to-App Redirect)

| FP#      | Function            | Type     | Description                                                  |
| -------- | ------------------- | -------- | ------------------------------------------------------------ |
| M-PAR-01 | handleDeepLink      | Internal | Receive request_uri via deep link from banking app           |
| M-PAR-02 | resolveRequestURI   | Read     | Call IdP backend to resolve request_uri to challenge details |
| M-PAR-03 | displayPARChallenge | UI       | Show linking/auth prompt from PAR flow                       |
| M-PAR-04 | approveAndRedirect  | Write    | Approve + redirect back to banking app with auth code        |

### Module 7: Transaction History

| FP#       | Function               | Type | Description                                          |
| --------- | ---------------------- | ---- | ---------------------------------------------------- |
| M-HIST-01 | listRecentTransactions | Read | Display last 30 days of auth requests with status    |
| M-HIST-02 | viewTransactionDetail  | Read | Detail view: bank, amount, timestamp, method, result |
| M-HIST-03 | filterByStatus         | Read | Filter by APPROVED/DENIED/EXPIRED                    |
| M-HIST-04 | filterByBank           | Read | Filter by client/bank name                           |

### Module 8: Settings & Profile

| FP#      | Function                | Type  | Description                                                     |
| -------- | ----------------------- | ----- | --------------------------------------------------------------- |
| M-SET-01 | viewProfile             | Read  | Display identity info (name, email, phone, verification status) |
| M-SET-02 | viewLinkedBanks         | Read  | List all client bindings (banks linked to this identity)        |
| M-SET-03 | revokeConsent           | Write | Revoke consent for a specific bank                              |
| M-SET-04 | manageBiometric         | Write | Re-enroll or change biometric preference                        |
| M-SET-05 | changePIN               | Write | Update fallback PIN                                             |
| M-SET-06 | viewTerminalStatus      | Read  | BLE terminal connection info and paired terminal                |
| M-SET-07 | notificationPreferences | Write | Configure push notification settings                            |
| M-SET-08 | deleteAccount           | Write | Request account deletion (GDPR/PDPL compliance)                 |

### Module 9: Security & Session

| FP#      | Function               | Type     | Description                                               |
| -------- | ---------------------- | -------- | --------------------------------------------------------- |
| M-SEC-01 | appLaunchBiometric     | Internal | Require biometric/PIN to open app                         |
| M-SEC-02 | sessionTokenManagement | Internal | Acquire, refresh, and store session tokens securely       |
| M-SEC-03 | jailbreakDetection     | Internal | Detect rooted/jailbroken devices, warn or block           |
| M-SEC-04 | appIntegrityCheck      | Internal | Verify app binary integrity (App Attest / Play Integrity) |
| M-SEC-05 | secureStorageWrapper   | Internal | Keychain (iOS) / EncryptedSharedPreferences (Android)     |
| M-SEC-06 | screenshotPrevention   | Internal | Block screenshots on challenge screens                    |
| M-SEC-07 | inactivityTimeout      | Internal | Auto-lock after configurable inactivity period            |

---

## 3. API Contracts Consumed by Mobile App

| App Action                 | Backend API                                       | Method |
| -------------------------- | ------------------------------------------------- | ------ |
| Register identity          | `POST /v1/app/identity/register`                  | POST   |
| Submit UAE ID verification | `POST /v1/app/identity/{id}/verify`               | POST   |
| Fetch Reg Challenge        | `POST /v1/app/device/registration-challenge`      | POST   |
| Register device            | `POST /v1/app/device/register`                    | POST   |
| Check device trust         | `GET /v1/app/device/{id}/status`                  | GET    |
| Register push token        | `POST /v1/app/device/{id}/push-token`             | POST   |
| Fetch pending challenges   | `GET /v1/app/challenge/pending`                   | GET    |
| Submit challenge response  | `POST /v1/app/challenge/{id}/respond`             | POST   |
| Resolve PAR request_uri    | `GET /v1/app/par/resolve?request_uri={uri}`       | GET    |
| List transaction history   | `GET /v1/app/history?from={d}&to={d}&status={s}`  | GET    |
| View transaction detail    | `GET /v1/app/history/{id}`                        | GET    |
| View profile               | `GET /v1/app/identity/me`                         | GET    |
| List linked banks          | `GET /v1/app/identity/me/bindings`                | GET    |
| Revoke consent             | `DELETE /v1/app/identity/me/bindings/{client_id}` | DELETE |
| Revoke device              | `POST /v1/app/device/{id}/revoke`                 | POST   |
| Delete account             | `POST /v1/app/identity/me/delete`                 | POST   |
| Session login              | `POST /v1/app/auth/login`                         | POST   |
| Refresh token              | `POST /v1/app/auth/refresh`                       | POST   |

---

## 4. Mobile App Folder Structure

```
03_MobileApp/
├── src/
│   ├── App.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Root stack navigator
│   │   ├── AuthStack.tsx            # Onboarding/registration flow
│   │   ├── MainStack.tsx            # Authenticated app screens
│   │   └── linking.ts               # Deep link configuration (PAR)
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── WelcomeScreen.tsx    # M-REG-01
│   │   │   ├── RegisterScreen.tsx   # M-REG-02 to M-REG-04
│   │   │   ├── KYCScreen.tsx        # M-REG-05, M-REG-06
│   │   │   ├── BiometricSetup.tsx   # M-REG-07
│   │   │   └── PINSetup.tsx         # M-REG-08
│   │   ├── device/
│   │   │   └── DeviceBinding.tsx    # M-DEV-01 to M-DEV-07
│   │   ├── challenge/
│   │   │   ├── ChallengeScreen.tsx  # M-AUTH-01 to M-AUTH-07
│   │   │   ├── OTPDisplay.tsx       # M-AUTH-08
│   │   │   └── ResultScreen.tsx     # M-AUTH-09
│   │   ├── history/
│   │   │   ├── HistoryList.tsx      # M-HIST-01, M-HIST-03, M-HIST-04
│   │   │   └── HistoryDetail.tsx    # M-HIST-02
│   │   ├── settings/
│   │   │   ├── ProfileScreen.tsx    # M-SET-01
│   │   │   ├── LinkedBanks.tsx      # M-SET-02, M-SET-03
│   │   │   ├── SecuritySettings.tsx # M-SET-04, M-SET-05
│   │   │   ├── TerminalScreen.tsx   # M-SET-06
│   │   │   └── Preferences.tsx      # M-SET-07, M-SET-08
│   │   └── par/
│   │       └── PARFlowScreen.tsx    # M-PAR-01 to M-PAR-04
│   ├── services/
│   │   ├── api.ts                   # HTTP client with auth headers
│   │   ├── fido2.ts                 # FIDO2 key generation, attestation, signing
│   │   ├── biometric.ts            # FaceID/TouchID/Fingerprint abstraction
│   │   ├── ble.ts                   # BLE manager (scan, connect, GATT ops)
│   │   ├── push.ts                  # Push notification handler (APNs/FCM)
│   │   ├── crypto.ts                # Encryption/decryption with Secure Enclave
│   │   ├── secureStorage.ts         # Keychain / EncryptedSharedPreferences
│   │   └── session.ts               # Session token lifecycle
│   ├── hooks/
│   │   ├── useBLE.ts                # BLE state management hook
│   │   ├── useChallenge.ts          # Challenge polling and lifecycle
│   │   ├── useBiometric.ts          # Biometric prompt hook
│   │   └── useSecureStorage.ts      # Secure read/write hook
│   ├── components/
│   │   ├── ChallengeCard.tsx        # Challenge display card
│   │   ├── OTPCountdown.tsx         # Large OTP with countdown ring
│   │   ├── BiometricPrompt.tsx      # Biometric/PIN modal
│   │   ├── BLEStatus.tsx            # Terminal connection indicator
│   │   ├── StatusBadge.tsx          # Approval/denial status pills
│   │   └── SecureView.tsx           # Screenshot prevention wrapper
│   ├── utils/
│   │   ├── deeplink.ts              # Deep link parser for request_uri
│   │   └── formatters.ts            # Currency, date, bank name formatting
│   └── security/
│       ├── jailbreakDetect.ts       # M-SEC-03
│       ├── appIntegrity.ts          # M-SEC-04
│       └── inactivityTimer.ts       # M-SEC-07
├── ios/                              # Xcode project
├── android/                          # Gradle project
├── package.json
└── app.json
```

---

## 5. Function Point Summary

| Module                      | Count  | Category      |
| --------------------------- | ------ | ------------- |
| Onboarding & Registration   | 8      | Core          |
| Device Binding & FIDO2      | 7      | Core          |
| Push Notification Channel   | 5      | Communication |
| BLE Satellite Channel       | 8      | Communication |
| Authentication Challenge UX | 10     | Core          |
| PAR Flow                    | 4      | OIDC          |
| Transaction History         | 4      | UX            |
| Settings & Profile          | 8      | UX            |
| Security & Session          | 7      | Security      |
| **TOTAL**                   | **61** |               |

---

## 6. Build Phases

### Phase 1 — Foundation (Week 1-2)

- React Native project scaffolding
- Navigation structure (AuthStack + MainStack)
- Secure storage wrapper (M-SEC-05)
- Session management (M-SEC-02)
- App launch biometric (M-SEC-01)

### Phase 2 — Onboarding (Week 3-4)

- Registration flow (M-REG-01 to M-REG-08)
- FIDO2 key generation in Secure Enclave (M-DEV-01)
- Device registration with attestation (M-DEV-02, M-DEV-03)
- UAE Pass SDK integration (M-REG-05)

### Phase 3 — Push Challenge Flow (Week 5-6)

- Push notification setup (M-PUSH-01 to M-PUSH-05)
- Challenge display UX (M-AUTH-01 to M-AUTH-10)
- FIDO2 signing and submission (M-AUTH-05, M-AUTH-06)
- OTP display for simplex mode (M-AUTH-08)

### Phase 4 — BLE Satellite Channel (Week 7-8)

- BLE scanning and pairing (M-BLE-01, M-BLE-02)
- GATT subscription and data receive (M-BLE-03, M-BLE-04)
- Payload decryption (M-BLE-05)
- Duplex response path (M-BLE-06)
- Offline resilience (M-BLE-07)

### Phase 5 — PAR Flow & Polish (Week 9-10)

- Deep link handling (M-PAR-01 to M-PAR-04)
- Transaction history (M-HIST-01 to M-HIST-04)
- Settings and profile (M-SET-01 to M-SET-08)
- Security hardening (M-SEC-03, M-SEC-04, M-SEC-06, M-SEC-07)

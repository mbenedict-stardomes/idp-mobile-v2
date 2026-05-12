# Stardomes IdP Mobile App v2

## Objective & Overview

The Stardomes IdP Mobile App is a cross-platform (iOS/Android) React Native application that serves as the end-user authenticator for secure 2FA, FIDO2 biometric authentication, device binding, and satellite (BLE) channel support. It leverages hardware-backed key storage (Secure Enclave/StrongBox) and supports both push and BLE-based challenge-response flows, including satellite integration for out-of-band authentication.

---

## High-Level Architecture

- **Frontend:** React Native (Expo/CLI)
- **Key Storage:** Secure Enclave (iOS) / StrongBox TEE (Android)
- **BLE Integration:** SatCom Terminal (ESP32-S3) for satellite FIDO2 flows
- **Backend:** IdP API via HTTPS (Kong Gateway)
- **Push Notifications:** APNs (iOS) / FCM (Android)
- **Crypto:** HMAC-SHA256, AES-GCM, FIDO2/WebAuthn

### Architecture Summary (from SDK & Satcom Guides)

```
+-------------------+         +-------------------+         +-------------------+
|  Mobile App (RN)  |<--BLE-->| Satcom Terminal   |<--LoRa--| Backend/Service   |
|  - BLE Manager    |         |  (ESP32-S3)       |         | - Azure Service   |
|  - FIDO2 Client   |         |  - BLE 0xFF06 RX  |         |   Bus, DB, APIs   |
|  - Crypto Utils   |         |  - BLE 0xFF05 TX  |         +-------------------+
+-------------------+         +-------------------+
```

- **Downstream:** Backend → LoRa → Terminal → BLE → Mobile (FIDO2 challenge)
- **Upstream:** Mobile → BLE → Terminal → LoRa → Backend (FIDO2 assertion)
- **All crypto operations are hardware-backed; no raw keys leave secure elements.**

---

## Build Components & Folder Structure

- **src/**
  - `App.tsx` — App entry point
  - `pages/` — Onboarding, registration, challenge, device management
  - `ble/` — BLE manager, Satcom integration, hooks
  - `fido2/` — FIDO2/WebAuthn flows
  - `components/` — UI components (ChallengeCard, DeviceList, etc.)
  - `services/` — API, push, secure storage
  - `utils/` — Crypto, formatters
- **android/**, **ios/** — Native modules and config
- **assets/** — Images, icons
- **app.json** — Expo/permissions
- **package.json** — Dependencies
- **EXPO_BLE_INTEGRATION.md** — BLE/Satcom integration guide
- **React SDK Developer Guide V2.md** — SDK usage and architecture
- **SatcomTerminalIntegrationGuide.md** — Satcom hardware integration

---

## Key Features & Modules

- **Onboarding & Registration:**
  - Identity registration, UAE ID verification, biometric/PIN setup
- **Device Binding & FIDO2:**
  - Hardware-backed keypair generation, attestation, device registration
- **Push Notification Channel:**
  - Receive and respond to 2FA challenges via APNs/FCM
- **BLE Satellite Channel:**
  - Scan, pair, and exchange FIDO2 challenges/responses with Satcom Terminal
- **Challenge Handling:**
  - Approve/deny with biometric, display OTP for simplex mode
- **Security:**
  - All secrets in secure storage, HMAC/AES for BLE, no raw key export

---

## Usage Example: BLE FIDO2 Flow

1. **BLE Scan & Pair:**
   - App scans for Satcom Terminal (UUID 0xFF00), pairs securely
2. **Receive Challenge:**
   - Terminal notifies app via 0xFF06 (JSON FIDO2 challenge)
3. **User Auth:**
   - App prompts biometric, generates FIDO2 assertion
4. **Send Assertion:**
   - App writes assertion to 0xFF05 with HMAC signature
5. **Terminal Relays:**
   - Terminal forwards assertion via LoRa to backend
6. **Backend Validates:**
   - Auth completes, app receives result

---

## References

- [Build_Plan_v2.md](Build_Plan_v2.md)
- [EXPO_BLE_INTEGRATION.md](EXPO_BLE_INTEGRATION.md)
- [React SDK Developer Guide V2.md](React%20SDK%20Developer%20Guide%20V2.md)
- [SatcomTerminalIntegrationGuide.md](SatcomTerminalIntegrationGuide.md)

---

For detailed API, BLE, and SDK usage, see the referenced guides.

# SatCom React Native SDK Integration Guide — V2

**Version:** 2.1 (Phase 1 + Phase 2 FIDO2 + Terminal Metadata)  
**Last Updated:** 2026-04-28  
**Compatible Firmware:** esp32_satcom_terminal (feat/satcom-phase2-upstream branch, with terminal metadata characteristics 0xFF07-0xFF09)

This SDK provides zero-configuration integration for React Native apps with the SatCom Terminal for satellite-backed FIDO2 authentication. It handles BLE scanning, secure challenge-response flows, HMAC signing, and graceful reconnection out of the box.

---

## 📋 Table of Contents

1. [What's New in V2](#whats-new-in-v2)
2. [Installation](#installation)
3. [Core Architecture](#core-architecture)
4. [The SDK: StardomesBLE.ts](#the-sdk-stardomesblests)
5. [The Hook: useSatcom.ts](#the-hook-usesatcomts)
6. [FIDO2 Authentication Flow](#fido2-authentication-flow)
7. [Building Components](#building-components)
8. [Advanced: HMAC Signing & Crypto](#advanced-hmac-signing--crypto)
9. [Error Handling & Debugging](#error-handling--debugging)
10. [Testing & Deployment](#testing--deployment)

---

## 🆕 What's New in V2

### Phase 1 Features (RX: Receive Challenges)
- **0xFF06 Challenge Characteristic:** Receive FIDO2 auth challenges from backend via terminal
- **JSON Challenge Parsing:** Extract user, origin, challenge, and credential requirements
- **Challenge State Management:** Track pending challenges and validation status

### Phase 2 Features (TX: Send Responses)
- **0xFF05 Response Characteristic:** Send FIDO2 assertions back to terminal
- **HMAC-SHA256 Signing:** Sign responses using device CWPK (per-device encryption key)
- **ACK Handling:** Wait for terminal confirmation (0xFF06 notify: `{"ack":"queued"}`)
- **Queue Status:** Monitor terminal upstream queue depth and availability

### Terminal Metadata Characteristics (NEW)
- **0xFF07 Terminal ID:** Read device identifier for audit logs and device pairing
- **0xFF08 MAC Address:** Read Bluetooth MAC for hardware tracking
- **0xFF09 HMAC Key:** Read device HMAC key for Phase 2 response signing

### Infrastructure Improvements
- **Better Characteristic Mapping:** Updated UUIDs for 0xFF01-0xFF09 characteristics
- **Crypto Utilities:** Built-in HMAC key derivation and signing
- **Enhanced Telemetry:** RSSI, SNR, uptime, upstream queue depth
- **Device Metadata:** Terminal ID, MAC, and HMAC key accessible via getter methods
- **Production Security:** Secure storage integration for CWPK provisioning

### Backward Compatibility
✅ Existing v1 code continues to work  
✅ All original telemetry/message features preserved  
✅ Opt-in FIDO2 support (enable only when needed)  
✅ Metadata characteristics are read-only and optional

---

## 💾 Installation

### Prerequisites
```bash
# Node.js 16+ and npm/yarn
node --version  # >= 16.0.0
npm --version   # >= 8.0.0
```

### Core Dependencies
```bash
npm install react-native-ble-plx buffer crypto-js uuid
npm install --save-dev @react-native-webauthn/webauthn

# For Expo projects
npx expo install expo-dev-client expo-secure-store
```

### Permissions Configuration

**app.json (Expo)**
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSBluetoothPeripheralUsageDescription": "BLE required for satellite terminal authentication",
        "NSBluetoothCentralUsageDescription": "BLE required to connect to satellite terminal"
      }
    },
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

**AndroidManifest.xml (Native React Native)**
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## 🏗️ Core Architecture

```
┌─────────────────────────────────────────────┐
│ Your React App                              │
│ ┌───────────────────────────────────────┐  │
│ │ UI Components (Screens, Forms)        │  │
│ │ ├─ useSatcom() hook                   │  │
│ │ ├─ useFIDO2Auth() hook (NEW)          │  │
│ │ └─ useTerminalStatus() hook           │  │
│ └───────────────────────────────────────┘  │
│            ↓                                │
│ ┌───────────────────────────────────────┐  │
│ │ SDK Layer (StardomesBLE.ts)           │  │
│ │ ├─ BLE Manager (scan, connect)        │  │
│ │ ├─ Characteristic Handlers            │  │
│ │ │  ├─ 0xFF01: Status (read)           │  │
│ │ │  ├─ 0xFF02: Auth Token (write)      │  │
│ │ │  ├─ 0xFF04: Messages (notify)       │  │
│ │ │  ├─ 0xFF05: Responses (write+HMAC) ├─ NEW
│ │ │  └─ 0xFF06: Challenges (notify)    ├─ NEW
│ │ ├─ Event Emitters                     │  │
│ │ └─ Crypto Utilities (HMAC, etc)      │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
          ↓ BLE (Bluetooth 5.0)
┌─────────────────────────────────────────────┐
│ SatCom Terminal (ESP32-S3)                  │
│ ├─ BLE GATT Server (0xFF00 service)        │
│ ├─ LoRa RX/TX (915 MHz)                    │
│ └─ Upstream Queue (Phase 2)                │
└─────────────────────────────────────────────┘
          ↓ LoRa / Satellite
┌─────────────────────────────────────────────┐
│ Backend (Azure)                             │
│ ├─ FIDO2 Challenge Generator                │
│ ├─ Response Validator                       │
│ └─ Auth State Manager                       │
└─────────────────────────────────────────────┘
```

---

## 🔧 The SDK: StardomesBLE.ts

Create `src/services/StardomesBLE.ts`:

```typescript
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import { Buffer } from "buffer";
import crypto from "crypto-js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TelemetryData {
  battery_pct: number;
  lora_rssi: number;
  snr: number;
  crypto_mode: number;
  uptime_seconds: number;
  fec_corrections: number;
  upstream_queue_depth: number; // NEW: Phase 2
}

export interface SatelliteMessage {
  id: string;
  ts: string;
  type: string;
  raw: string;
}

export interface FIDO2Challenge {
  type: string;
  challenge: string;
  origin: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: string;
    alg: number;
  }>;
  timeout: number;
  userVerification: string;
}

export interface FIDO2Response {
  type: string;
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  origin: string;
}

export interface TerminalACK {
  ack: string;
  timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CONSTANTS = {
  // Service UUID
  SERVICE: "0000ff00-0000-1000-8000-00805f9b34fb",

  // Characteristics
  CHR_STATUS: "0000ff01-0000-1000-8000-00805f9b34fb",      // Read: telemetry
  CHR_AUTH: "0000ff02-0000-1000-8000-00805f9b34fb",        // Write: auth token
  CHR_CONFIG: "0000ff03-0000-1000-8000-00805f9b34fb",      // Write: configuration
  CHR_MESSAGE: "0000ff04-0000-1000-8000-00805f9b34fb",     // Notify: messages
  CHR_RESPONSE: "0000ff05-0000-1000-8000-00805f9b34fb",    // Write: FIDO2 response (NEW)
  CHR_CHALLENGE: "0000ff06-0000-1000-8000-00805f9b34fb",   // Notify: FIDO2 challenge (NEW)
  CHR_TERMINAL_ID: "0000ff07-0000-1000-8000-00805f9b34fb",  // Read: terminal ID (NEW)
  CHR_MAC_ID: "0000ff08-0000-1000-8000-00805f9b34fb",       // Read: MAC address (NEW)
  CHR_HMAC: "0000ff09-0000-1000-8000-00805f9b34fb",         // Read: HMAC key (NEW)

  // Constants
  AUTH_TOKEN: "SATCOM_AUTH_TOKEN",
  DEVICE_NAME_PREFIX: "SatcomNode-",

  // Timeouts
  SCAN_TIMEOUT_MS: 15000,
  CONNECTION_TIMEOUT_MS: 10000,
  ACK_TIMEOUT_MS: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export class CryptoUtils {
  /**
   * Derive HMAC key from CWPK (CWPK XOR 0xAA)
   * Must match firmware's derivation for signature verification
   */
  static deriveHMACKey(cwpkHex: string): Buffer {
    const cwpk = Buffer.from(cwpkHex, "utf8");
    const hmacKey = Buffer.alloc(cwpk.length);
    for (let i = 0; i < cwpk.length; i++) {
      hmacKey[i] = cwpk[i] ^ 0xaa;
    }
    return hmacKey;
  }

  /**
   * Compute HMAC-SHA256 signature
   */
  static computeHMAC(data: Buffer, hmacKey: Buffer): Buffer {
    const hmac = crypto.HmacSHA256(
      Buffer.from(data).toString("hex"),
      Buffer.from(hmacKey).toString("hex")
    );
    return Buffer.from(hmac.toString(), "hex");
  }

  /**
   * Build response packet: [assertion_json] + [hmac_32bytes]
   */
  static buildResponsePacket(
    assertion: FIDO2Response,
    hmacKey: Buffer
  ): Buffer {
    const assertionJson = JSON.stringify(assertion);
    const assertionBytes = Buffer.from(assertionJson, "utf8");

    // Compute HMAC over assertion bytes
    const hmac = this.computeHMAC(assertionBytes, hmacKey);

    // Concatenate: assertion + hmac
    return Buffer.concat([assertionBytes, hmac]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BLE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class StardomesBLEClient {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private reconnectAttempts = 0;
  private isScanning = false;
  private hmacKey: Buffer | null = null; // Loaded from secure storage

  // Event Listeners
  public onConnectionChange?: (isConnected: boolean) => void;
  public onTelemetryUpdate?: (data: TelemetryData) => void;
  public onMessageArrival?: (msg: SatelliteMessage) => void;
  public onChallengeArrival?: (challenge: FIDO2Challenge) => void; // NEW
  public onACKReceived?: (ack: TerminalACK) => void; // NEW
  public onError?: (error: string) => void;

  constructor() {
    this.manager = new BleManager({
      restoreStateIdentifier: "StardomesBLE",
    });
  }

  /**
   * Initialize BLE hardware and start scanning
   */
  public initializeHardware(hmacKeySeed?: string) {
    // Load HMAC key if provided (production: from SecureStore)
    if (hmacKeySeed) {
      this.hmacKey = CryptoUtils.deriveHMACKey(hmacKeySeed);
    }

    const subscription = this.manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        console.log("[BLE] Bluetooth powered on, starting scan");
        this.scanAndConnect();
        subscription.remove();
      } else if (state === "PoweredOff") {
        this.onError?.("Bluetooth is disabled on this device");
      }
    }, true);
  }

  /**
   * Scan for terminal and connect
   */
  public scanAndConnect() {
    if (this.isScanning) return;
    this.isScanning = true;

    const timeoutHandle = setTimeout(() => {
      if (this.isScanning) {
        this.manager.stopDeviceScan();
        this.isScanning = false;
        this.onError?.("Scan timeout: Terminal not found");
      }
    }, CONSTANTS.SCAN_TIMEOUT_MS);

    this.manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      async (err, device) => {
        if (err) {
          console.warn("[BLE] Scan error:", err.message);
          return;
        }

        if (!device) return;

        const isSatcom =
          device.name?.startsWith(CONSTANTS.DEVICE_NAME_PREFIX) ||
          device.serviceUUIDs?.some(
            (id) =>
              id.toLowerCase().includes("ff00") ||
              id.toLowerCase() === CONSTANTS.SERVICE.toLowerCase()
          );

        if (isSatcom) {
          clearTimeout(timeoutHandle);
          this.manager.stopDeviceScan();
          this.isScanning = false;
          console.log(`[BLE] Found terminal: ${device.name}`);
          await this.connectToTerminal(device);
        }
      }
    );
  }

  /**
   * Connect to terminal and subscribe to characteristics
   */
  private async connectToTerminal(device: Device) {
    try {
      this.connectedDevice = await device.connect();
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      this.reconnectAttempts = 0;

      console.log(`[BLE] Connected to ${device.name}`);
      this.onConnectionChange?.(true);

      // Handle disconnection
      this.manager.onDeviceDisconnected(device.id, () => {
        console.warn("[BLE] Device disconnected");
        this.handleDisconnection();
      });

      // Subscribe to Status (0xFF01)
      this.subscribeToStatus();

      // Authenticate
      await this.authenticate();

      // Subscribe to Messages (0xFF04)
      this.subscribeToMessages();

      // Subscribe to Challenges (0xFF06) — NEW Phase 1
      this.subscribeToChallenges();

      // Subscribe to ACK notifications (0xFF06) — NEW Phase 2
      this.subscribeToACK();
    } catch (error: any) {
      console.error("[BLE] Connection failed:", error.message);
      this.onError?.(error.message);
      this.handleDisconnection();
    }
  }

  /**
   * Subscribe to telemetry updates (0xFF01)
   */
  private subscribeToStatus() {
    this.connectedDevice?.monitorCharacteristicForService(
      CONSTANTS.SERVICE,
      CONSTANTS.CHR_STATUS,
      (err, characteristic) => {
        if (err) {
          console.warn("[BLE] Status monitor error:", err.message);
          return;
        }

        if (characteristic?.value) {
          try {
            const telemetry: TelemetryData = JSON.parse(
              Buffer.from(characteristic.value, "base64").toString("utf8")
            );
            this.onTelemetryUpdate?.(telemetry);
          } catch (parseErr) {
            console.warn("[BLE] Failed to parse status:", parseErr);
          }
        }
      }
    );
  }

  /**
   * Send authentication token (0xFF02)
   */
  private async authenticate() {
    try {
      const authBytes = Buffer.from(CONSTANTS.AUTH_TOKEN, "utf8").toString(
        "base64"
      );
      await this.connectedDevice?.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_AUTH,
        authBytes
      );
      console.log("[BLE] Authenticated");
    } catch (error: any) {
      console.warn("[BLE] Authentication failed:", error.message);
    }
  }

  /**
   * Subscribe to messages (0xFF04)
   */
  private subscribeToMessages() {
    this.connectedDevice?.monitorCharacteristicForService(
      CONSTANTS.SERVICE,
      CONSTANTS.CHR_MESSAGE,
      (err, characteristic) => {
        if (err) {
          console.warn("[BLE] Message monitor error:", err.message);
          return;
        }

        if (characteristic?.value) {
          try {
            const messageJson = JSON.parse(
              Buffer.from(characteristic.value, "base64").toString("utf8")
            );
            const message: SatelliteMessage = {
              id: messageJson.msg_id || Math.random().toString(),
              ts: messageJson.timestamp || new Date().toISOString(),
              type: messageJson.type || "MESSAGE",
              raw: JSON.stringify(messageJson),
            };
            this.onMessageArrival?.(message);
          } catch (parseErr) {
            console.warn("[BLE] Failed to parse message:", parseErr);
          }
        }
      }
    );
  }

  /**
   * Subscribe to FIDO2 challenges (0xFF06) — NEW Phase 1
   */
  private subscribeToChallenges() {
    this.connectedDevice?.monitorCharacteristicForService(
      CONSTANTS.SERVICE,
      CONSTANTS.CHR_CHALLENGE,
      (err, characteristic) => {
        if (err) {
          console.warn("[BLE] Challenge monitor error:", err.message);
          return;
        }

        if (characteristic?.value) {
          try {
            const challengeJson = JSON.parse(
              Buffer.from(characteristic.value, "base64").toString("utf8")
            );

            if (challengeJson.type === "auth_challenge") {
              console.log("[BLE] FIDO2 Challenge received");
              this.onChallengeArrival?.(challengeJson as FIDO2Challenge);
            } else if (challengeJson.ack) {
              // Also handle ACK on 0xFF06
              console.log(`[BLE] ACK: ${challengeJson.ack}`);
              this.onACKReceived?.(challengeJson);
            }
          } catch (parseErr) {
            console.warn("[BLE] Failed to parse challenge:", parseErr);
          }
        }
      }
    );
  }

  /**
   * Monitor for ACK responses — NEW Phase 2
   */
  private subscribeToACK() {
    // Already handled in subscribeToChallenges
    // 0xFF06 is used for both challenges and ACKs
  }

  /**
   * Send FIDO2 response (0xFF05) — NEW Phase 2
   */
  public async sendFIDO2Response(assertion: FIDO2Response): Promise<boolean> {
    if (!this.connectedDevice || !this.hmacKey) {
      this.onError?.(
        "Not connected or HMAC key not loaded"
      );
      return false;
    }

    try {
      console.log("[BLE] Building response packet...");
      const packet = CryptoUtils.buildResponsePacket(assertion, this.hmacKey);

      console.log(`[BLE] Sending response: ${packet.length} bytes`);
      const base64Packet = packet.toString("base64");

      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_RESPONSE,
        base64Packet
      );

      console.log("[BLE] Response sent, waiting for ACK...");

      // Wait for ACK (timeout 5s)
      const ack = await this.waitForACK();
      console.log("[BLE] ACK received:", ack);
      return true;
    } catch (error: any) {
      console.error("[BLE] Failed to send response:", error.message);
      this.onError?.(error.message);
      return false;
    }
  }

  /**
   * Wait for terminal ACK on 0xFF06
   */
  private waitForACK(): Promise<TerminalACK> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("ACK timeout")),
        CONSTANTS.ACK_TIMEOUT_MS
      );

      const checkACK = () => {
        // Poll status for ack_received flag
        this.connectedDevice
          ?.readCharacteristicForService(CONSTANTS.SERVICE, CONSTANTS.CHR_STATUS)
          .then((chr) => {
            const status: any = JSON.parse(
              Buffer.from(chr.value, "base64").toString("utf8")
            );
            if (status.ack_received) {
              clearTimeout(timeout);
              resolve({ ack: "queued", timestamp: Date.now() });
            } else {
              setTimeout(checkACK, 500);
            }
          })
          .catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
      };

      checkACK();
    });
  }

  /**
   * Configure terminal settings (0xFF03)
   */
  public async setConfig(config: { crypto_mode?: number }): Promise<boolean> {
    if (!this.connectedDevice) return false;

    try {
      const payload = Buffer.from(JSON.stringify(config), "utf8").toString(
        "base64"
      );
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_CONFIG,
        payload
      );
      return true;
    } catch (error: any) {
      console.error("[BLE] Config write failed:", error.message);
      return false;
    }
  }

  /**
   * Read Terminal ID (0xFF07) — returns device identifier string
   */
  public async getTerminalId(): Promise<string | null> {
    if (!this.connectedDevice) return null;

    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_TERMINAL_ID
      );
      const decoded = Buffer.from(char.value || "", "base64").toString("utf8");
      console.log("[BLE] Terminal ID:", decoded);
      return decoded;
    } catch (error: any) {
      console.error("[BLE] Terminal ID read failed:", error.message);
      return null;
    }
  }

  /**
   * Read MAC Address (0xFF08) — returns MAC address string (aa:bb:cc:dd:ee:ff)
   */
  public async getMacAddress(): Promise<string | null> {
    if (!this.connectedDevice) return null;

    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_MAC_ID
      );
      const decoded = Buffer.from(char.value || "", "base64").toString("utf8");
      console.log("[BLE] MAC Address:", decoded);
      return decoded;
    } catch (error: any) {
      console.error("[BLE] MAC Address read failed:", error.message);
      return null;
    }
  }

  /**
   * Read HMAC Key (0xFF09) — returns 32-byte HMAC key (for FIDO2 response signing)
   */
  public async getHmacKey(): Promise<Buffer | null> {
    if (!this.connectedDevice) return null;

    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_HMAC
      );
      const buffer = Buffer.from(char.value || "", "base64");
      console.log("[BLE] HMAC key read, length:", buffer.length);
      return buffer;
    } catch (error: any) {
      console.error("[BLE] HMAC key read failed:", error.message);
      return null;
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection() {
    this.connectedDevice = null;
    this.onConnectionChange?.(false);

    const delays = [500, 1000, 2000, 5000];
    const delay = delays[Math.min(this.reconnectAttempts++, 3)];

    console.log(`[BLE] Reconnecting in ${delay}ms...`);
    setTimeout(
      () =>
        this.manager
          .state()
          .then((state) => {
            if (state === "PoweredOn") {
              this.scanAndConnect();
            }
          })
          .catch(console.warn),
      delay
    );
  }

  /**
   * Cleanup and disconnect
   */
  public async disconnect() {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (error) {
        console.warn("[BLE] Disconnect error:", error);
      }
      this.connectedDevice = null;
    }
    this.onConnectionChange?.(false);
  }
}

// Export singleton instance
export const StardomesClient = new StardomesBLEClient();
export { CryptoUtils };
```

---

## 🪝 The Hook: useSatcom.ts

Create `src/hooks/useSatcom.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  StardomesClient,
  TelemetryData,
  SatelliteMessage,
  FIDO2Challenge,
  FIDO2Response,
  TerminalACK,
  CryptoUtils,
} from "../services/StardomesBLE";

export const useSatcom = (hmacKeySeed?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [messages, setMessages] = useState<SatelliteMessage[]>([]);
  const [challenge, setChallenge] = useState<FIDO2Challenge | null>(null);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Initialize SDK
  useEffect(() => {
    // Register event handlers
    StardomesClient.onConnectionChange = (state) => {
      setIsConnected(state);
      if (!state) setChallenge(null);
    };

    StardomesClient.onTelemetryUpdate = (data) => setTelemetry(data);

    StardomesClient.onMessageArrival = (msg) => {
      setMessages((prev) => [msg, ...prev].slice(0, 50)); // Keep last 50
    };

    StardomesClient.onChallengeArrival = (chal) => {
      console.log("[Hook] Challenge arrived");
      setChallenge(chal);
    };

    StardomesClient.onACKReceived = (ack) => {
      console.log("[Hook] ACK received:", ack);
      setIsAuthProcessing(false);
    };

    StardomesClient.onError = (error) => {
      setLastError(error);
    };

    // Start BLE
    StardomesClient.initializeHardware(hmacKeySeed);

    return () => {
      StardomesClient.disconnect();
    };
  }, [hmacKeySeed]);

  // Send FIDO2 response
  const sendResponse = useCallback(
    async (assertion: FIDO2Response): Promise<boolean> => {
      setIsAuthProcessing(true);
      const success = await StardomesClient.sendFIDO2Response(assertion);
      setIsAuthProcessing(false);
      return success;
    },
    []
  );

  // Set config
  const setConfig = useCallback(
    async (config: { crypto_mode?: number }): Promise<boolean> => {
      return StardomesClient.setConfig(config);
    },
    []
  );

  return {
    // Connection state
    isConnected,
    lastError,

    // Data
    telemetry,
    messages,
    challenge,
    isAuthProcessing,

    // Actions
    sendResponse,
    setConfig,

    // Device metadata readers (NEW)
    getTerminalId: () => StardomesClient.getTerminalId(),
    getMacAddress: () => StardomesClient.getMacAddress(),
    getHmacKey: () => StardomesClient.getHmacKey(),
  };
};
```

---

## 🔐 FIDO2 Authentication Flow

### Step-by-Step

```typescript
// 1. Hook into auth screen
const { isConnected, challenge, isAuthProcessing, sendResponse } =
  useSatcom(cwpkHex);

// 2. When challenge arrives
useEffect(() => {
  if (challenge) {
    console.log("Challenge received from terminal:", challenge);
    // Trigger WebAuthn flow
    handleAuthChallenge(challenge);
  }
}, [challenge]);

// 3. Compute FIDO2 assertion (using native WebAuthn)
const handleAuthChallenge = async (chal: FIDO2Challenge) => {
  try {
    const assertion = await WebAuthn.get({
      publicKey: {
        challenge: chal.challenge,
        timeout: chal.timeout,
        userVerification: chal.userVerification,
        rpId: chal.rp.id,
        allowCredentials: [],
      },
    });

    // 4. Send response back via BLE (includes HMAC signing)
    const success = await sendResponse(assertion);

    if (success) {
      Alert.alert("✅ Success", "Auth completed via satellite!");
    } else {
      Alert.alert("❌ Failed", "Terminal rejected response");
    }
  } catch (error) {
    Alert.alert("❌ Error", error.message);
  }
};
```

### Full Integration

```typescript
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useSatcom } from "./hooks/useSatcom";
import WebAuthn from "@react-native-webauthn/webauthn";

export function AuthScreen() {
  const [authProgress, setAuthProgress] = useState<string>("");

  // Device's CWPK (in production, load from SecureStore)
  const CWPK_DEV = "A1B2C3D4E5F678901234567890ABCDEF"; // device-12345

  const {
    isConnected,
    challenge,
    isAuthProcessing,
    sendResponse,
    lastError,
  } = useSatcom(CWPK_DEV);

  useEffect(() => {
    if (challenge) {
      setAuthProgress("📨 Challenge received, starting FIDO2 authentication...");
      handleChallenge(challenge);
    }
  }, [challenge]);

  const handleChallenge = async (chal) => {
    try {
      setAuthProgress("🔐 Computing assertion...");

      const assertion = await WebAuthn.get({
        publicKey: {
          challenge: chal.challenge,
          timeout: chal.timeout || 60000,
          userVerification: chal.userVerification || "preferred",
          rpId: chal.rp.id,
        },
      });

      setAuthProgress("📤 Sending response to terminal...");
      const success = await sendResponse(assertion);

      if (success) {
        setAuthProgress("✅ Auth completed!");
        Alert.alert("Success", "FIDO2 authentication complete");
      } else {
        setAuthProgress("❌ Terminal rejected response");
        Alert.alert("Error", "Terminal rejected the response");
      }
    } catch (error) {
      setAuthProgress(`❌ Error: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        🛰️ SatCom Authentication
      </Text>

      {/* Status */}
      <View
        style={{
          padding: 15,
          backgroundColor: isConnected ? "#e8f5e9" : "#ffebee",
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </Text>
      </View>

      {/* Auth Progress */}
      {authProgress && (
        <View
          style={{
            padding: 15,
            backgroundColor: "#e3f2fd",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text>{authProgress}</Text>
          {isAuthProcessing && <ActivityIndicator />}
        </View>
      )}

      {/* Error Display */}
      {lastError && (
        <View
          style={{
            padding: 15,
            backgroundColor: "#ffebee",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "red" }}>❌ {lastError}</Text>
        </View>
      )}

      {/* Challenge Display */}
      {challenge && (
        <View
          style={{
            padding: 15,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            📨 Challenge:
          </Text>
          <Text>Origin: {challenge.origin}</Text>
          <Text>User: {challenge.user.displayName}</Text>
        </View>
      )}

      <Button
        title={isAuthProcessing ? "Processing..." : "Authenticate"}
        disabled={!isConnected || !challenge || isAuthProcessing}
        onPress={() => {
          if (challenge) handleChallenge(challenge);
        }}
      />
    </SafeAreaView>
  );
}
```

---

## 📱 Reading Device Metadata (Terminal ID, MAC, HMAC)

The SDK provides three getter methods to read device metadata characteristics:

### getTerminalId()
Returns the terminal's unique identifier (8-byte hex string).

```typescript
const { getTerminalId } = useSatcom();

const handleReadTerminalId = async () => {
  const terminalId = await getTerminalId();
  console.log("Terminal ID:", terminalId); // e.g., "0x123456789ABCDEF0"
  // Use for: audit logs, device pairing, multi-terminal scenarios
};
```

### getMacAddress()
Returns the terminal's Bluetooth MAC address.

```typescript
const { getMacAddress } = useSatcom();

const handleReadMac = async () => {
  const macAddr = await getMacAddress();
  console.log("MAC Address:", macAddr); // e.g., "aa:bb:cc:dd:ee:ff"
  // Use for: device identification, hardware tracking
};
```

### getHmacKey()
Returns the device's 32-byte HMAC key (used for Phase 2 response signing).

```typescript
const { getHmacKey } = useSatcom();

const handleReadHmac = async () => {
  const hmacBuffer = await getHmacKey();
  if (hmacBuffer) {
    const hmacHex = hmacBuffer.toString("hex");
    console.log("HMAC Key (hex):", hmacHex);
    // Use for: FIDO2 response signing, device provisioning
  }
};
```

### Example: Device Info Screen

```typescript
export const DeviceInfoScreen: React.FC = () => {
  const { isConnected, getTerminalId, getMacAddress, getHmacKey } = useSatcom();
  const [deviceInfo, setDeviceInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchDeviceInfo = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [termId, mac, hmac] = await Promise.all([
        getTerminalId(),
        getMacAddress(),
        getHmacKey(),
      ]);
      setDeviceInfo({
        terminalId: termId,
        macAddress: mac,
        hmacKeyHex: hmac?.toString("hex") || "N/A",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button
        title={loading ? "Loading..." : "Read Device Info"}
        onPress={fetchDeviceInfo}
        disabled={!isConnected || loading}
      />
      {deviceInfo && (
        <>
          <Text>Terminal ID: {deviceInfo.terminalId}</Text>
          <Text>MAC: {deviceInfo.macAddress}</Text>
          <Text>HMAC (hex): {deviceInfo.hmacKeyHex.substring(0, 32)}...</Text>
        </>
      )}
    </View>
  );
};
```

---

## 🎨 Building Components

### Status Indicator Component

```typescript
import React from "react";
import { View, Text } from "react-native";
import { TelemetryData } from "../services/StardomesBLE";

interface StatusIndicatorProps {
  isConnected: boolean;
  telemetry: TelemetryData | null;
}

export function StatusIndicator({
  isConnected,
  telemetry,
}: StatusIndicatorProps) {
  return (
    <View
      style={{
        padding: 15,
        backgroundColor: isConnected ? "#e8f5e9" : "#ffebee",
        borderRadius: 8,
        marginBottom: 15,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold" }}>
        {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
      </Text>

      {telemetry && (
        <View style={{ marginTop: 10 }}>
          <Text>📡 Signal: {telemetry.lora_rssi} dBm</Text>
          <Text>📊 Queue Depth: {telemetry.upstream_queue_depth}</Text>
          <Text>⏱️ Uptime: {telemetry.uptime_seconds}s</Text>
          <Text>🔋 Battery: {telemetry.battery_pct}%</Text>
        </View>
      )}
    </View>
  );
}
```

### Challenge Display Component

```typescript
import React from "react";
import { View, Text } from "react-native";
import { FIDO2Challenge } from "../services/StardomesBLE";

interface ChallengeDisplayProps {
  challenge: FIDO2Challenge | null;
}

export function ChallengeDisplay({ challenge }: ChallengeDisplayProps) {
  if (!challenge) return null;

  return (
    <View
      style={{
        padding: 15,
        backgroundColor: "#e8eaf6",
        borderRadius: 8,
        marginBottom: 15,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
        📨 FIDO2 Challenge
      </Text>
      <Text>Origin: {challenge.origin}</Text>
      <Text>RP: {challenge.rp.name}</Text>
      <Text>User: {challenge.user.displayName}</Text>
      <Text>Challenge: {challenge.challenge.substring(0, 50)}...</Text>
      <Text style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
        Timeout: {challenge.timeout / 1000}s
      </Text>
    </View>
  );
}
```

### Message Feed Component

```typescript
import React from "react";
import { FlatList, View, Text } from "react-native";
import { SatelliteMessage } from "../services/StardomesBLE";

interface MessageFeedProps {
  messages: SatelliteMessage[];
}

export function MessageFeed({ messages }: MessageFeedProps) {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View
          style={{
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          <Text style={{ fontWeight: "600" }}>
            {item.ts} - {item.type}
          </Text>
          <Text
            style={{ fontSize: 12, color: "#666", marginTop: 4 }}
            numberOfLines={2}
          >
            {item.raw}
          </Text>
        </View>
      )}
    />
  );
}
```

---

## 🔐 Advanced: HMAC Signing & Crypto

### Understanding HMAC Key Derivation

```typescript
// Terminal generates HMAC key during provisioning
// HMAC_KEY = CWPK XOR 0xAA

// Device (mobile app) must derive the same key:
const cwpkHex = "A1B2C3D4E5F678901234567890ABCDEF"; // 32 bytes
const hmacKey = CryptoUtils.deriveHMACKey(cwpkHex);

// hmacKey is then used to sign response packets
// Format: [assertion_json] + [HMAC-SHA256(assertion_json)]
```

### Secure Storage (Production)

```typescript
import * as SecureStore from "expo-secure-store";

// Store CWPK securely
export async function provisionCWPK(cwpkHex: string) {
  await SecureStore.setItemAsync("device_cwpk", cwpkHex);
}

// Load CWPK from secure storage
export async function loadCWPK(): Promise<string> {
  const cwpk = await SecureStore.getItemAsync("device_cwpk");
  if (!cwpk) {
    throw new Error("Device not provisioned - CWPK not found");
  }
  return cwpk;
}

// Usage in app
const cwpk = await loadCWPK();
const { isConnected, challenge, sendResponse } = useSatcom(cwpk);
```

---

## 🐛 Error Handling & Debugging

### Error Types & Recovery

```typescript
const BLE_ERRORS = {
  "Bluetooth is disabled": {
    message: "Please enable Bluetooth in Settings",
    action: "Navigate to Settings > Bluetooth",
  },
  "Scan timeout: Terminal not found": {
    message: "Terminal not detected",
    action: "Ensure terminal is powered on and nearby",
  },
  "ACK timeout": {
    message: "Terminal queue is full",
    action: "Wait a moment and retry authentication",
  },
  "Not connected or HMAC key not loaded": {
    message: "SDK not ready",
    action: "Ensure initialization complete",
  },
};

// Implement error handling
const { lastError } = useSatcom(cwpk);

useEffect(() => {
  if (lastError) {
    const resolution = BLE_ERRORS[lastError] || {
      message: lastError,
      action: "Contact support",
    };
    Alert.alert("❌ " + resolution.message, resolution.action);
  }
}, [lastError]);
```

### Debug Logging

```typescript
// Enable detailed logging
export const DEBUG = {
  logBLE: (message: string) => {
    console.log(`[BLE] ${new Date().toISOString()} - ${message}`);
  },
  logCrypto: (message: string) => {
    console.log(`[CRYPTO] ${new Date().toISOString()} - ${message}`);
  },
  logAuth: (message: string) => {
    console.log(`[AUTH] ${new Date().toISOString()} - ${message}`);
  },
};

// Usage
DEBUG.logBLE("Scanning for terminal...");
DEBUG.logCrypto("Deriving HMAC key...");
DEBUG.logAuth("Computing FIDO2 assertion...");
```

---

## 🚀 Testing & Deployment

### Unit Tests

```typescript
import { CryptoUtils } from "../services/StardomesBLE";

describe("CryptoUtils", () => {
  it("derives HMAC key correctly", () => {
    const cwpk = "A1B2C3D4E5F678901234567890ABCDEF";
    const hmacKey = CryptoUtils.deriveHMACKey(cwpk);

    // Verify XOR operation
    expect(hmacKey[0]).toBe(0xa1 ^ 0xaa);
    expect(hmacKey.length).toBe(32);
  });

  it("builds response packet with HMAC", () => {
    const assertion = {
      type: "fido2_response",
      id: "test-id",
      rawId: "dGVzdC1pZA==",
      response: {
        clientDataJSON: "test",
        authenticatorData: "test",
        signature: "test",
      },
      origin: "https://test.com",
    };

    const hmacKey = Buffer.from("00".repeat(32), "hex");
    const packet = CryptoUtils.buildResponsePacket(assertion, hmacKey);

    // Packet should be: assertion + 32 bytes HMAC
    expect(packet.length).toBeGreaterThan(32);
  });
});
```

### Integration Testing

```typescript
// 1. Mock terminal responses
export const mockChallengeResponse = {
  type: "auth_challenge",
  challenge: "dGVzdF9jaGFsbGVuZ2U=",
  origin: "https://idp.example.com",
  rp: { name: "Test IdP", id: "idp.example.com" },
  user: {
    id: "dXNlcl8x",
    name: "test@example.com",
    displayName: "Test User",
  },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
  timeout: 60000,
};

// 2. Test auth flow
it("authenticates with mock terminal", async () => {
  const { sendResponse } = useSatcom(cwpk);

  const assertion = {
    type: "fido2_response",
    id: "mock-id",
    rawId: "bW9jay1pZA==",
    response: {
      clientDataJSON: "mock",
      authenticatorData: "mock",
      signature: "mock",
    },
    origin: "https://idp.example.com",
  };

  const success = await sendResponse(assertion);
  expect(success).toBe(true);
});
```

### Deployment Checklist

- [ ] CWPK provisioned and stored securely (SecureStore)
- [ ] Proper error handling for all edge cases
- [ ] Debug logging disabled in production
- [ ] BLE permissions configured correctly
- [ ] WebAuthn/FIDO2 implementation tested
- [ ] HMAC key derivation matches firmware
- [ ] Connection recovery working (exponential backoff)
- [ ] ACK timeout handling implemented
- [ ] Timeout protection on all async operations

---

## 📚 Complete Example App

See `EXPO_APP_EXAMPLE.js` in the repository for a complete reference implementation with:

- Full BLE manager with all lifecycle management
- FIDO2 challenge/response handling
- UI components for status, challenges, and logging
- Real-time error display
- Production-ready code structure

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Terminal not found during scan | Verify terminal is powered on and in range (< 10m), enable Bluetooth on phone |
| "ACK timeout" error | Terminal upstream queue full; wait 10 seconds and retry |
| HMAC validation failed on terminal | Verify CWPK matches device provisioning, check XOR derivation |
| BLE connection drops | Check interference, move closer to terminal, verify iOS/Android permissions |
| WebAuthn not available | Ensure real device, not simulator; verify biometrics/PIN set up |
| Challenge never arrives | Check backend is sending challenges, verify LoRa RX working |

---

## 📖 Additional Resources

- [FIDO2 Specification](https://fidoalliance.org/fido2/)
- [WebAuthn API](https://www.w3.org/TR/webauthn-2/)
- [React Native BLE Documentation](https://github.com/dotintent/react-native-ble-plx)
- [Expo SecureStore](https://docs.expo.dev/modules/expo-secure-store/)
- [crypto-js Documentation](https://cryptojs.gitbook.io/docs/)

---

**Version 2.0 | Phase 1 + Phase 2 FIDO2 Support**  
Last Updated: 2026-04-27  
Maintained by: SatCom Development Team

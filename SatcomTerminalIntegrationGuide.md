# Stardomes Satcom Terminal — Mobile Integration Guide (V2)

**Version:** 2.1 (Phase 1 + Phase 2 FIDO2 + Terminal Metadata)  
**Updated:** 2026-04-28  
**Firmware:** esp32_satcom_terminal (feat/satcom-phase2-upstream, with terminal metadata characteristics)

## Introduction

The **Stardomes Satcom Terminal** is a hardware security module (ESP32-S3, Heltec WiFi LoRa 32 V3) that:

1. **Receives encrypted LoRa datagrams** (915 MHz satellite broadcast)
2. **Decrypts using two-layer CAS** (Conditional Access System)
3. **Delivers plaintext via BLE** to mobile apps
4. **Supports FIDO2 authentication** (Phase 2) via satellite link

The terminal never exposes raw cryptographic material to the mobile app—all decryption happens in the secure hardware. Phase 2 adds bidirectional FIDO2 authentication: the backend sends challenges via LoRa→BLE, the mobile app computes assertions and sends them back via BLE→LoRa→backend.

### Pipeline Overview (Phase 1 + Phase 2)

```
┌─ DOWNSTREAM (Phase 1: Backend → Mobile) ──────────────────┐
│                                                              │
│ Azure Service Bus                                            │
│      │  auth challenge (JSON)                               │
│      ▼                                                        │
│ backend_worker.py                                            │
│      │  AES-256-GCM two-layer CAS encrypt + HMAC-SHA256    │
│      ▼                                                        │
│ satcom-broadcast-datagrams topic                             │
│      │                                                        │
│      ▼                                                        │
│ Bridge (MacBook) ──SLIP/UART──> ESP32 TX Node               │
│                                      │  LoRa RF 915MHz       │
│                                      ▼                        │
│                            ESP32 RX Node (Terminal)          │
│                                      │  CAS decrypt          │
│                                      ▼                        │
│                         BLE 0xFF06: Challenge Notify         │
│                                      │                        │
│                                      ▼                        │
│                           Mobile App (React Native)          │
│                                      │  Display challenge    │
│                                      ▼                        │
│                       User authorizes with biometric         │
└──────────────────────────────────────────────────────────────┘

┌─ UPSTREAM (Phase 2: Mobile → Backend) ─────────────────────┐
│                                                              │
│ Mobile App                                                  │
│      │  FIDO2 assertion (JSON)                              │
│      ▼                                                        │
│ BLE 0xFF05: Response Write (with HMAC-SHA256 signature)     │
│      │                                                        │
│      ▼                                                        │
│ ESP32 RX Node (Terminal)                                    │
│      │  Enqueue to upstream queue                           │
│      ▼                                                        │
│ LoRa TX ──RF──> Bridge (MacBook) ──SLIP/UART──>            │
│                                                              │
│ Backend                                                     │
│      │  Validate assertion, complete auth                  │
│      ▼                                                        │
│ Azure Database                                              │
│      │  Update user auth state                              │
│      ▼                                                        │
│ Mobile App (via HTTPS)                                      │
│      │  Auth complete, access granted                       │
│      ▼                                                        │
│ Protected Resource                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## BLE GATT Interface

The terminal exposes a single primary service with **nine characteristics** (Phase 1: 4 + Phase 2: 2 + Metadata: 3).

### Primary Service

| Field | Value |
|---|---|
| **Service UUID** | `0000FF00-0000-1000-8000-00805F9B34FB` |
| **Device Name Prefix** | `SatcomNode-XXXX` (last 4 hex digits of MAC) |
| **BLE Version** | 4.2+ (connectable undirected advertising) |
| **Advertising** | Service UUID in primary adv + device name in scan response |

---

## Characteristics

### FF01 — Message Receive (Phase 1)

| Field | Value |
|---|---|
| **UUID** | `0000FF01-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ, NOTIFY |
| **Access** | Requires prior authentication (FF02 write) |
| **Encoding** | UTF-8 raw bytes (no Base64) |
| **Max payload** | 512 bytes |

**Behaviour:** Terminal pushes NOTIFY for each decrypted LoRa message.

**Payload format:**
```
SATCOM_TEST|lat=-33.8688|lon=151.2093|alt=50m|msg=Hello
```

---

### FF02 — Device Status (Phase 1)

| Field | Value |
|---|---|
| **UUID** | `0000FF02-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ, NOTIFY |
| **Access** | Open (no auth required) |
| **Encoding** | UTF-8 JSON, Base64 in BLE |
| **Notify interval** | Every 30s + on each LoRa packet |

**JSON payload:**
```json
{
  "battery_pct": 85,
  "lora_rssi": -31,
  "snr": 10.8,
  "crypto_mode": 0,
  "uptime_seconds": 3600,
  "upstream_queue_depth": 0,
  "fec_corrections": 0
}
```

| Field | Type | Description |
|---|---|---|
| `battery_pct` | number | Battery 0–100% |
| `lora_rssi` | number | Last LoRa RSSI (dBm) |
| `snr` | number | Last SNR (dB) |
| `crypto_mode` | number | Active crypto (0=AES-256-GCM) |
| `uptime_seconds` | number | Terminal uptime (NEW) |
| `upstream_queue_depth` | number | Pending responses in queue (NEW) |
| `fec_corrections` | number | RS(255,223) FEC corrections |

---

### FF03 — Authentication (Phase 1)

| Field | Value |
|---|---|
| **UUID** | `0000FF03-0000-1000-8000-00805F9B34FB` |
| **Properties** | WRITE (with response) |
| **Access** | Open |
| **Encoding** | UTF-8 token, Base64 in BLE |

**Behaviour:** Write any non-empty token to unlock notifications on FF01.

**Token:** `"SATCOM_AUTH_TOKEN"` (UTF-8 → Base64)

---

### FF04 — Configuration (Phase 1)

| Field | Value |
|---|---|
| **UUID** | `0000FF04-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ, WRITE (with response) |
| **Access** | Open |
| **Encoding** | UTF-8 JSON, Base64 in BLE |

**READ response:**
```json
{
  "crypto_mode": 0,
  "carousel_cycle_secs": 30,
  "cw_rotation_secs": 3600,
  "fec_enabled": false
}
```

**WRITE payload:**
```json
{ "crypto_mode": 0 }
```

---

### FF05 — FIDO2 Response Write (Phase 2 NEW)

| Field | Value |
|---|---|
| **UUID** | `0000FF05-0000-1000-8000-00805F9B34FB` |
| **Properties** | WRITE (with response) |
| **Access** | Open |
| **Encoding** | Base64 binary packet |
| **Max payload** | 1024 bytes |
| **Format** | `[assertion_json] + [HMAC-SHA256 (32B)]` |

**Behaviour:** Mobile app sends FIDO2 assertion signed with device HMAC key.

**Packet structure:**
```
[JSON assertion (variable length)] + [32-byte HMAC-SHA256]
```

**Example assertion JSON (before HMAC):**
```json
{
  "type": "fido2_response",
  "id": "credential-id-base64",
  "rawId": "Y3JlZGVudGlhbC1pZA==",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0=",
    "authenticatorData": "SZYN5OtPonmzZF9Q1gF5rg==",
    "signature": "MEQCIGTsKBHHdXYZp1mKg7A8rJJk8XALvJW0c1",
    "userHandle": "dXNlcl8x"
  },
  "origin": "https://idp.example.com"
}
```

**Terminal response (ACK on FF06):**
```json
{ "ack": "queued" }
```

---

### FF06 — FIDO2 Challenge Notify (Phase 2 NEW)

| Field | Value |
|---|---|
| **UUID** | `0000FF06-0000-1000-8000-00805F9B34FB` |
| **Properties** | NOTIFY |
| **Access** | Open |
| **Encoding** | UTF-8 JSON, Base64 in BLE |
| **Notify trigger** | Challenge from backend LoRa RX |

**Challenge payload:**
```json
{
  "type": "auth_challenge",
  "challenge": "base64url_server_challenge",
  "origin": "https://idp.example.com",
  "rp": {
    "name": "IDP Example",
    "id": "idp.example.com"
  },
  "user": {
    "id": "base64_user_id",
    "name": "user@example.com",
    "displayName": "John Doe"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 }
  ],
  "timeout": 60000,
  "userVerification": "preferred"
}
```

**ACK response (terminal sends on FF06):**
```json
{ "ack": "queued", "timestamp": 1703001234567 }
```

---

### FF07 — Terminal ID (NEW Metadata)

| Field | Value |
|---|---|
| **UUID** | `0000FF07-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ |
| **Access** | Open (no auth required) |
| **Encoding** | UTF-8 string |
| **Max payload** | 64 bytes |

**Behaviour:** Returns the terminal's unique identifier in hex format.

**Payload example:**
```
0x123456789ABCDEF0
```

**Use case:** Identify which terminal sent a challenge (for audit logs, device pairing, or multi-terminal scenarios).

---

### FF08 — MAC ID (NEW Metadata)

| Field | Value |
|---|---|
| **UUID** | `0000FF08-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ |
| **Access** | Open (no auth required) |
| **Encoding** | UTF-8 string (colon-separated hex pairs) |
| **Max payload** | 32 bytes |

**Behaviour:** Returns the terminal's Bluetooth MAC address.

**Payload example:**
```
aa:bb:cc:dd:ee:ff
```

**Use case:** Device identification, hardware tracking, or pairing verification.

---

### FF09 — HMAC Key (NEW Metadata)

| Field | Value |
|---|---|
| **UUID** | `0000FF09-0000-1000-8000-00805F9B34FB` |
| **Properties** | READ |
| **Access** | Open (no auth required) |
| **Encoding** | Raw binary (base64 in BLE) |
| **Max payload** | 32 bytes |

**Behaviour:** Returns the device's HMAC key (currently CWPK for development).

**Purpose:** For Phase 2 FIDO2 response signing. Mobile app derives the device-specific HMAC key from this value (XOR with 0xAA if using production derivation).

**Binary format:**
```
32-byte key (raw bytes)
```

**Note:** In production, this should be encrypted or not exposed at all. Currently exposed for integration testing.

---

## Step-by-Step Mobile App Integration

### Prerequisites

- React Native with Expo SDK 49+ or bare workflow
- Physical iOS 15+ or Android 8+ device
- Terminal powered on, within 10m BLE range
- For Phase 2 FIDO2: WebAuthn support (biometric/PIN)

---

### Step 1 — Install Dependencies

```bash
npm install react-native-ble-plx buffer crypto-js uuid
npm install --save-dev @react-native-webauthn/webauthn
npx expo install expo-dev-client expo-secure-store
```

---

### Step 2 — Configure `app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "BLE required for satellite terminal authentication"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSBluetoothPeripheralUsageDescription": "BLE for satellite auth",
        "NSBluetoothCentralUsageDescription": "BLE for satellite terminal"
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

Build a custom Dev Client: `eas build --profile development --platform ios`

---

### Step 3 — Create `StardomesBLE.ts` (Core SDK)

Create at `src/services/StardomesBLE.ts`:

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
  upstream_queue_depth: number; // NEW: Phase 2
  fec_corrections: number;
}

export interface SatelliteMessage {
  id: string;
  ts: string;
  type: string;
  raw: string;
  [key: string]: any;
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

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CONSTANTS = {
  SERVICE: "0000ff00-0000-1000-8000-00805f9b34fb",
  CHR_MESSAGE: "0000ff01-0000-1000-8000-00805f9b34fb",       // Notify: messages
  CHR_STATUS: "0000ff02-0000-1000-8000-00805f9b34fb",        // Read/Notify: telemetry
  CHR_AUTH: "0000ff03-0000-1000-8000-00805f9b34fb",          // Write: auth token
  CHR_CONFIG: "0000ff04-0000-1000-8000-00805f9b34fb",        // Read/Write: config
  CHR_RESPONSE: "0000ff05-0000-1000-8000-00805f9b34fb",      // Write: FIDO2 response (NEW)
  CHR_CHALLENGE: "0000ff06-0000-1000-8000-00805f9b34fb",     // Notify: FIDO2 challenge (NEW)
  AUTH_TOKEN: "SATCOM_AUTH_TOKEN",
  DEVICE_NAME_PREFIX: "SatcomNode-",
  ACK_TIMEOUT_MS: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export class CryptoUtils {
  /**
   * Derive HMAC key from CWPK (CWPK XOR 0xAA)
   * Must match firmware derivation
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
   * Compute HMAC-SHA256
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
    const hmac = this.computeHMAC(assertionBytes, hmacKey);
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
  private hmacKey: Buffer | null = null;

  // Event Listeners
  public onConnectionChange?: (isConnected: boolean) => void;
  public onTelemetryUpdate?: (data: TelemetryData) => void;
  public onMessageArrival?: (msg: SatelliteMessage) => void;
  public onChallengeArrival?: (challenge: FIDO2Challenge) => void; // NEW
  public onError?: (error: string) => void;

  constructor() {
    this.manager = new BleManager({
      restoreStateIdentifier: "StardomesBLE",
    });
  }

  /**
   * Initialize BLE and start scanning
   */
  public initializeHardware(hmacKeySeed?: string) {
    if (hmacKeySeed) {
      this.hmacKey = CryptoUtils.deriveHMACKey(hmacKeySeed);
    }

    const subscription = this.manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        this.scanAndConnect();
        subscription.remove();
      } else if (state === "PoweredOff") {
        this.onError?.("Bluetooth is disabled");
      }
    }, true);
  }

  /**
   * Scan for terminal
   */
  public scanAndConnect() {
    if (this.isScanning) return;
    this.isScanning = true;

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
              id.toLowerCase() === CONSTANTS.SERVICE
          );

        if (isSatcom) {
          this.manager.stopDeviceScan();
          this.isScanning = false;
          await this.connectToTerminal(device);
        }
      }
    );
  }

  /**
   * Connect and subscribe to characteristics
   */
  private async connectToTerminal(device: Device) {
    try {
      this.connectedDevice = await device.connect();
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);

      this.manager.onDeviceDisconnected(device.id, () => {
        this.handleDisconnection();
      });

      // Subscribe to status (FF02)
      this.connectedDevice.monitorCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_STATUS,
        (err, chr) => {
          if (!err && chr?.value) {
            try {
              const telemetry: TelemetryData = JSON.parse(
                Buffer.from(chr.value, "base64").toString("utf8")
              );
              this.onTelemetryUpdate?.(telemetry);
            } catch (_) {}
          }
        }
      );

      // Authenticate (FF03)
      const authBytes = Buffer.from(CONSTANTS.AUTH_TOKEN, "utf8").toString(
        "base64"
      );
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_AUTH,
        authBytes
      );

      // Subscribe to messages (FF01)
      this.connectedDevice.monitorCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_MESSAGE,
        (err, chr) => {
          if (!err && chr?.value) {
            const msgStr = Buffer.from(chr.value, "base64").toString("utf8");
            const segments = msgStr.split("|");
            const parsed: Partial<SatelliteMessage> = {
              raw: msgStr,
              type: segments[0] || "UNKNOWN",
              id: Math.random().toString(36).slice(2),
              ts: new Date().toISOString(),
            };

            segments.slice(1).forEach((segment) => {
              const [key, value] = segment.split("=");
              if (key && value) (parsed as any)[key] = value;
            });

            this.onMessageArrival?.(parsed as SatelliteMessage);
          }
        }
      );

      // Subscribe to challenges (FF06) — NEW Phase 2
      this.subscribeToChallenges();
    } catch (error: any) {
      console.error("[BLE] Connection failed:", error?.message);
      this.onError?.(error?.message);
      this.handleDisconnection();
    }
  }

  /**
   * Subscribe to FIDO2 challenges (FF06) — NEW Phase 2
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
            }
          } catch (parseErr) {
            console.warn("[BLE] Failed to parse challenge:", parseErr);
          }
        }
      }
    );
  }

  /**
   * Send FIDO2 response (FF05) — NEW Phase 2
   */
  public async sendFIDO2Response(assertion: FIDO2Response): Promise<boolean> {
    if (!this.connectedDevice || !this.hmacKey) {
      this.onError?.("Not connected or HMAC key not loaded");
      return false;
    }

    try {
      console.log("[BLE] Building response packet...");
      const packet = CryptoUtils.buildResponsePacket(assertion, this.hmacKey);
      const base64Packet = packet.toString("base64");

      console.log("[BLE] Sending response...");
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_RESPONSE,
        base64Packet
      );

      console.log("[BLE] Response sent");
      return true;
    } catch (error: any) {
      console.error("[BLE] Failed to send response:", error?.message);
      this.onError?.(error?.message);
      return false;
    }
  }

  /**
   * Handle disconnection and reconnect
   */
  private handleDisconnection() {
    this.connectedDevice = null;
    this.onConnectionChange?.(false);

    const delays = [500, 1000, 2000, 5000];
    const delay = delays[Math.min(this.reconnectAttempts++, 3)];

    setTimeout(
      () =>
        this.manager
          .state()
          .then((state) => state === "PoweredOn" && this.scanAndConnect())
          .catch(console.warn),
      delay
    );
  }

  /**
   * Set crypto mode (FF04)
   */
  public async setCryptoMode(mode: number): Promise<boolean> {
    if (!this.connectedDevice) return false;
    try {
      const payload = Buffer.from(
        JSON.stringify({ crypto_mode: mode }),
        "utf8"
      ).toString("base64");
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_CONFIG,
        payload
      );
      return true;
    } catch (error) {
      console.warn("[BLE] setCryptoMode failed:", error);
      return false;
    }
  }

  /**
   * Cleanup
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

  public isConnected(): boolean {
    return this.connectedDevice !== null;
  }
}

export const StardomesClient = new StardomesBLEClient();
```

---

### Step 4 — Create `useSatcom.ts` (React Hook)

Create at `src/hooks/useSatcom.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  StardomesClient,
  TelemetryData,
  SatelliteMessage,
  FIDO2Challenge,
  FIDO2Response,
  CryptoUtils,
} from "../services/StardomesBLE";

export const useSatcom = (hmacKeySeed?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [messages, setMessages] = useState<SatelliteMessage[]>([]);
  const [challenge, setChallenge] = useState<FIDO2Challenge | null>(null);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    StardomesClient.onConnectionChange = (state) => {
      setIsConnected(state);
      if (!state) setChallenge(null);
    };

    StardomesClient.onTelemetryUpdate = (data) => setTelemetry(data);

    StardomesClient.onMessageArrival = (msg) => {
      setMessages((prev) => [msg, ...prev].slice(0, 100));
    };

    StardomesClient.onChallengeArrival = (chal) => {
      console.log("[Hook] Challenge arrived");
      setChallenge(chal);
    };

    StardomesClient.onError = (error) => {
      setLastError(error);
    };

    StardomesClient.initializeHardware(hmacKeySeed);

    return () => {
      StardomesClient.disconnect();
    };
  }, [hmacKeySeed]);

  const sendResponse = useCallback(
    async (assertion: FIDO2Response): Promise<boolean> => {
      setIsAuthProcessing(true);
      const success = await StardomesClient.sendFIDO2Response(assertion);
      setIsAuthProcessing(false);
      return success;
    },
    []
  );

  const setCrypto = useCallback((mode: number) => {
    return StardomesClient.setCryptoMode(mode);
  }, []);

  return {
    isConnected,
    telemetry,
    messages,
    challenge,
    isAuthProcessing,
    lastError,
    sendResponse,
    setCrypto,
  };
};
```

---

### Step 5 — Build the Dashboard UI

```tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSatcom } from "./hooks/useSatcom";
import WebAuthn from "@react-native-webauthn/webauthn";

export default function TerminalDashboard() {
  const CWPK = "A1B2C3D4E5F678901234567890ABCDEF"; // device-12345 (dev only)
  const {
    isConnected,
    telemetry,
    messages,
    challenge,
    isAuthProcessing,
    lastError,
    sendResponse,
    setCrypto,
  } = useSatcom(CWPK);

  const [authProgress, setAuthProgress] = useState("");

  useEffect(() => {
    if (challenge) {
      setAuthProgress("📨 Challenge received");
      handleChallenge(challenge);
    }
  }, [challenge]);

  const handleChallenge = async (chal: any) => {
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

      setAuthProgress("📤 Sending to terminal...");
      const success = await sendResponse(assertion);

      if (success) {
        setAuthProgress("✅ Response sent! Waiting for backend...");
        Alert.alert("Success", "FIDO2 assertion transmitted via satellite");
      } else {
        setAuthProgress("❌ Terminal rejected response");
      }
    } catch (error: any) {
      setAuthProgress(`❌ Error: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🛰️ SatCom Terminal</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isConnected ? "#22c55e" : "#ef4444" },
          ]}
        >
          <Text style={styles.statusText}>
            {isConnected ? "● Connected" : "● Searching..."}
          </Text>
        </View>
      </View>

      {/* Telemetry */}
      {telemetry && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Terminal Status</Text>
          <View style={styles.grid}>
            <MetricCard label="Battery" value={`${telemetry.battery_pct}%`} />
            <MetricCard label="RSSI" value={`${telemetry.lora_rssi} dBm`} />
            <MetricCard label="SNR" value={`${telemetry.snr} dB`} />
            <MetricCard
              label="Queue"
              value={`${telemetry.upstream_queue_depth}`}
            />
          </View>
        </View>
      )}

      {/* Challenge Status (Phase 2) */}
      {authProgress && (
        <View style={[styles.section, { backgroundColor: "#e3f2fd" }]}>
          <Text style={styles.sectionTitle}>{authProgress}</Text>
          {isAuthProcessing && <ActivityIndicator />}
        </View>
      )}

      {/* Errors */}
      {lastError && (
        <View style={[styles.section, { backgroundColor: "#ffebee" }]}>
          <Text style={{ color: "red" }}>❌ {lastError}</Text>
        </View>
      )}

      {/* Messages Feed */}
      <Text style={styles.sectionTitle}>📨 Messages</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageItem}>
            <Text style={styles.messageType}>{item.type}</Text>
            <Text style={styles.messageTime}>{item.ts}</Text>
            <Text style={styles.messageRaw} numberOfLines={2}>
              {item.raw}
            </Text>
          </View>
        )}
        style={styles.messageList}
      />

      {/* Controls */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCrypto(0)}
          disabled={!isConnected}
        >
          <Text style={styles.btnText}>AES-256</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCrypto(1)}
          disabled={!isConnected}
        >
          <Text style={styles.btnText}>AES-128</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCrypto(2)}
          disabled={!isConnected}
        >
          <Text style={styles.btnText}>Plaintext</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    margin: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messageItem: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  messageType: {
    fontSize: 14,
    fontWeight: "bold",
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  messageRaw: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
```

---

## Phase 2 FIDO2 Authentication Flow

1. **Backend sends challenge** → LoRa RX → Terminal receives
2. **Terminal delivers challenge** → BLE 0xFF06 notify → Mobile app
3. **Mobile app displays challenge** → User taps "Authenticate"
4. **WebAuthn.get()** → Biometric/PIN authentication
5. **Mobile computes assertion** → Signs with HMAC-SHA256
6. **Sends response** → BLE 0xFF05 write → Terminal receives
7. **Terminal validates HMAC** → Enqueues to upstream queue
8. **LoRa TX** → Transmits upstream → Bridge receives
9. **Backend processes** → Validates assertion → Auth complete
10. **Mobile app notified** via HTTPS → Access granted

---

## Security Checklist

- ✅ CWPK stored securely (expo-secure-store)
- ✅ HMAC-SHA256 signing on all responses
- ✅ BLE permissions configured (iOS 15+, Android 12+)
- ✅ Timeout protection (5s ACK timeout)
- ✅ Connection recovery with exponential backoff
- ✅ Challenge validation before WebAuthn call
- ✅ Error handling on HMAC verification failure

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Terminal not found | Verify powered on, within 10m, Bluetooth enabled |
| HMAC validation fails | Check CWPK matches device provisioning |
| Challenge never arrives | Verify backend sending, LoRa RX working |
| WebAuthn not available | Real device only, biometric/PIN must be set |
| Connection drops | Check interference, move closer, verify permissions |

---

**Version 2.0 | Phase 1 + Phase 2 FIDO2 Support**  
Updated: 2026-04-27  
For questions: See React SDK Developer Guide V2

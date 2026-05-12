# Expo BLE Integration Guide: SatCom Terminal FIDO2 Flows

## Overview

This guide enables Expo-based mobile apps to integrate with the SatCom terminal for FIDO2 authentication via Bluetooth Low Energy (BLE).

**Supported Flows:**
- **Phase 1 (RX):** Receive FIDO2 challenges from terminal via BLE 0xFF06 notify
- **Phase 2 (TX):** Send FIDO2 assertions to terminal via BLE 0xFF05 write with HMAC validation

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Mobile App (Expo)                                        │
│ ┌──────────────────────────────────────────────────────┤
│ │ • BLE Manager (react-native-ble-plx or Expo.BLE)    │
│ │ • FIDO2 Client (WebAuthn or @react-native-webauthn)│
│ │ • Crypto: react-native-crypto / Ethers.js          │
│ └──────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────┘
                          ↕ BLE
                  (UUID service 0xFF00)
┌─────────────────────────────────────────────────────────┐
│ SatCom Terminal (ESP32-S3)                              │
│ ┌──────────────────────────────────────────────────────┤
│ │ 0xFF06: Challenge notify (Phase 1 RX)               │
│ │ 0xFF05: Response write + HMAC (Phase 2 TX)          │
│ │                                                      │
│ │ Backend → LoRa → Terminal → BLE → Mobile            │
│ │ Mobile → BLE → Terminal → LoRa → Backend            │
│ └──────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────┘
```

---

## BLE Service & Characteristics

### Service UUID
```
0xFF00 (SatCom Terminal Service)
```

### Characteristics

| UUID   | Name              | Direction | Type      | Purpose |
|--------|-------------------|-----------|-----------|---------|
| 0xFF01 | Status            | Read      | Indicate  | Terminal status (RSSI, queue depth, uptime) |
| 0xFF02 | Auth Token        | Write     | ACK       | Initial auth/pairing token |
| 0xFF03 | Configuration     | Read      | Indicate  | Device config (crypto mode, FEC enabled) |
| 0xFF04 | Message           | Notify    | Plaintext | Generic message delivery |
| 0xFF05 | **Upstream Write**| Write     | **Response+HMAC** | **Mobile → Terminal: FIDO2 assertion** |
| 0xFF06 | **Challenge**     | Notify    | **JSON**  | **Terminal → Mobile: FIDO2 challenge** |

---

## Setup: Dependencies & Configuration

### 1. Install Dependencies

```bash
# Expo project setup
expo init satcom-fido2-app
cd satcom-fido2-app

# BLE library (choose one)
expo install expo-ble
# OR
npm install react-native-ble-plx

# Crypto (HMAC-SHA256)
npm install react-native-crypto
npm install crypto-js
# OR (simpler)
npm install tweetnacl-js

# FIDO2/WebAuthn
npm install @react-native-webauthn/webauthn
# OR mock for testing
npm install @simplewebauthn/browser

# JSON utilities
npm install uuid
```

### 2. Permissions Configuration (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-ble",
        {
          "isBackgroundEnabled": true
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSBluetoothPeripheralUsageDescription": "We need BLE to communicate with your SatCom terminal for FIDO2 authentication",
        "NSBluetoothCentralUsageDescription": "We need BLE to discover and connect to your SatCom terminal"
      }
    },
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

---

## Implementation: Step-by-Step

### Phase 1: Receive FIDO2 Challenge (0xFF06 Notify)

#### Step 1.1: Scan for Terminal

```javascript
import { BleManager } from 'react-native-ble-plx';
import { Alert } from 'react-native';

const bleManager = new BleManager();

export async function scanForTerminal() {
  return new Promise((resolve, reject) => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        subscription.remove();
        bleManager.startDeviceScan(
          ['0xff00'], // Target our service UUID
          { allowDuplicates: false },
          (error, device) => {
            if (error) {
              reject(error);
              return;
            }
            if (device?.name?.includes('SatcomNode')) {
              bleManager.stopDeviceScan();
              resolve(device);
            }
          }
        );
      }
    }, true);
  });
}
```

#### Step 1.2: Connect to Terminal

```javascript
export async function connectToTerminal(device) {
  try {
    const connectedDevice = await device.connect();
    await connectedDevice.discoverAllServicesAndCharacteristics();
    
    console.log('✅ Connected to terminal:', connectedDevice.name);
    return connectedDevice;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    throw error;
  }
}
```

#### Step 1.3: Listen for Challenge on 0xFF06

```javascript
export async function subscribeToChallenge(device, onChallenge) {
  const SERVICE_UUID = '0ff00';
  const CHALLENGE_CHAR = '0ff06';

  try {
    const subscription = await device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHALLENGE_CHAR,
      (error, characteristic) => {
        if (error) {
          console.error('❌ Challenge read error:', error);
          return;
        }

        if (characteristic?.value) {
          const challengeBytes = Buffer.from(characteristic.value, 'base64');
          const challengeJson = JSON.parse(challengeBytes.toString('utf8'));

          console.log('📨 FIDO2 Challenge received:', {
            type: challengeJson.type,
            challenge: challengeJson.challenge?.substring(0, 50) + '...',
          });

          onChallenge(challengeJson);
        }
      }
    );

    return subscription;
  } catch (error) {
    console.error('❌ Failed to subscribe to challenge:', error);
    throw error;
  }
}
```

#### Step 1.4: Example Challenge Payload

```json
{
  "type": "auth_challenge",
  "challenge": "base64url_encoded_server_challenge",
  "origin": "https://idp.example.com",
  "rp": {
    "name": "IDP Example",
    "id": "idp.example.com"
  },
  "user": {
    "id": "base64url_user_id",
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

---

### Phase 2: Send FIDO2 Response (0xFF05 Write with HMAC)

#### Step 2.1: Compute FIDO2 Assertion

```javascript
import WebAuthn from '@react-native-webauthn/webauthn';

export async function computeFIDO2Assertion(challenge) {
  try {
    // Call native WebAuthn implementation
    const assertion = await WebAuthn.get({
      publicKey: {
        challenge: challenge.challenge,
        timeout: challenge.timeout || 60000,
        userVerification: challenge.userVerification || 'preferred',
        rpId: challenge.rp.id,
        allowCredentials: [], // First auth: no allow list
      },
    });

    console.log('✅ FIDO2 assertion computed');
    return {
      type: 'fido2_response',
      id: assertion.id,
      rawId: assertion.rawId,
      response: {
        clientDataJSON: assertion.response.clientDataJSON,
        authenticatorData: assertion.response.authenticatorData,
        signature: assertion.response.signature,
        userHandle: assertion.response.userHandle,
      },
      origin: challenge.origin,
    };
  } catch (error) {
    console.error('❌ FIDO2 assertion failed:', error);
    throw error;
  }
}
```

#### Step 2.2: Compute HMAC-SHA256

```javascript
import crypto from 'crypto';
// OR use tweetnacl for lighter weight:
// import nacl from 'tweetnacl-js';

export async function computeHMAC(responseBytes, hmacKey) {
  /**
   * Compute HMAC-SHA256 over response bytes.
   * hmacKey = CWPK XOR 0xAA (32 bytes, from terminal provisioning)
   * 
   * For development/testing with mock devices:
   *   device-12345: CWPK = "A1B2C3D4E5F678901234567890ABCDEF"
   *   hmacKey = CWPK XOR 0xAA
   */

  try {
    const hmac = crypto
      .createHmac('sha256', hmacKey)
      .update(responseBytes)
      .digest();

    return hmac;
  } catch (error) {
    console.error('❌ HMAC computation failed:', error);
    throw error;
  }
}

// Helper to derive HMAC key from CWPK (if needed)
export function deriveHMACKey(cwpk) {
  // Each byte of CWPK XOR 0xAA
  const hmacKey = Buffer.alloc(cwpk.length);
  for (let i = 0; i < cwpk.length; i++) {
    hmacKey[i] = cwpk[i] ^ 0xAA;
  }
  return hmacKey;
}
```

#### Step 2.3: Build Response Packet for 0xFF05

```javascript
export async function buildUpstreamResponse(
  assertion,
  hmacKey,
  device
) {
  try {
    // 1. Serialize assertion to JSON
    const responseJson = JSON.stringify(assertion);
    const responseBytes = Buffer.from(responseJson, 'utf8');

    console.log(`📦 Response payload: ${responseBytes.length} bytes`);

    // 2. Compute HMAC-SHA256
    const hmac = await computeHMAC(responseBytes, hmacKey);
    console.log('🔐 HMAC computed:', hmac.toString('hex').substring(0, 32) + '...');

    // 3. Concatenate: [response_bytes] + [hmac_32bytes]
    const packet = Buffer.concat([responseBytes, hmac]);
    console.log(`📤 Final packet: ${packet.length} bytes (payload + 32B HMAC)`);

    return packet;
  } catch (error) {
    console.error('❌ Failed to build response packet:', error);
    throw error;
  }
}
```

#### Step 2.4: Write Response to 0xFF05

```javascript
export async function sendResponseToTerminal(device, packet) {
  const SERVICE_UUID = '0ff00';
  const RESPONSE_CHAR = '0ff05';

  try {
    // Convert buffer to base64 for BLE transmission
    const base64Packet = packet.toString('base64');

    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      RESPONSE_CHAR,
      base64Packet
    );

    console.log('✅ Response written to terminal (0xFF05)');
    
    // Wait for ACK on 0xFF06
    const ackPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('ACK timeout')),
        5000
      );

      device.monitorCharacteristicForService(
        SERVICE_UUID,
        '0ff06',
        (error, char) => {
          if (error) reject(error);
          if (char?.value) {
            clearTimeout(timeout);
            const ack = JSON.parse(
              Buffer.from(char.value, 'base64').toString('utf8')
            );
            resolve(ack);
          }
        }
      );
    });

    const ack = await ackPromise;
    console.log('✅ ACK received:', ack);
    return ack;
  } catch (error) {
    console.error('❌ Failed to send response:', error);
    throw error;
  }
}
```

---

## Complete Integration Flow: React Hook

```javascript
import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';

/**
 * useSatcomFIDO2 — Complete integration hook for FIDO2 auth with SatCom terminal
 */
export function useSatcomFIDO2(hmacKey) {
  const [isConnected, setIsConnected] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const deviceRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Step 1: Scan and connect
  const connect = useCallback(async () => {
    try {
      setIsProcessing(true);
      console.log('🔍 Scanning for SatCom terminal...');
      
      const device = await scanForTerminal();
      const connected = await connectToTerminal(device);
      deviceRef.current = connected;
      setIsConnected(true);

      // Step 2: Subscribe to challenges
      subscriptionRef.current = await subscribeToChallenge(
        connected,
        (challengePayload) => {
          setChallenge(challengePayload);
          console.log('📨 Challenge ready for processing');
        }
      );

      Alert.alert('✅ Connected', 'Connected to SatCom terminal');
    } catch (error) {
      Alert.alert('❌ Connection Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Step 3: Authenticate when challenge arrives
  const authenticate = useCallback(async () => {
    if (!challenge || !deviceRef.current) {
      Alert.alert('⚠️ Not Ready', 'No challenge or device');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🔐 Computing FIDO2 assertion...');
      
      // Compute assertion
      const assertion = await computeFIDO2Assertion(challenge);
      
      // Build packet with HMAC
      const packet = await buildUpstreamResponse(assertion, hmacKey, deviceRef.current);
      
      // Send to terminal
      const ack = await sendResponseToTerminal(deviceRef.current, packet);
      
      Alert.alert('✅ Auth Success', `Terminal ACK: ${ack.ack}`);
      setChallenge(null);
    } catch (error) {
      Alert.alert('❌ Auth Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [challenge, hmacKey]);

  // Cleanup
  const disconnect = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
    }
    if (deviceRef.current) {
      await deviceRef.current.cancelConnection();
    }
    setIsConnected(false);
    setChallenge(null);
  }, []);

  return {
    isConnected,
    challenge,
    isProcessing,
    connect,
    authenticate,
    disconnect,
  };
}
```

---

## UI Component Example

```javascript
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useSatcomFIDO2 } from './hooks/useSatcomFIDO2';

export function SatcomAuthScreen() {
  // HMAC key for device-12345 (development only!)
  // Production: Load from secure storage
  const DEV_CWPK = Buffer.from(
    'A1B2C3D4E5F678901234567890ABCDEF',
    'utf8'
  );
  const hmacKey = deriveHMACKey(DEV_CWPK);

  const {
    isConnected,
    challenge,
    isProcessing,
    connect,
    authenticate,
    disconnect,
  } = useSatcomFIDO2(hmacKey);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛰️ SatCom FIDO2 Authentication</Text>

      <View style={styles.statusBox}>
        <Text style={styles.status}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        {challenge && (
          <Text style={styles.status}>
            📨 Challenge Ready
          </Text>
        )}
      </View>

      {!isConnected ? (
        <Button
          title="Connect to Terminal"
          onPress={connect}
          disabled={isProcessing}
        />
      ) : (
        <>
          <Button
            title={isProcessing ? 'Processing...' : 'Authenticate via FIDO2'}
            onPress={authenticate}
            disabled={!challenge || isProcessing}
          />
          <Button
            title="Disconnect"
            onPress={disconnect}
            color="#d32f2f"
          />
        </>
      )}

      {challenge && (
        <View style={styles.challengeBox}>
          <Text style={styles.label}>Challenge Details:</Text>
          <Text style={styles.code}>
            {JSON.stringify(challenge, null, 2).substring(0, 300)}...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginVertical: 4,
  },
  challengeBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 12,
  },
});
```

---

## Testing & Debugging

### 1. Mock Terminal for Development

```javascript
// hooks/useMockTerminal.js
export function useMockTerminal() {
  const mockChallenge = {
    type: 'auth_challenge',
    challenge: 'dGVzdF9jaGFsbGVuZ2VfYmFzZTY0',
    origin: 'https://idp.example.com',
    rp: { name: 'IDP Example', id: 'idp.example.com' },
    user: {
      id: 'dGVzdF91c2VyX2lk',
      name: 'test@example.com',
      displayName: 'Test User',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  };

  return {
    challenge: mockChallenge,
    simulateChallenge: () => mockChallenge,
  };
}
```

### 2. Debug Logging

```javascript
export const BLE_DEBUG = {
  logScan: (device) => {
    console.log(`[BLE] Discovered device: ${device.name} (${device.id})`);
  },
  logConnect: (device) => {
    console.log(`[BLE] Connected to ${device.name}`);
  },
  logChallenge: (challenge) => {
    console.log(`[BLE] Challenge: type=${challenge.type}`);
    console.log(`      origin=${challenge.origin}`);
  },
  logResponse: (packet) => {
    console.log(`[BLE] Response packet: ${packet.length} bytes`);
    console.log(`      HMAC: ${packet.slice(-32).toString('hex').substring(0, 32)}...`);
  },
};
```

### 3. Error Handling Checklist

```javascript
// Common errors and resolutions
const BLE_ERRORS = {
  'Bluetooth is not enabled': {
    message: 'Please enable Bluetooth on your device',
    action: 'Settings > Bluetooth',
  },
  'No devices found': {
    message: 'Terminal not visible. Ensure it is powered on',
    action: 'Check terminal nearby and retry scan',
  },
  'Connection timeout': {
    message: 'Terminal not responding',
    action: 'Restart terminal and try again',
  },
  'HMAC validation failed': {
    message: 'Terminal rejected response (bad HMAC)',
    action: 'Check CWPK and hmacKey configuration',
  },
  'Characteristic write failed': {
    message: 'Failed to write to 0xFF05',
    action: 'Reconnect and retry',
  },
};
```

---

## Security Considerations

### 1. HMAC Key Storage

**Development Only:**
```javascript
// ❌ DO NOT USE IN PRODUCTION
const CWPK_DEV = Buffer.from('A1B2C3D4E5F678901234567890ABCDEF', 'utf8');
```

**Production (Use Secure Storage):**
```javascript
import * as SecureStore from 'expo-secure-store';

export async function loadHMACKey() {
  const cwpk = await SecureStore.getItemAsync('device_cwpk');
  if (!cwpk) throw new Error('CWPK not provisioned');
  return deriveHMACKey(Buffer.from(cwpk, 'hex'));
}

export async function provisionCWPK(cwpkHex) {
  await SecureStore.setItemAsync('device_cwpk', cwpkHex);
  console.log('✅ CWPK provisioned securely');
}
```

### 2. Challenge Validation

```javascript
export function validateChallenge(challenge) {
  const required = ['type', 'challenge', 'origin', 'rp', 'user'];
  for (const field of required) {
    if (!challenge[field]) {
      throw new Error(`Invalid challenge: missing field "${field}"`);
    }
  }
  
  // Verify origin matches expected backend
  const expectedOrigin = 'https://idp.example.com';
  if (challenge.origin !== expectedOrigin) {
    throw new Error(`Origin mismatch: ${challenge.origin} != ${expectedOrigin}`);
  }
  
  return true;
}
```

### 3. Timeout Protection

```javascript
export function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Operation timeout')),
        timeoutMs
      )
    ),
  ]);
}

// Usage
const assertion = await withTimeout(
  computeFIDO2Assertion(challenge),
  30000
);
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Cannot scan for terminal | BLE disabled, permissions missing | Enable Bluetooth, check permissions in app.json |
| Connection fails after scan | Device out of range, powered off | Verify terminal powered, move closer |
| Challenge never arrives | 0xFF06 notify not subscribed, backend no message | Restart terminal, check backend sending challenges |
| HMAC rejection | Wrong CWPK/hmacKey, derivation error | Verify CWPK matches terminal provisioning |
| ACK timeout | Terminal busy, queue full | Retry, check terminal logs |
| JSON parse error in challenge | Malformed payload from terminal | Update firmware, check LoRa RX path |

---

## References

- **BLE Library:** https://docs.expo.dev/build-reference/ble/
- **WebAuthn:** https://www.w3.org/TR/webauthn-2/
- **FIDO2 Spec:** https://fidoalliance.org/fido2/
- **React Native Crypto:** https://github.com/tradle/react-native-crypto
- **HMAC-SHA256:** https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options

---

## Example Repository

Full working example: `satcom-fido2-expo-app` (provided)

```bash
git clone <repo-url>
cd satcom-fido2-expo-app
npm install
expo start

# Scan QR with Expo Go app
```

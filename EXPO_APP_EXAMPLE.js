/**
 * SatCom FIDO2 Expo App - Complete Example Implementation
 * =========================================================
 *
 * A production-ready Expo app for FIDO2 authentication via BLE with SatCom terminal.
 * Includes all necessary hooks, components, and crypto utilities.
 *
 * Usage:
 *   Copy this file as the foundation for your Expo app
 *   Update DEVICE_CONFIG and API_CONFIG for your environment
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import crypto from 'crypto';
import * as SecureStore from 'expo-secure-store';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEVICE_CONFIG = {
  // Terminal identification
  terminalServiceUUID: '0ff00',
  challengeCharUUID: '0ff06',
  responseCharUUID: '0ff05',
  statusCharUUID: '0ff01',

  // Device provisioning (DEVELOPMENT ONLY - use SecureStore in production)
  cwpkDev: 'A1B2C3D4E5F678901234567890ABCDEF', // device-12345
  deviceId: 'device-12345',
};

const API_CONFIG = {
  // Backend API endpoints
  backendOrigin: 'https://idp.example.com',
  challengeEndpoint: '/api/auth/challenge',
  responseEndpoint: '/api/auth/response',

  // Timeout settings
  scanTimeoutMs: 15000,
  connectionTimeoutMs: 10000,
  authTimeoutMs: 60000,
  ackTimeoutMs: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Derive HMAC key from CWPK (CWPK XOR 0xAA)
 */
export function deriveHMACKey(cwpkHex) {
  const cwpk = Buffer.from(cwpkHex, 'utf8');
  const hmacKey = Buffer.alloc(cwpk.length);
  for (let i = 0; i < cwpk.length; i++) {
    hmacKey[i] = cwpk[i] ^ 0xAA;
  }
  return hmacKey;
}

/**
 * Compute HMAC-SHA256 over data
 */
export function computeHMAC(data, hmacKey) {
  return crypto
    .createHmac('sha256', hmacKey)
    .update(data)
    .digest();
}

/**
 * Load CWPK from secure storage (production)
 */
export async function loadCWPKFromSecureStore() {
  try {
    const cwpk = await SecureStore.getItemAsync('device_cwpk');
    if (!cwpk) {
      throw new Error('CWPK not provisioned - device not authenticated');
    }
    return cwpk;
  } catch (error) {
    console.warn('Failed to load CWPK from secure storage:', error);
    // Fallback to development CWPK (remove in production)
    return DEVICE_CONFIG.cwpkDev;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class SatcomBLEManager {
  constructor() {
    this.bleManager = new BleManager();
    this.device = null;
    this.subscription = null;
  }

  /**
   * Scan for terminal (timeout after 15s)
   */
  async scanForTerminal() {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.bleManager.stopDeviceScan();
        reject(new Error('Terminal scan timeout (15s)'));
      }, API_CONFIG.scanTimeoutMs);

      const stateSubscription = this.bleManager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          stateSubscription.remove();
          this.bleManager.startDeviceScan(
            [DEVICE_CONFIG.terminalServiceUUID],
            { allowDuplicates: false },
            (error, device) => {
              if (error) {
                clearTimeout(timeoutHandle);
                reject(error);
                return;
              }

              if (device?.name?.includes('SatcomNode')) {
                clearTimeout(timeoutHandle);
                this.bleManager.stopDeviceScan();
                resolve(device);
              }
            }
          );
        } else if (state === 'PoweredOff') {
          clearTimeout(timeoutHandle);
          reject(new Error('Bluetooth is disabled'));
        }
      }, true);
    });
  }

  /**
   * Connect to device and discover services
   */
  async connect(device) {
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      this.device = connected;
      console.log('✅ Connected:', connected.name);
      return connected;
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to challenge notifications on 0xFF06
   */
  async subscribeToChallenge(onChallenge, onError) {
    try {
      this.subscription = await this.device.monitorCharacteristicForService(
        DEVICE_CONFIG.terminalServiceUUID,
        DEVICE_CONFIG.challengeCharUUID,
        (error, characteristic) => {
          if (error) {
            console.error('Challenge monitor error:', error);
            onError?.(error);
            return;
          }

          if (characteristic?.value) {
            try {
              const challengeBytes = Buffer.from(characteristic.value, 'base64');
              const challenge = JSON.parse(challengeBytes.toString('utf8'));
              console.log('📨 Challenge received');
              onChallenge(challenge);
            } catch (parseError) {
              console.error('Failed to parse challenge:', parseError);
              onError?.(parseError);
            }
          }
        }
      );
    } catch (error) {
      console.error('Failed to subscribe to challenge:', error);
      throw error;
    }
  }

  /**
   * Write response to 0xFF05 with HMAC
   */
  async sendResponse(packet) {
    try {
      const base64Packet = packet.toString('base64');

      await this.device.writeCharacteristicWithResponseForService(
        DEVICE_CONFIG.terminalServiceUUID,
        DEVICE_CONFIG.responseCharUUID,
        base64Packet
      );

      console.log('✅ Response written to terminal');
      return true;
    } catch (error) {
      console.error('Failed to send response:', error);
      throw error;
    }
  }

  /**
   * Read status from 0xFF01
   */
  async readStatus() {
    try {
      const characteristic = await this.device.readCharacteristicForService(
        DEVICE_CONFIG.terminalServiceUUID,
        DEVICE_CONFIG.statusCharUUID
      );

      const statusBytes = Buffer.from(characteristic.value, 'base64');
      const status = JSON.parse(statusBytes.toString('utf8'));
      console.log('📊 Terminal status:', status);
      return status;
    } catch (error) {
      console.error('Failed to read status:', error);
      return null;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch (error) {
        console.warn('Error disconnecting:', error);
      }
      this.device = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIDO2 INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock FIDO2 assertion generator (replace with real WebAuthn in production)
 */
export function mockComputeFIDO2Assertion(challenge) {
  // In production, use @react-native-webauthn/webauthn
  const mockAssertion = {
    type: 'fido2_response',
    id: 'mock-credential-id-base64',
    rawId: Buffer.from('mock-credential-id').toString('base64'),
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({
          type: 'webauthn.get',
          challenge: challenge.challenge,
          origin: challenge.origin,
        })
      ).toString('base64'),
      authenticatorData: Buffer.from('mock-auth-data').toString('base64'),
      signature: Buffer.from('mock-signature').toString('base64'),
      userHandle: Buffer.from('mock-user-handle').toString('base64'),
    },
  };

  return mockAssertion;
}

/**
 * Build response packet: [assertion_json] + [hmac_32bytes]
 */
export function buildResponsePacket(assertion, hmacKey) {
  const assertionJson = JSON.stringify(assertion);
  const assertionBytes = Buffer.from(assertionJson, 'utf8');

  // Compute HMAC over assertion bytes
  const hmac = computeHMAC(assertionBytes, hmacKey);

  // Concatenate: assertion + hmac
  const packet = Buffer.concat([assertionBytes, hmac]);

  console.log(`📦 Packet: ${assertionBytes.length}B payload + 32B HMAC = ${packet.length}B total`);

  return packet;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK: useSatcomFIDO2
// ═══════════════════════════════════════════════════════════════════════════════

export function useSatcomFIDO2() {
  const [state, setState] = useState({
    isConnected: false,
    isScanning: false,
    isProcessing: false,
    challenge: null,
    terminalStatus: null,
    lastError: null,
    logs: [],
  });

  const bleManagerRef = useRef(null);
  const hmacKeyRef = useRef(null);

  // Add log entry
  const addLog = useCallback((message) => {
    setState(prev => ({
      ...prev,
      logs: [
        `[${new Date().toLocaleTimeString()}] ${message}`,
        ...prev.logs,
      ].slice(0, 50), // Keep last 50 logs
    }));
    console.log(message);
  }, []);

  // Scan and connect
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isScanning: true, lastError: null }));
      addLog('🔍 Scanning for terminal...');

      bleManagerRef.current = new SatcomBLEManager();
      const device = await bleManagerRef.current.scanForTerminal();

      addLog(`✅ Found: ${device.name}`);
      await bleManagerRef.current.connect(device);

      // Load HMAC key
      const cwpk = await loadCWPKFromSecureStore();
      hmacKeyRef.current = deriveHMACKey(cwpk);
      addLog('🔐 HMAC key loaded');

      // Subscribe to challenges
      await bleManagerRef.current.subscribeToChallenge(
        (challenge) => {
          addLog('📨 Challenge received');
          setState(prev => ({ ...prev, challenge }));
        },
        (error) => {
          addLog(`❌ Challenge error: ${error.message}`);
        }
      );

      // Read initial status
      const status = await bleManagerRef.current.readStatus();
      setState(prev => ({
        ...prev,
        isConnected: true,
        isScanning: false,
        terminalStatus: status,
      }));
      addLog('✅ Connected and ready');
    } catch (error) {
      addLog(`❌ ${error.message}`);
      setState(prev => ({
        ...prev,
        isScanning: false,
        lastError: error.message,
      }));
    }
  }, [addLog]);

  // Authenticate
  const authenticate = useCallback(async () => {
    if (!state.challenge || !state.isConnected) {
      Alert.alert('❌ Not Ready', 'No challenge or terminal not connected');
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, lastError: null }));
      addLog('🔐 Starting FIDO2 assertion computation...');

      // Compute assertion (mock)
      const assertion = mockComputeFIDO2Assertion(state.challenge);
      addLog('✅ Assertion computed');

      // Build packet
      const packet = buildResponsePacket(assertion, hmacKeyRef.current);
      addLog('📤 Sending to terminal...');

      // Send to terminal
      await bleManagerRef.current.sendResponse(packet);
      addLog('✅ Response sent, waiting for ACK...');

      // Wait for ACK (timeout 5s)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('ACK timeout')),
          API_CONFIG.ackTimeoutMs
        );

        const pollStatus = async () => {
          try {
            const status = await bleManagerRef.current.readStatus();
            if (status?.ack_received) {
              clearTimeout(timeout);
              resolve(status);
            } else {
              setTimeout(pollStatus, 500); // Poll every 500ms
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        };

        pollStatus();
      });

      addLog('✅ Terminal ACK received');
      setState(prev => ({ ...prev, challenge: null }));
      Alert.alert('✅ Success', 'FIDO2 authentication completed');
    } catch (error) {
      addLog(`❌ ${error.message}`);
      setState(prev => ({
        ...prev,
        lastError: error.message,
      }));
      Alert.alert('❌ Authentication Failed', error.message);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.challenge, state.isConnected, addLog]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (bleManagerRef.current) {
      await bleManagerRef.current.disconnect();
    }
    setState({
      isConnected: false,
      isScanning: false,
      isProcessing: false,
      challenge: null,
      terminalStatus: null,
      lastError: null,
      logs: [],
    });
    addLog('👋 Disconnected');
  }, [addLog]);

  return {
    ...state,
    connect,
    authenticate,
    disconnect,
    logs: state.logs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatusIndicator({ connected }) {
  return (
    <View style={[styles.indicator, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]}>
      <Text style={styles.indicatorText}>
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </Text>
    </View>
  );
}

function ChallengeInfo({ challenge }) {
  if (!challenge) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📨 FIDO2 Challenge</Text>
      <Text style={styles.cardText}>
        Origin: {challenge.origin}
      </Text>
      <Text style={styles.cardText}>
        User: {challenge.user?.displayName}
      </Text>
      <Text style={styles.cardText}>
        Challenge: {challenge.challenge?.substring(0, 30)}...
      </Text>
    </View>
  );
}

function LogViewer({ logs }) {
  return (
    <View style={styles.logContainer}>
      <Text style={styles.logTitle}>📋 Logs ({logs.length})</Text>
      <ScrollView style={styles.logScroll} nestedScrollEnabled>
        {logs.map((log, idx) => (
          <Text key={idx} style={styles.logEntry}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function SatcomFIDO2App() {
  const {
    isConnected,
    isScanning,
    isProcessing,
    challenge,
    lastError,
    logs,
    connect,
    authenticate,
    disconnect,
  } = useSatcomFIDO2();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🛰️ SatCom FIDO2</Text>
          <Text style={styles.subtitle}>ESP32 Terminal BLE Authentication</Text>
        </View>

        <StatusIndicator connected={isConnected} />

        <View style={styles.buttonGroup}>
          {!isConnected ? (
            <Button
              title={isScanning ? 'Scanning...' : 'Connect to Terminal'}
              onPress={connect}
              disabled={isScanning}
              color="#2196F3"
            />
          ) : (
            <>
              <Button
                title={isProcessing ? 'Processing...' : 'Authenticate'}
                onPress={authenticate}
                disabled={!challenge || isProcessing}
                color="#4CAF50"
              />
              <Button
                title="Disconnect"
                onPress={disconnect}
                color="#f44336"
              />
            </>
          )}
        </View>

        {lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>❌ {lastError}</Text>
          </View>
        )}

        <ChallengeInfo challenge={challenge} />

        <LogViewer logs={logs} />
      </ScrollView>

      {isProcessing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.overlayText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  indicator: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  indicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    height: 300,
    marginBottom: 20,
  },
  logTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 14,
  },
  logScroll: {
    flex: 1,
  },
  logEntry: {
    fontSize: 11,
    fontFamily: 'Courier New',
    color: '#333',
    marginBottom: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: 16,
    color: 'white',
    fontSize: 16,
  },
});

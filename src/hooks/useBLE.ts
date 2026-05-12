import { useState, useEffect, useCallback } from 'react';
import { bleService, FIDO2Challenge, FIDO2Response } from '../services/ble';

export interface SatcomStatus {
  battery_pct?: number;
  lora_rssi?: number;
  snr?: number;
  crypto_mode?: number;
  fec_errors_last_cycle?: number;
  uptime_seconds?: number;
  upstream_queue_depth?: number;
  fec_corrections?: number;
}

export interface SatcomMessage {
  id: string;
  raw: string;
  type: string;
  ts?: string;
  seq?: string;
  lat?: string;
  lon?: string;
  alt?: string;
}

export const useBLE = (hmacKeySeed?: string) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<SatcomStatus | null>(null);
  const [messages, setMessages] = useState<SatcomMessage[]>([]);
  const [challenge, setChallenge] = useState<FIDO2Challenge | null>(null);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{terminalId?: string, macId?: string, hmac?: string} | null>(null);

  useEffect(() => {
    // Register callbacks
    bleService.onConnectionStateChange = async (connected: boolean) => {
      setIsConnected(connected);
      if (!connected) {
        setStatus(null); // Clear status on disconnect
        setChallenge(null);
        setDeviceInfo(null);
      } else {
        // Fetch metadata in parallel
        const [terminalId, macId, hmacBuffer] = await Promise.all([
          bleService.getTerminalId(),
          bleService.getMacAddress(),
          bleService.getHmacKey()
        ]);
        
        setDeviceInfo({
          terminalId: terminalId || 'Unknown',
          macId: macId || 'Unknown',
          hmac: hmacBuffer ? "Configured" : "Not Configured"
        });
      }
    };

    bleService.onStatusUpdate = (newStatus: SatcomStatus) => {
      setStatus(newStatus);
    };

    bleService.onMessageReceived = (rawMessage: string) => {
      // Parse pipe-delimited message:
      // "SATCOM_TEST|ts=2026-04-16T12:09:07Z|seq=1347|lat=-33.8688|lon=151.2093|alt=50m"
      const parts = rawMessage.split('|');
      const type = parts[0] || 'UNKNOWN';
      const msgObj: SatcomMessage = {
        id: Date.now().toString() + Math.random().toString(), // unique id
        raw: rawMessage,
        type,
      };

      for (let i = 1; i < parts.length; i++) {
        const [key, val] = parts[i].split('=');
        if (key && val) {
          (msgObj as any)[key] = val;
        }
      }

      setMessages((prev) => [msgObj, ...prev]); // Prepend new messages
    };

    bleService.onChallengeArrival = (chal) => {
      console.log("Challenge arrived in useBLE");
      setChallenge(chal);
    };

    bleService.onError = (error) => {
      setLastError(error);
    };

    // Initialize scan (if not already scanning and not connected)
    bleService.initialize(hmacKeySeed);

    // Cleanup when component using hook unmounts? 
    // Usually BLE service lives for the app lifetime but we can just unregister callbacks.
    return () => {
      bleService.onConnectionStateChange = undefined;
      bleService.onStatusUpdate = undefined;
      bleService.onMessageReceived = undefined;
      bleService.onChallengeArrival = undefined;
      bleService.onError = undefined;
    };
  }, [hmacKeySeed]);

  const connectDevice = () => {
    bleService.initialize(hmacKeySeed);
  }

  const sendResponse = useCallback(async (assertion: FIDO2Response): Promise<boolean> => {
    setIsAuthProcessing(true);
    const success = await bleService.sendFIDO2Response(assertion);
    setIsAuthProcessing(false);
    return success;
  }, []);

  const writeConfig = async (cryptoMode: number) => {
    return await bleService.writeConfig(cryptoMode);
  };

  const readConfig = async () => {
    return await bleService.readConfig();
  };

  return {
    isConnected,
    status,
    messages,
    challenge,
    isAuthProcessing,
    lastError,
    deviceInfo,
    connectDevice,
    writeConfig,
    readConfig,
    sendResponse,
    getTerminalId: () => bleService.getTerminalId(),
    getMacAddress: () => bleService.getMacAddress(),
    getHmacKey: () => bleService.getHmacKey()
  };
};

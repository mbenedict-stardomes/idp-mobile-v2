import { BleManager, Device, BleError, Base64 } from 'react-native-ble-plx';
import { BLE } from '../utils/ble_constants';
import { Buffer } from 'buffer';
import crypto from "crypto-js";

export interface FIDO2Challenge {
  type: string;
  challenge: string;
  origin: string;
  rp: { name: string; id: string; };
  user: { id: string; name: string; displayName: string; };
  pubKeyCredParams: Array<{ type: string; alg: number; }>;
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

export class CryptoUtils {
  static deriveHMACKey(cwpkHex: string): Buffer {
    const cwpk = Buffer.from(cwpkHex, "utf8");
    const hmacKey = Buffer.alloc(cwpk.length);
    for (let i = 0; i < cwpk.length; i++) {
      hmacKey[i] = cwpk[i] ^ 0xaa;
    }
    return hmacKey;
  }

  static computeHMAC(data: Buffer, hmacKey: Buffer): Buffer {
    const hmac = crypto.HmacSHA256(
      Buffer.from(data).toString("hex"),
      Buffer.from(hmacKey).toString("hex")
    );
    return Buffer.from(hmac.toString(), "hex");
  }

  static buildResponsePacket(assertion: FIDO2Response, hmacKey: Buffer): Buffer {
    const assertionJson = JSON.stringify(assertion);
    const assertionBytes = Buffer.from(assertionJson, "utf8");
    const hmac = this.computeHMAC(assertionBytes, hmacKey);
    return Buffer.concat([assertionBytes, hmac]);
  }
}

class BLEService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  
  // Callbacks for the UI/Hook
  public onStatusUpdate?: (status: any) => void;
  public onMessageReceived?: (message: string) => void;
  public onConnectionStateChange?: (connected: boolean) => void;
  public onChallengeArrival?: (challenge: FIDO2Challenge) => void;
  public onError?: (error: string) => void;

  private isScanning: boolean = false;
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private hmacKey: Buffer | null = null;

  constructor() {
    this.manager = new BleManager({
      restoreStateIdentifier: 'StardomesBLE',
      restoreStateFunction: (bleRestoredState) => {
        if (bleRestoredState) {
          console.log('Restored BLE state from background');
        }
      }
    });
  }

  public initialize(hmacKeySeed?: string) {
    if (hmacKeySeed) {
      this.hmacKey = CryptoUtils.deriveHMACKey(hmacKeySeed);
    }
    // Optionally wait for bluetooth state to be powered on
    const subscription = this.manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        this.startScan();
        subscription.remove();
      }
    }, true);
  }

  public startScan() {
    if (this.isScanning) return;
    this.isScanning = true;
    console.log('Starting BLE scan...');

    this.manager.startDeviceScan(
      null, // Scan everything
      { allowDuplicates: false },
      async (error: BleError | null, device: Device | null) => {
        if (error) {
          console.warn('Scan error:', error?.message);
          this.isScanning = false;
          return;
        }

        if (device) {
          // Check if it matches by specific Service UUID or by Device Name prefix
          const hasServiceUuid = device.serviceUUIDs?.some(uuid => 
            uuid.toLowerCase() === BLE.SERVICE || uuid.toLowerCase().includes('ff00')
          );
          const hasMatchingName = device.name?.startsWith(BLE.DEVICE_NAME_PREFIX);

          if (hasServiceUuid || hasMatchingName) {
            console.log(`Found Satcom device: ${device.id} (Name: ${device.name})`);
            this.manager.stopDeviceScan();
            this.isScanning = false;
            await this.connectToDevice(device);
          }
        }
      }
    );
  }

  private async connectToDevice(device: Device) {
    try {
      console.log(`Connecting to ${device.id}...`);
      this.connectedDevice = await device.connect();
      console.log(`Connected. Discovering services...`);
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.reconnectAttempts = 0;
      this.onConnectionStateChange?.(true);

      // On disconnect callback
      this.manager.onDeviceDisconnected(device.id, (error, disconnectedDevice) => {
        console.log(`Device disconnected: ${disconnectedDevice?.id || device.id}`);
        this.handleDisconnect();
      });

      // 1. Monitor Status
      this.connectedDevice.monitorCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_STATUS,
        (error, characteristic) => {
          if (error) {
            console.warn('Status monitor error:', error?.message);
            return;
          }
          if (characteristic?.value) {
            const jsonString = Buffer.from(characteristic.value, 'base64').toString('utf8');
            try {
              const statusObj = JSON.parse(jsonString);
              this.onStatusUpdate?.(statusObj);
            } catch (e) {
              console.warn('Failed to parse status JSON:', e);
            }
          }
        }
      );

      // 2. Authenticate
      console.log('Sending Auth Token...');
      const authBuffer = Buffer.from(BLE.AUTH_TOKEN, 'utf8').toString('base64');
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BLE.SERVICE,
        BLE.CHR_AUTH,
        authBuffer
      );
      console.log('Authenticated successfully.');

      // 3. Monitor Messages
      this.connectedDevice.monitorCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_MESSAGE,
        (error, characteristic) => {
          if (error) {
            console.warn('Message monitor error:', error?.message);
            return;
          }
          if (characteristic?.value) {
            const messageString = Buffer.from(characteristic.value, 'base64').toString('utf8');
            if (messageString) {
              this.onMessageReceived?.(messageString);
            }
          }
        }
      );

      // 4. Monitor Challenges
      this.connectedDevice.monitorCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_CHALLENGE,
        (error, characteristic) => {
          if (error) {
            console.warn('Challenge monitor error:', error?.message);
            return;
          }
          if (characteristic?.value) {
            try {
              const challengeJson = JSON.parse(
                Buffer.from(characteristic.value, "base64").toString("utf8")
              );
              if (challengeJson.type === "auth_challenge") {
                console.log("FIDO2 Challenge received");
                this.onChallengeArrival?.(challengeJson as FIDO2Challenge);
              }
            } catch (e) {
              console.warn("Failed to parse challenge:", e);
            }
          }
        }
      );

    } catch (error: any) {
      console.warn('Connection/Setup error:', error?.message);
      this.onError?.(error?.message);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.connectedDevice = null;
    this.onConnectionStateChange?.(false);
    
    // Exponential backoff reconnect
    const delays = [500, 1000, 2000, 5000];
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
    
    console.log(`Scheduling reconnect in ${delay}ms...`);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.manager.state().then((state) => {
        if (state === 'PoweredOn') {
          this.startScan();
        }
      });
    }, delay);
  }

  public async sendFIDO2Response(assertion: FIDO2Response): Promise<boolean> {
    if (!this.connectedDevice || !this.hmacKey) {
      this.onError?.("Not connected or HMAC key not loaded");
      return false;
    }

    try {
      console.log("Building FIDO2 response packet...");
      const packet = CryptoUtils.buildResponsePacket(assertion, this.hmacKey);
      const base64Packet = packet.toString("base64");

      console.log("Sending FIDO2 response...");
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BLE.SERVICE,
        BLE.CHR_RESPONSE,
        base64Packet
      );

      console.log("FIDO2 Response sent successfully.");
      return true;
    } catch (error: any) {
      console.error("Failed to send FIDO2 response:", error?.message);
      this.onError?.(error?.message);
      return false;
    }
  }

  public async getTerminalId(): Promise<string | null> {
    if (!this.connectedDevice) return null;
    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_TERMINAL_ID
      );
      if (characteristic?.value) {
        return Buffer.from(characteristic.value, 'base64').toString('utf8');
      }
    } catch (e) {
      console.warn('Failed to read Terminal ID:', e);
    }
    return null;
  }

  public async getMacAddress(): Promise<string | null> {
    if (!this.connectedDevice) return null;
    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_MAC_ID
      );
      if (characteristic?.value) {
        return Buffer.from(characteristic.value, 'base64').toString('utf8');
      }
    } catch (e) {
      console.warn('Failed to read MAC ID:', e);
    }
    return null;
  }

  public async getHmacKey(): Promise<Buffer | null> {
    if (!this.connectedDevice) return null;
    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_HMAC_KEY
      );
      if (characteristic?.value) {
        return Buffer.from(characteristic.value, 'base64');
      }
    } catch (e) {
      console.warn('Failed to read HMAC Key:', e);
    }
    return null;
  }

  public async disconnect() {
    if (this.connectedDevice) {
      await this.manager.cancelDeviceConnection(this.connectedDevice.id);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isScanning = false;
    this.manager.stopDeviceScan();
  }

  public async readConfig() {
    if (!this.connectedDevice) return null;
    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        BLE.SERVICE,
        BLE.CHR_CONFIG
      );
      if (characteristic?.value) {
        const jsonString = Buffer.from(characteristic.value, 'base64').toString('utf8');
        return JSON.parse(jsonString);
      }
    } catch (e) {
      console.warn('Failed to read config:', e);
    }
    return null;
  }

  public async writeConfig(cryptoMode: number) {
    if (!this.connectedDevice) return false;
    try {
      const payload = JSON.stringify({ crypto_mode: cryptoMode });
      const base64Payload = Buffer.from(payload, 'utf8').toString('base64');
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BLE.SERVICE,
        BLE.CHR_CONFIG,
        base64Payload
      );
      return true;
    } catch (e) {
      console.warn('Failed to write config:', e);
      return false;
    }
  }
}

// Export as a singleton
export const bleService = new BLEService();

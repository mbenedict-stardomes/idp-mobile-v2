# Stardomes React Native SDK Integration

This SDK provides a drop-in, zero-configuration interface for bridging your React Native mobile app with the Stardomes Satellite Terminal. It handles background scanning, robust reconnections, CoreBluetooth nuances (UUID truncations), and JSON/Base64 serialization out of the box.

---

## 1. Installation

Install the required core Bluetooth and buffer polyfill dependencies:

```bash
npm install react-native-ble-plx buffer
npx expo install expo-dev-client
```

> **Note for Expo Users:** Ensure your `app.json` contains the `react-native-ble-plx` plugin with background permissions enabled, and **build a custom Dev Client** (do not use Expo Go).

---

## 2. The Core SDK (`StardomesBLE.ts`)

Create a new file `StardomesBLE.ts` in your project and paste this encapsulated Singleton SDK class. It handles all hardware interactions autonomously.

```typescript
import { BleManager, Device, BleError } from "react-native-ble-plx";
import { Buffer } from "buffer";

export interface TelemetryData {
  battery_pct: number;
  lora_rssi: number;
  snr: number;
  crypto_mode: number;
  fec_errors_last_cycle: number;
}

export interface SatelliteMessage {
  id: string;
  ts: string;
  type: string;
  seq?: string;
  lat?: string;
  lon?: string;
  alt?: string;
  raw: string;
}

const CONSTANTS = {
  SERVICE: "0000ff00-0000-1000-8000-00805f9b34fb",
  CHR_MESSAGE: "0000ff01-0000-1000-8000-00805f9b34fb",
  CHR_STATUS: "0000ff02-0000-1000-8000-00805f9b34fb",
  CHR_AUTH: "0000ff03-0000-1000-8000-00805f9b34fb",
  CHR_CONFIG: "0000ff04-0000-1000-8000-00805f9b34fb",
  AUTH_TOKEN: "SATCOM_AUTH_TOKEN",
  DEVICE_NAME_PREFIX: "SatcomNode-",
};

class StardomesBLEClient {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private reconnectAttempts = 0;
  private isScanning = false;

  // Event Listeners
  public onConnectionChange?: (isConnected: boolean) => void;
  public onTelemetryUpdate?: (data: TelemetryData) => void;
  public onMessageArrival?: (msg: string) => void;

  constructor() {
    this.manager = new BleManager({ restoreStateIdentifier: "StardomesBLE" });
  }

  public initializeHardware() {
    const sub = this.manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        this.scanAndConnect();
        sub.remove();
      }
    }, true);
  }

  public scanAndConnect() {
    if (this.isScanning) return;
    this.isScanning = true;

    this.manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      async (err, device) => {
        if (err) {
          console.warn("Scan Error:", err.message);
          this.isScanning = false;
          return;
        }
        if (!device) return;

        const isSatcom =
          device.name?.startsWith(CONSTANTS.DEVICE_NAME_PREFIX) ||
          device.serviceUUIDs?.some(
            (id) =>
              id.toLowerCase().includes("ff00") ||
              id.toLowerCase() === CONSTANTS.SERVICE,
          );

        if (isSatcom) {
          this.manager.stopDeviceScan();
          this.isScanning = false;
          await this.bindTerminal(device);
        }
      },
    );
  }

  private async bindTerminal(device: Device) {
    try {
      this.connectedDevice = await device.connect();
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);

      // Handle Dropouts gracefully
      this.manager.onDeviceDisconnected(device.id, () => this.handleDrop());

      // Subscribe to Telemetry
      this.connectedDevice.monitorCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_STATUS,
        (err, chr) => {
          if (!err && chr?.value) {
            this.onTelemetryUpdate?.(
              JSON.parse(Buffer.from(chr.value, "base64").toString("utf8")),
            );
          }
        },
      );

      // Authenticate Session to Unlock Messages
      const authBytes = Buffer.from(CONSTANTS.AUTH_TOKEN, "utf8").toString(
        "base64",
      );
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_AUTH,
        authBytes,
      );

      // Subscribe to High-Value Messages
      this.connectedDevice.monitorCharacteristicForService(
        CONSTANTS.SERVICE,
        CONSTANTS.CHR_MESSAGE,
        (err, chr) => {
          if (!err && chr?.value) {
            this.onMessageArrival?.(
              Buffer.from(chr.value, "base64").toString("utf8"),
            );
          }
        },
      );
    } catch (error: any) {
      this.handleDrop();
    }
  }

  private handleDrop() {
    this.connectedDevice = null;
    this.onConnectionChange?.(false);
    const delay = [500, 1000, 2000, 5000][
      Math.min(this.reconnectAttempts++, 3)
    ];
    setTimeout(
      () =>
        this.manager
          .state()
          .then((state) => state === "PoweredOn" && this.scanAndConnect()),
      delay,
    );
  }

  public async setCryptoMode(mode: number) {
    if (!this.connectedDevice) return false;
    const payload = Buffer.from(
      JSON.stringify({ crypto_mode: mode }),
      "utf8",
    ).toString("base64");
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      CONSTANTS.SERVICE,
      CONSTANTS.CHR_CONFIG,
      payload,
    );
    return true;
  }
}

export const StardomesClient = new StardomesBLEClient();
```

---

## 3. The React View Hook (`useSatcom.ts`)

This custom React hook connects the Stardomes Client engine directly into React's rendering lifecycle, granting your UI instant reactivity.

```typescript
import { useState, useEffect } from "react";
import {
  StardomesClient,
  TelemetryData,
  SatelliteMessage,
} from "./StardomesBLE";

export const useSatcom = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [messages, setMessages] = useState<SatelliteMessage[]>([]);

  useEffect(() => {
    // Register listeners
    StardomesClient.onConnectionChange = (state) => setIsConnected(state);
    StardomesClient.onTelemetryUpdate = (data) => setTelemetry(data);

    StardomesClient.onMessageArrival = (rawString) => {
      // Pipe string parsing logic
      const segments = rawString.split("|");
      const type = segments[0] || "UNKNOWN";
      const parsed: Partial<SatelliteMessage> = {
        raw: rawString,
        type,
        id: Math.random().toString(),
      };

      segments.slice(1).forEach((segment) => {
        const [key, value] = segment.split("=");
        if (key && value) {
          (parsed as any)[key] = value;
        }
      });

      setMessages((prev) => [parsed as SatelliteMessage, ...prev]);
    };

    // Spin up scanning hardware
    StardomesClient.initializeHardware();
  }, []);

  return {
    isConnected,
    telemetry,
    messages,
    setCrypto: StardomesClient.setCryptoMode.bind(StardomesClient),
  };
};
```

---

## 4. Usage in Your UI

Simply import the hook into any React Native functional component to effortlessly render real-time satellite data.

```tsx
import React from "react";
import { View, Text, Button, FlatList } from "react-native";
import { useSatcom } from "./useSatcom";

export default function TerminalDashboard() {
  const { isConnected, telemetry, messages, setCrypto } = useSatcom();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* 1. Status Display */}
      <Text style={{ color: isConnected ? "green" : "red" }}>
        {isConnected ? "🟢 Satellite Linked" : "🔴 Searching for Terminal..."}
      </Text>

      {/* 2. Telemetry Render */}
      {telemetry && (
        <View style={{ marginVertical: 20 }}>
          <Text>Battery: {telemetry.battery_pct}%</Text>
          <Text>LoRa Signal: {telemetry.lora_rssi} dBm</Text>
          <Text>Encryption Tier: Level {telemetry.crypto_mode}</Text>
          <Button title="Set Max Encryption" onPress={() => setCrypto(0)} />
        </View>
      )}

      {/* 3. Live Message Feed */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>
              {item.ts} - {item.type}
            </Text>
            {item.lat && (
              <Text>
                Coords: {item.lat}, {item.lon}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
```

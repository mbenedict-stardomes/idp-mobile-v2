Build a React Native / Expo BLE client for the Satcom Terminal RX node.

── ENVIRONMENT ────────────────────────────────────────────────────────────────
Framework : Expo SDK 51+ (bare or managed workflow)
BLE lib : react-native-ble-plx (or expo-ble if available)
Platforms : iOS 15+, Android 12+
Permissions required:
iOS → NSBluetoothAlwaysUsageDescription in Info.plist
Android → BLUETOOTH_SCAN, BLUETOOTH_CONNECT in AndroidManifest.xml
(ACCESS_FINE_LOCATION for Android ≤ 11)

── DEVICE IDENTITY ────────────────────────────────────────────────────────────
Advertised name : "SatcomNode-XXYY"
(XXYY = last 2 bytes of 8-byte terminal_id, e.g. "SatcomNode-DEF0")
Scan strategy : filter by Primary Service UUID (not by name — name is in
scan response, may not appear on first advertisement)

Primary Service UUID (128-bit):
0000FF00-0000-1000-8000-00805F9B34FB

── GATT CHARACTERISTICS ───────────────────────────────────────────────────────

0xFF01 MESSAGE RECEIVE
UUID : 0000FF01-0000-1000-8000-00805F9B34FB
Props : READ | NOTIFY
Auth : required (write 0xFF03 first)
Payload : UTF-8 text, max 527 bytes (BLE ATT_MTU_MAX)
Format : plain decrypted message string
Example : "SATCOM_TEST|ts=2026-04-16T12:09:07Z|seq=1347|
lat=-33.8688|lon=151.2093|alt=50m"
Notes : Subscribe to notifications. Each notify fires once per
successfully decrypted LoRa carousel. READ returns the
last received message (empty until first packet arrives).

0xFF02 DEVICE STATUS
UUID : 0000FF02-0000-1000-8000-00805F9B34FB
Props : READ | NOTIFY
Auth : not required
Payload : JSON object, UTF-8, ≤ 256 bytes
Format :
{
"battery_pct" : 85, // uint8, mock value (future: ADC)
"lora_rssi" : -31, // int16, dBm of last received packet
"snr" : 10.8, // float, dB
"crypto_mode" : 0, // 0=AES256-GCM, 1=AES128-GCM,
// 2=AES256-CBC, 3=plaintext
"fec_errors_last_cycle" : 0 // int, RS symbol errors corrected
}
Notes : Pushed every 10 seconds by the status_task. READ returns
last known values. Subscribe for live telemetry.

0xFF03 AUTHENTICATION
UUID : 0000FF03-0000-1000-8000-00805F9B34FB
Props : WRITE (no response)
Auth : none (this IS the auth step)
Payload : any non-empty byte array (POC: simple presence check)
Example : write ASCII token e.g. "SATCOM_AUTH_TOKEN" as UTF-8 bytes
Flow : write → server sets s_authenticated=true → 0xFF01 READ/NOTIFY
unlocked for this connection session.
Notes : Must be written once after connect, before subscribing to
0xFF01. Auth state resets on disconnect.

0xFF04 CONFIGURATION
UUID : 0000FF04-0000-1000-8000-00805F9B34FB
Props : READ | WRITE
Auth : not required
READ payload (JSON):
{
"crypto_mode" : 0,
"carousel_cycle_secs" : 30,
"cw_rotation_secs" : 3600,
"fec_enabled" : false
}
WRITE payload (JSON, partial updates supported):
{ "crypto_mode": 0 } // 0–3, saved to NVS, takes effect immediately
Notes : Only crypto_mode write is currently parsed. Other fields
are read-only reflections of NVS config.

── CONNECTION FLOW ────────────────────────────────────────────────────────────

1. startScan({ serviceUUIDs: ['0000FF00-0000-1000-8000-00805F9B34FB'] })
2. On device found → stopScan → connectToDevice(device.id)
3. discoverAllServicesAndCharacteristics()
4. monitorCharacteristic(SVC, CHR_STATUS, callback) // subscribe status
5. writeCharacteristicWithResponse(SVC, CHR_AUTH,
   Buffer.from('SATCOM_AUTH_TOKEN')) // authenticate
6. monitorCharacteristic(SVC, CHR_MSG, callback) // subscribe messages
7. On disconnect → re-scan and reconnect automatically

── TELEMETRY DISPLAY RECOMMENDATIONS ─────────────────────────────────────────
From 0xFF02 status notifications:

LoRa Signal card:
RSSI : lora_rssi (dBm) → colour code: > -60 good, > -100 ok, else weak
SNR : snr (dB) → > 0 = above noise floor
Crypto : crypto_mode name → "AES-256-GCM" etc.
FEC errs : fec_errors_last_cycle

Message feed (from 0xFF01 notifications):
Parse pipe-delimited fields:
ts = timestamp (ISO-8601)
seq = sequence number
lat = latitude (decimal degrees)
lon = longitude (decimal degrees)
alt = altitude (metres, strip trailing 'm')
Display on map pin + message list with RSSI/SNR badge per message.

── CONSTANTS (copy into ble_constants.ts) ─────────────────────────────────────
export const BLE = {
SERVICE : '0000FF00-0000-1000-8000-00805F9B34FB',
CHR_MESSAGE : '0000FF01-0000-1000-8000-00805F9B34FB',
CHR_STATUS : '0000FF02-0000-1000-8000-00805F9B34FB',
CHR_AUTH : '0000FF03-0000-1000-8000-00805F9B34FB',
CHR_CONFIG : '0000FF04-0000-1000-8000-00805F9B34FB',
AUTH_TOKEN : 'SATCOM_AUTH_TOKEN',
DEVICE_NAME_PREFIX: 'SatcomNode-',
};

── NOTES FOR DEVELOPER ────────────────────────────────────────────────────────
• The peripheral re-advertises automatically after disconnect — implement
auto-reconnect with exponential backoff (500ms → 1s → 2s → 5s max).
• On iOS, scan must be started AFTER CBCentralManager state = poweredOn.
• Notification payloads are raw bytes — decode with
Buffer.from(value, 'base64').toString('utf8') in react-native-ble-plx.
• The device name appears in the SCAN RESPONSE (not primary adv packet),
so device.name may be null on the first advertisement event — use
serviceUUIDs filter, not name filter, for reliable discovery.
• 0xFF01 message READ returns an empty buffer until the first LoRa packet
is successfully decrypted — handle zero-length reads gracefully.
• Battery % is currently a hardcoded mock (85). Plan for ADC integration.

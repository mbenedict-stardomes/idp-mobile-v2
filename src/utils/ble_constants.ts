export const BLE = {
  SERVICE: '0000ff00-0000-1000-8000-00805f9b34fb',
  CHR_MESSAGE: '0000ff01-0000-1000-8000-00805f9b34fb',       // Notify: messages
  CHR_STATUS: '0000ff02-0000-1000-8000-00805f9b34fb',        // Read/Notify: telemetry
  CHR_AUTH: '0000ff03-0000-1000-8000-00805f9b34fb',          // Write: auth token
  CHR_CONFIG: '0000ff04-0000-1000-8000-00805f9b34fb',        // Read/Write: config
  CHR_RESPONSE: '0000ff05-0000-1000-8000-00805f9b34fb',      // Write: FIDO2 response (Phase 2)
  CHR_CHALLENGE: '0000ff06-0000-1000-8000-00805f9b34fb',     // Notify: FIDO2 challenge (Phase 2)
  CHR_TERMINAL_ID: '0000ff07-0000-1000-8000-00805f9b34fb',   // Read: Terminal ID
  CHR_MAC_ID: '0000ff08-0000-1000-8000-00805f9b34fb',        // Read: MAC ID
  CHR_HMAC_KEY: '0000ff09-0000-1000-8000-00805f9b34fb',      // Read: HMAC Key
  AUTH_TOKEN: 'SATCOM_AUTH_TOKEN',
  DEVICE_NAME_PREFIX: 'SatcomNode-',
  ACK_TIMEOUT_MS: 5000,
};

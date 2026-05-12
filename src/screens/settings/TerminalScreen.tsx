import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useBLE } from '../../hooks/useBLE';
import Card from '../../components/Card';
import Button from '../../components/Button';

// Utility formatters based on recommendations
const getRssiColor = (rssi: number) => {
  if (rssi > -60) return '#22c55e'; // good
  if (rssi > -100) return '#eab308'; // ok
  return '#ef4444'; // weak
};

const getCryptoModeName = (mode: number) => {
  const modes = ['AES-256-GCM', 'AES-128-GCM', 'AES-256-CBC', 'Plaintext'];
  return modes[mode] || 'Unknown';
};

export const TerminalScreen = () => {
  const { isConnected, status, messages, readConfig, writeConfig, connectDevice, deviceInfo } = useBLE();
  const [loadingConfig, setLoadingConfig] = useState(false);

  const handleUpdateCrypto = async (mode: number) => {
    setLoadingConfig(true);
    await writeConfig(mode);
    setLoadingConfig(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Satcom Terminal</Text>
        <View style={[styles.statusBadge, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
          <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
          <Text style={[styles.statusText, isConnected ? styles.textConnected : styles.textDisconnected]}>
            {isConnected ? 'Terminal Connected' : 'Searching for Terminal...'}
          </Text>
        </View>
      </View>

      {!isConnected ? (
        <View style={styles.disconnectedState}>
          <Text style={styles.disconnectedText}>
            Ensure your Stardomes terminal is powered on and within range.
          </Text>
          <Button title="Scan & Connect" onPress={connectDevice} />
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Device Identity</Text>
          <Card style={styles.card}>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Terminal ID</Text>
                <Text style={styles.telemetryValue} numberOfLines={1} adjustsFontSizeToFit>{deviceInfo?.terminalId || 'N/A'}</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>BLE Profile</Text>
                <Text style={styles.telemetryValue} numberOfLines={1} adjustsFontSizeToFit>SatCom 0xFF00</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>MAC ID</Text>
                <Text style={styles.telemetryValue} numberOfLines={1} adjustsFontSizeToFit>{deviceInfo?.macId || 'N/A'}</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>HMAC</Text>
                <Text style={styles.telemetryValue} numberOfLines={1} adjustsFontSizeToFit>{deviceInfo?.hmac || 'N/A'}</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Telemetry</Text>
          <Card style={styles.card}>
            <View style={styles.telemetryGrid}>
              {/* Telemetry Status */}
              {status ? (
                <>
                  <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>Battery</Text>
                  <Text style={styles.telemetryValue}>{status.battery_pct}%</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>LoRa RSSI</Text>
                  <Text style={[styles.telemetryValue, { color: getRssiColor(status.lora_rssi ?? -120) }]}>
                    {status.lora_rssi} dBm
                  </Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>SNR</Text>
                  <Text style={styles.telemetryValue}>{status.snr} dB</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>Crypto</Text>
                  <Text style={styles.telemetryValue}>{getCryptoModeName(status.crypto_mode ?? 0)}</Text>
                </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryLabel}>FEC Errors</Text>
                    <Text style={styles.telemetryValue}>{status.fec_errors_last_cycle}</Text>
                  </View>
                </>
              ) : (
                <View style={[styles.telemetryItem, { width: '100%' }]}>
                  <Text style={styles.waitingText}>Waiting for telemetry data...</Text>
                </View>
              )}
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Configuration</Text>
          <Card style={styles.card}>
            <Text style={styles.configHint}>Update Crypto Mode</Text>
            <View style={styles.buttonRow}>
              {[0, 1, 2, 3].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    status?.crypto_mode === mode && styles.modeButtonActive
                  ]}
                  onPress={() => handleUpdateCrypto(mode)}
                  disabled={loadingConfig}
                >
                  <Text style={[
                    styles.modeButtonText,
                    status?.crypto_mode === mode && styles.modeButtonTextActive
                  ]}>
                    {getCryptoModeName(mode)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Message Feed</Text>
          <Card style={[styles.card, styles.messageCard]}>
            {messages.length === 0 ? (
              <Text style={styles.waitingText}>No messages received yet.</Text>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={styles.messageItem}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageType}>{msg.type}</Text>
                    <Text style={styles.messageTime}>
                      {msg.ts ? new Date(msg.ts).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                  <Text style={styles.messageBody}>Seq: {msg.seq || 'N/A'}</Text>
                  {(msg.lat || msg.lon) && (
                    <Text style={styles.messageLocation}>
                      Location: {msg.lat}, {msg.lon} {msg.alt ? `(${msg.alt}m)` : ''}
                    </Text>
                  )}
                  <Text style={styles.rawMessage} numberOfLines={1}>Raw: {msg.raw}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B25',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  badgeDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textConnected: {
    color: '#22c55e',
  },
  textDisconnected: {
    color: '#ef4444',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  disconnectedState: {
    alignItems: 'center',
    marginTop: 40,
  },
  disconnectedText: {
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#1E1F3D',
    marginBottom: 16,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  telemetryItem: {
    width: '45%',
  },
  telemetryLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  waitingText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  configHint: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2A2C54',
    borderWidth: 1,
    borderColor: '#3D407A',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  modeButtonText: {
    color: '#d1d5db',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  messageCard: {
    padding: 0,
  },
  messageItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C54',
    padding: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageType: {
    fontWeight: '700',
    color: '#3b82f6',
  },
  messageTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageBody: {
    color: '#ffffff',
    marginBottom: 4,
  },
  messageLocation: {
    color: '#eab308',
    fontSize: 13,
    marginBottom: 4,
  },
  rawMessage: {
    color: '#6b7280',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

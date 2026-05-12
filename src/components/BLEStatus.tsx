import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBLE } from '../hooks/useBLE';

export const BLEStatus: React.FC = () => {
  const { isConnected } = useBLE();

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <View style={[styles.dot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
      <Text style={[styles.text, isConnected ? styles.textConnected : styles.textDisconnected]}>
        {isConnected ? 'Terminal Connected' : 'Searching for Terminal...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  disconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotConnected: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotDisconnected: {
    backgroundColor: '#ef4444',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textConnected: {
    color: '#22c55e',
  },
  textDisconnected: {
    color: '#ef4444',
  },
});

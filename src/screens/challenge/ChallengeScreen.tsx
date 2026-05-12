import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticateAppLaunch } from '../../security/appLaunchBiometric';

export default function ChallengeScreen() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const launchSecure = async () => {
      const success = await authenticateAppLaunch();
      setUnlocked(success);
    };
    launchSecure();
  }, []);

  if (!unlocked) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>App Locked</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Active Challenges</Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.bankName}>Emirates NBD</Text>
          <Text style={styles.badge}>PENDING</Text>
        </View>
        <Text style={styles.amount}>1,450.00 AED</Text>
        <Text style={styles.context}>Transfer to Mohammed Ali</Text>
        
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnDeny]}>
            <Text style={styles.btnText}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnApprove]}>
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankName: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  context: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDeny: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnApprove: {
    backgroundColor: '#3b82f6',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

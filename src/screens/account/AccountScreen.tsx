import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ThemeProvider, useTheme } from '../../theme';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import SettingsRow from '../../components/SettingsRow';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { getSecureItem } from '../../services/secureStorage';
import { getBiometricStatus, authenticate } from '../../services/biometric';
import { api, ApiError } from '../../services/api';

function AccountContent() {
  const { colors, typography, spacing } = useTheme();

  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    subjectId: '',
    identityId: '',
    deviceId: '',
  });
  const [deviceModel, setDeviceModel] = useState('');
  const [osInfo, setOsInfo] = useState('');
  const [deviceTrusted, setDeviceTrusted] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    loadProfile();
    loadBiometrics();
  }, []);

  const loadProfile = async () => {
    const [displayName, email, phone, subjectId, identityId, deviceId] =
      await Promise.all([
        getSecureItem('ONBOARDING_DISPLAY_NAME'),
        getSecureItem('ONBOARDING_EMAIL'),
        getSecureItem('ONBOARDING_PHONE'),
        getSecureItem('ONBOARDING_SUBJECT_ID'),
        getSecureItem('IDENTITY_ID'),
        getSecureItem('DEVICE_ID'),
      ]);

    setProfile({
      displayName: displayName || 'Unknown',
      email: email || '-',
      phone: phone || '-',
      subjectId: subjectId || '-',
      identityId: identityId || '',
      deviceId: deviceId || '',
    });

    setDeviceModel(
      (Constants as any).deviceName || `${Platform.OS} Device`,
    );
    setOsInfo(`${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`);

    // Fetch device trust status from backend
    if (deviceId) {
      try {
        const status = await api.getDeviceStatus(deviceId);
        setDeviceTrusted(status.is_trusted);
      } catch {
        // Offline or not found
      }
    }
  };

  const loadBiometrics = async () => {
    const status = await getBiometricStatus();
    setBiometricLabel(status.biometricLabel);
    setBiometricEnrolled(status.isEnrolled);
    setBiometricAvailable(status.hasHardware);
  };

  const handleToggleBiometric = async () => {
    if (!biometricAvailable) {
      Alert.alert('Unavailable', 'No biometric hardware detected on this device.');
      return;
    }
    if (biometricEnrolled) {
      Alert.alert(
        `Disable ${biometricLabel}`,
        `To disable ${biometricLabel}, go to your device Settings > Security.`,
      );
    } else {
      const ok = await authenticate(`Enable ${biometricLabel} for Stardomes`);
      if (ok) {
        setBiometricEnrolled(true);
        Alert.alert('Enabled', `${biometricLabel} is now enabled for Stardomes.`);
      }
    }
  };

  const handleUnbindDevice = () => {
    Alert.alert(
      'Unbind Device',
      'This will revoke the current device binding. You will need to re-register this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unbind',
          style: 'destructive',
          onPress: async () => {
            if (!profile.deviceId) return;
            try {
              await api.revokeDevice(profile.deviceId, 'REPLACED');
              setDeviceTrusted(false);
              Alert.alert('Unbound', 'Device has been unbound successfully.');
            } catch (err) {
              const msg = err instanceof ApiError ? err.description : 'Failed to unbind device.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handleChangePIN = () => {
    Alert.alert('Change PIN', 'PIN change will be available in a future update.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={[typography.h1, { color: colors.secondary[500], marginBottom: spacing.sm }]}>
          Account
        </Text>

        {/* ── Identity Info ── */}
        <SectionHeader title="IDENTITY" />
        <Card>
          <SettingsRow
            icon="person-outline"
            label="Name"
            value={profile.displayName}
          />
          <SettingsRow
            icon="mail-outline"
            label="Email"
            value={profile.email}
          />
          <SettingsRow
            icon="phone-portrait-outline"
            label="Phone"
            value={profile.phone}
          />
          <SettingsRow
            icon="key-outline"
            label="Subject ID"
            value={profile.subjectId ? profile.subjectId.slice(0, 16) + '...' : '-'}
            last
          />
        </Card>

        {/* ── Device Management ── */}
        <SectionHeader title="DEVICE" />
        <Card>
          <SettingsRow
            icon="phone-portrait-outline"
            label="Device"
            value={deviceModel}
          />
          <SettingsRow
            icon="logo-apple"
            label="OS"
            value={osInfo}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Trust Status"
            badge={<StatusBadge status={deviceTrusted ? 'ACTIVE' : 'PENDING'} />}
          />
          <SettingsRow
            icon="trash-outline"
            label="Unbind Device"
            danger
            onPress={handleUnbindDevice}
            last
          />
        </Card>

        {/* ── Security ── */}
        <SectionHeader title="SECURITY" />
        <Card>
          <SettingsRow
            icon="finger-print-outline"
            label={biometricLabel}
            value={biometricEnrolled ? 'Enabled' : 'Disabled'}
            onPress={handleToggleBiometric}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change PIN"
            onPress={handleChangePIN}
            last
          />
        </Card>

        {/* ── Linked Banks ── */}
        <SectionHeader title="LINKED BANKS" />
        <Card style={{ paddingVertical: spacing.xl }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[typography.body, { color: '#999999' }]}>
              No banks linked yet
            </Text>
            <Text style={[typography.caption, { color: '#CCCCCC', marginTop: spacing.xs }]}>
              Banks will appear here after your first transaction
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function AccountScreen() {
  return (
    <ThemeProvider mode="light">
      <AccountContent />
    </ThemeProvider>
  );
}

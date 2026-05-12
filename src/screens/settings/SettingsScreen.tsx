import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../../theme';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import SettingsRow from '../../components/SettingsRow';
import { useAppContext } from '../../navigation/AppContext';
import { clearSession } from '../../services/session';
import { clearOnboardingState } from '../../services/onboarding';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useBLE } from '../../hooks/useBLE';

function SettingsContent() {
  const { colors, typography, spacing } = useTheme();
  const { onLogout } = useAppContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isConnected } = useBLE();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [challengeAlerts, setChallengeAlerts] = useState(true);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out? You will need to re-register.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          await clearOnboardingState();
          onLogout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your identity data, device bindings, and transaction history will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={[typography.h1, { color: colors.secondary[500], marginBottom: spacing.sm }]}>
          Settings
        </Text>

        {/* ── Notifications ── */}
        <SectionHeader title="NOTIFICATIONS" />
        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: '#E6E6E6',
            }}
          >
            <Text style={[typography.body, { color: colors.secondary[500] }]}>
              Push Notifications
            </Text>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#CCCCCC', true: colors.primary[300] }}
              thumbColor={pushEnabled ? colors.primary[500] : '#F5F5F5'}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.md,
            }}
          >
            <Text style={[typography.body, { color: colors.secondary[500] }]}>
              Challenge Sound & Vibration
            </Text>
            <Switch
              value={challengeAlerts}
              onValueChange={setChallengeAlerts}
              trackColor={{ false: '#CCCCCC', true: colors.primary[300] }}
              thumbColor={challengeAlerts ? colors.primary[500] : '#F5F5F5'}
            />
          </View>
        </Card>

        {/* ── Connectivity ── */}
        <SectionHeader title="CONNECTIVITY" />
        <Card>
          <SettingsRow
            icon="bluetooth-outline"
            label="BLE Terminal"
            value={isConnected ? "Connected" : "Disconnected"}
            onPress={() => navigation.navigate('Terminal')}
            last
          />
        </Card>

        {/* ── About ── */}
        <SectionHeader title="ABOUT" />
        <Card>
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            value="1.0.0"
          />
          <SettingsRow
            icon="radio-outline"
            label="Stardomes"
            value="An Emcredit Venture"
          />
          <SettingsRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() =>
              Alert.alert('Privacy Policy', 'Privacy policy will be available at launch.')
            }
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Support"
            onPress={() =>
              Alert.alert('Support', 'Contact support@stardomes.ae for assistance.')
            }
            last
          />
        </Card>

        {/* ── Account Actions ── */}
        <SectionHeader title="ACCOUNT" />
        <Card>
          <SettingsRow
            icon="log-out-outline"
            label="Logout"
            danger
            onPress={handleLogout}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            danger
            onPress={handleDeleteAccount}
            last
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  return (
    <ThemeProvider mode="light">
      <SettingsContent />
    </ThemeProvider>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { api, ChallengeItem, ApiError } from '../../services/api';
import { authenticateAppLaunch } from '../../security/appLaunchBiometric';
import { FidoService } from '../../services/fido';
import { startJourney, setJourneyStep, endJourney } from '../../services/journeyTelemetry';

export default function HomeScreen() {
  const { colors, gradients, typography, spacing } = useTheme();

  const [unlocked, setUnlocked] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Biometric gate on first load
  useEffect(() => {
    (async () => {
      const ok = await authenticateAppLaunch();
      setUnlocked(ok);
    })();
  }, []);

  const fetchChallenges = useCallback(async () => {
    startJourney('FLOW_AUTH_CHALLENGE_APPROVAL', 'CHALLENGE_LIST');
    try {
      const result = await api.getPendingChallenges();
      setChallenges(result.challenges || []);
    } catch {
      // Silently fail — show empty state
      setChallenges([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchChallenges();
  }, [unlocked, fetchChallenges]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const handleApprove = async (item: ChallengeItem) => {
    setJourneyStep('BIOMETRIC_AUTH');
    setRespondingId(item.id);
    
    try {
      if (!item.challenge) {
        throw new Error('No FIDO2 challenge provided by the server.');
      }
      
      // signChallenge handles the biometric prompt and generates the FIDO2 assertion
      const assertion = await FidoService.signChallenge(item.challenge);

      setJourneyStep('CHALLENGE_SUBMIT');
      await api.respondToChallenge(item.id, { 
        action: 'APPROVE',
        fido2_assertion: assertion
      });
      
      setJourneyStep('RESULT');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setChallenges((prev) => prev.filter((c) => c.id !== item.id));
      endJourney();
    } catch (err) {
      const msg = err instanceof ApiError ? err.description : (err as Error).message || 'Failed to approve.';
      Alert.alert('Error', msg);
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeny = (item: ChallengeItem) => {
    Alert.alert('Deny Transaction', 'Are you sure you want to deny this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deny',
        style: 'destructive',
        onPress: async () => {
          setRespondingId(item.id);
          try {
            await api.respondToChallenge(item.id, {
              action: 'DENY',
              reason: 'UNRECOGNIZED_TRANSACTION',
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setChallenges((prev) => prev.filter((c) => c.id !== item.id));
          } catch (err) {
            const msg = err instanceof ApiError ? err.description : 'Failed to deny.';
            Alert.alert('Error', msg);
          } finally {
            setRespondingId(null);
          }
        },
      },
    ]);
  };

  if (!unlocked) {
    return (
      <LinearGradient
        colors={[...gradients.secureDark.colors]}
        start={gradients.secureDark.start}
        end={gradients.secureDark.end}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={[typography.h2, { color: '#FFFFFF' }]}>App Locked</Text>
        <Text style={[typography.body, { color: '#9E9FBB', marginTop: spacing.sm }]}>
          Authenticate to unlock
        </Text>
      </LinearGradient>
    );
  }

  const renderChallenge = ({ item }: { item: ChallengeItem }) => {
    const isResponding = respondingId === item.id;

    return (
      <Card style={{ marginBottom: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.overline, { color: '#9E9FBB' }]}>
            {item.client_name || 'Unknown Bank'}
          </Text>
          <StatusBadge status={(item.status as any) || 'PENDING'} />
        </View>

        {item.amount && (
          <Text
            style={[
              typography.h1,
              { color: '#FFFFFF', marginBottom: spacing.xs },
            ]}
          >
            {item.amount} {item.currency || 'AED'}
          </Text>
        )}

        {item.binding_message && (
          <Text
            style={[
              typography.body,
              { color: '#9E9FBB', marginBottom: spacing.lg },
            ]}
          >
            {item.binding_message}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Deny"
              onPress={() => handleDeny(item)}
              variant="danger"
              disabled={isResponding}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Approve"
              onPress={() => handleApprove(item)}
              loading={isResponding}
              disabled={isResponding}
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
          <Text style={[typography.h1, { color: '#FFFFFF' }]}>
            Challenges
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : challenges.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            message="No Pending Challenges"
            submessage="Pull down to refresh. You'll be notified when a new transaction requires approval."
          />
        ) : (
          <FlatList
            data={challenges}
            keyExtractor={(item) => item.id}
            renderItem={renderChallenge}
            contentContainerStyle={{ padding: spacing.lg }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary[500]}
                colors={[colors.primary[500]]}
              />
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

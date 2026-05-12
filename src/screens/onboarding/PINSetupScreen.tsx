import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { saveSecureItem } from '../../services/secureStorage';
import { markPinSet } from '../../services/onboarding';
import { setJourneyStep } from '../../services/journeyTelemetry';

const PIN_LENGTH = 6;

export default function PINSetupScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing } = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');

  const activePin = phase === 'enter' ? pin : confirmPin;
  const setActivePin = phase === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (activePin.length >= PIN_LENGTH) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = activePin + digit;
    setActivePin(next);

    if (next.length === PIN_LENGTH) {
      if (phase === 'enter') {
        setTimeout(() => setPhase('confirm'), 300);
      } else {
        // Confirm phase
        setTimeout(async () => {
          if (next === pin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await saveSecureItem('USER_PIN', pin);
            await markPinSet();
            setJourneyStep('DEVICE_BINDING');
            navigation.navigate('DeviceBinding');
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Mismatch', 'PINs do not match. Please try again.');
            setPin('');
            setConfirmPin('');
            setPhase('enter');
          }
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    if (activePin.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePin(activePin.slice(0, -1));
  };

  const stepIndex = 4;

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        {/* Step indicator */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: i === stepIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i <= stepIndex ? colors.primary[500] : colors.secondary[400],
              }}
            />
          ))}
        </View>

        <Text
          style={[
            typography.h1,
            { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.sm },
          ]}
        >
          {phase === 'enter' ? 'Set Your PIN' : 'Confirm PIN'}
        </Text>
        <Text
          style={[
            typography.body,
            { color: '#9E9FBB', textAlign: 'center', marginBottom: spacing.xxl },
          ]}
        >
          {phase === 'enter'
            ? 'Choose a 6-digit PIN as a backup for biometric authentication.'
            : 'Enter your PIN again to confirm.'}
        </Text>

        {/* Dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.md,
            marginBottom: spacing.xxl,
          }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor:
                  i < activePin.length
                    ? colors.primary[500]
                    : colors.secondary[400],
              }}
            />
          ))}
        </View>

        {/* Number pad */}
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {[[1, 2, 3], [4, 5, 6], [7, 8, 9], [null, 0, 'del']].map((row, ri) => (
            <View
              key={ri}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              {row.map((key, ci) => {
                if (key === null) {
                  return <View key={ci} style={{ width: 72, height: 72 }} />;
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity
                      key={ci}
                      onPress={handleBackspace}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="backspace-outline" size={28} color="#9E9FBB" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={ci}
                    onPress={() => handleDigit(key.toString())}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.secondary[500],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 28,
                        fontWeight: '600',
                      }}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

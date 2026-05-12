import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { api, ApiError } from '../../services/api';
import { saveIdentityData } from '../../services/onboarding';
import { setJourneyStep } from '../../services/journeyTelemetry';

export default function RegisterScreen({ navigation }: any) {
  const { colors, gradients, typography, spacing } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = 'Name is required';
    if (!email.trim() && !phone.trim()) errs.phone = 'Email or phone is required';
    if (email.trim() && !email.includes('@')) errs.email = 'Invalid email address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await api.registerIdentity({
        display_name: displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      // Persist identity data + advance onboarding step
      await saveIdentityData({
        identityId: result.identity_id,
        subjectId: result.subject_identifier,
        displayName: displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      setJourneyStep('VERIFY_PHONE');
      navigation.navigate('VerifyPhone');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert('Already Registered', 'An identity with this email or phone already exists.');
      } else if (err instanceof ApiError) {
        Alert.alert('Registration Failed', err.description);
      } else {
        Alert.alert('Network Error', 'Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = 1;

  return (
    <LinearGradient
      colors={[...gradients.starfield.colors]}
      start={gradients.starfield.start}
      end={gradients.starfield.end}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
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

            <Text style={[typography.h1, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
              Register Identity
            </Text>
            <Text
              style={[
                typography.body,
                { color: '#9E9FBB', marginBottom: spacing.xl },
              ]}
            >
              Create your Stardomes identity to secure your banking transactions.
            </Text>

            <Input
              label="Full Name"
              placeholder="e.g. Mohammed Ali"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              error={errors.displayName}
            />

            <Input
              label="Email Address"
              placeholder="e.g. name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              placeholder="+971 50 XXX XXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <View style={{ flex: 1 }} />

            <Button
              title="Continue"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              size="large"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

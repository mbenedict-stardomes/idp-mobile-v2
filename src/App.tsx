import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './theme';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider mode="dark">
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { MainTabsParamList } from './types';
import HomeScreen from '../screens/challenge/HomeScreen';
import AccountScreen from '../screens/account/AccountScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICON_MAP: Record<keyof MainTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'shield-checkmark-outline',
  Account: 'person-outline',
  Settings: 'settings-outline',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.secondary[500],
          borderTopColor: colors.secondary[400],
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICON_MAP[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Challenges' }} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

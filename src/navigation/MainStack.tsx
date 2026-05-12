import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChallengeScreen from '../screens/challenge/ChallengeScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
    </Stack.Navigator>
  );
}

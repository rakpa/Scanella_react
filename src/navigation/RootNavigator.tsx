import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from './types';
import { HomeTabs } from './HomeTabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { NativeScanScreen } from '../screens/NativeScanScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { CropScreen } from '../screens/CropScreen';
import { DocumentDetailScreen } from '../screens/DocumentDetailScreen';
import { OcrResultScreen } from '../screens/OcrResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors, scheme } = useTheme();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.outline,
      primary: colors.lime,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={onboardingComplete ? 'Home' : 'Welcome'}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen name="NativeScan" component={NativeScanScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Crop" component={CropScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OcrResult" component={OcrResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/useAppStore';
import { Lime } from './src/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Gate() {
  const { colors, scheme } = useTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={Lime} />
      </View>
    );
  }
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular: require('./assets/fonts/PlusJakartaSans-400.ttf'),
    PlusJakartaSans_500Medium: require('./assets/fonts/PlusJakartaSans-500.ttf'),
    PlusJakartaSans_600SemiBold: require('./assets/fonts/PlusJakartaSans-600.ttf'),
    PlusJakartaSans_700Bold: require('./assets/fonts/PlusJakartaSans-700.ttf'),
    PlusJakartaSans_800ExtraBold: require('./assets/fonts/PlusJakartaSans-800.ttf'),
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F7F9FC' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Gate />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

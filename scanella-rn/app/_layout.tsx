import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIsDark, useScheme } from '../src/components/theme';

export default function RootLayout() {
  const scheme = useScheme();
  const isDark = useIsDark();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: scheme.canvas },
          headerTintColor: scheme.accent,
          headerTitleStyle: { color: scheme.onSurface, fontWeight: '700' },
          contentStyle: { backgroundColor: scheme.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="document/[id]" options={{ title: '' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

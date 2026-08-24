import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { Appearance, StyleSheet, View } from 'react-native';
import {
  ColorScheme,
  Palette,
  ThemeMode,
  darkPalette,
  lightPalette,
} from './colors';
import { useAppStore } from '../store/useAppStore';

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  scheme: 'light',
  colors: lightPalette,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useAppStore((s) => s.settings.themeMode);
  const [system, setSystem] = useState<ColorScheme>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme = mode === 'system' ? system : mode;
    return {
      mode,
      scheme,
      colors: scheme === 'dark' ? darkPalette : lightPalette,
    };
  }, [mode, system]);

  return (
    <ThemeContext.Provider value={value}>
      <View
        style={[styles.fill, { backgroundColor: value.colors.canvas }]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

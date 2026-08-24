import { useColorScheme } from 'react-native';

import { darkScheme, lightScheme, type Scheme } from '../theme/brand';

/** The palette for the brightness the device is currently in. */
export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? darkScheme : lightScheme;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

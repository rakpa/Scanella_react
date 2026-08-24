import { Platform } from 'react-native';

export async function recognizeText(_uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return '';
  }
  // On-device OCR is wired through Apple Vision in a development build.
  // Expo Go does not expose the Vision text recogniser, so we return empty
  // rather than sending the page off-device.
  return '';
}

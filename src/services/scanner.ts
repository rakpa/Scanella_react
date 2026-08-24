import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Expo Go does not include VisionKit. Do not import
 * react-native-document-scanner-plugin from this file — a static or bundled
 * require crashes startup with TurboModuleRegistry.getEnforcing('DocumentScanner').
 * A development build can call VisionKit from a native screen later.
 */
export async function scanWithVisionKit(): Promise<string[] | null> {
  return scanWithCamera();
}

export async function scanWithCamera(): Promise<string[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return [];
  const shot = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });
  if (shot.canceled || !shot.assets[0]) return null;
  return [shot.assets[0].uri];
}

export async function pickPhotos(): Promise<string[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    allowsMultipleSelection: true,
    mediaTypes: ['images'],
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri);
}

export async function pickFiles(): Promise<string[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets
    .filter((a) => a.mimeType?.startsWith('image/') && a.uri)
    .map((a) => a.uri);
}

export function scannerNeedsDevice() {
  return Platform.OS === 'web';
}

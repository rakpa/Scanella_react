import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * VisionKit lives in a custom native module. Expo Go does not ship it, so we
 * never import that package at startup — a static import crashes the whole
 * bundle with TurboModuleRegistry.getEnforcing('DocumentScanner').
 */
export async function scanWithVisionKit(): Promise<string[] | null> {
  if (isExpoGo() || Platform.OS === 'web') {
    return scanWithCamera();
  }

  try {
    // Loaded only in a dev/production build that actually contains the module.
    const plugin = require('react-native-document-scanner-plugin') as {
      default: {
        scanDocument: (options?: { croppedImageQuality?: number }) => Promise<{
          status?: string;
          scannedImages?: string[];
        }>;
      };
    };
    const DocumentScanner = plugin.default ?? plugin;
    const result = await DocumentScanner.scanDocument({
      croppedImageQuality: 100,
    });
    if (result.status === 'cancel') return null;
    return result.scannedImages ?? [];
  } catch {
    return scanWithCamera();
  }
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

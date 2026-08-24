import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DocumentScanner, {
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

export async function scanWithVisionKit(): Promise<string[] | null> {
  try {
    const result = await DocumentScanner.scanDocument({
      croppedImageQuality: 100,
    });
    if (result.status === ScanDocumentResponseStatus.Cancel) return null;
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

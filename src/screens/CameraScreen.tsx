import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandButton } from '../components/BrandButton';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { defaultTitle, useAppStore } from '../store/useAppStore';
import { persistScans } from '../services/documents';
import { RootStackParamList } from '../navigation/types';

export function CameraScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const addDocument = useAppStore((s) => s.addDocument);
  const filter = useAppStore((s) => s.settings.defaultFilter);

  const shoot = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) return;
      const doc = await persistScans([photo.uri], {
        title: defaultTitle(),
        filter,
        edgesAlreadyApplied: false,
      });
      await addDocument(doc);
      navigation.replace('Crop', { imageUri: photo.uri, documentId: doc.id, pageId: doc.pages[0]?.id });
    } finally {
      setBusy(false);
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.ink }]}>Camera access</Text>
          <Text style={[styles.body, { color: colors.grey }]}>
            Scanella needs the camera to capture pages. Nothing is uploaded.
          </Text>
          <View style={{ height: 20 }} />
          <BrandButton label="Allow camera" onPress={() => void requestPermission()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <SafeAreaView style={styles.chrome}>
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </PressableScale>
        <Text style={styles.hint}>Line up the page inside the frame</Text>
        <View style={{ width: 28 }} />
      </SafeAreaView>
      <View style={styles.shutterWrap}>
        <PressableScale onPress={shoot} haptic="medium" disabled={busy}>
          <View style={styles.shutterOuter}>
            <View style={[styles.shutterInner, { backgroundColor: Lime }]} />
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', padding: 28 },
  title: { fontFamily: Fonts.extraBold, fontSize: 24, textAlign: 'center' },
  body: { fontFamily: Fonts.medium, fontSize: 15, textAlign: 'center', marginTop: 8 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '78%',
    height: '58%',
    borderWidth: 2,
    borderColor: Lime,
    borderRadius: 18,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: { fontFamily: Fonts.semibold, color: '#FFFFFF', fontSize: 14 },
  shutterWrap: { position: 'absolute', bottom: 42, alignSelf: 'center' },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31 },
});

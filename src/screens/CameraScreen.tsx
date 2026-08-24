import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
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
import { DocumentEdgeTracker, idleScanState, ScanState } from '../scanner/documentEdgeTracker';
import { Quad } from '../scanner/geometry';
import { deleteQuietly } from '../scanner/jpeg';
import { detectLiveFromUri, processCapture } from '../scanner/scanPipeline';
import { QuadOverlay } from '../scanner/QuadOverlay';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function CameraScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const trackerRef = useRef<DocumentEdgeTracker | null>(null);
  const capturingRef = useRef(false);
  const analyzingRef = useRef(false);
  const readyRef = useRef(false);
  const pictureLock = useRef(Promise.resolve());
  const captureFn = useRef<() => void>(() => undefined);
  const scanRef = useRef<ScanState>(idleScanState());
  const [scan, setScan] = useState<ScanState>(idleScanState);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const addDocument = useAppStore((s) => s.addDocument);
  const filter = useAppStore((s) => s.settings.defaultFilter);
  const autoCapture = useAppStore((s) => s.settings.autoCapture);
  const shutterSound = useAppStore((s) => s.settings.shutterSound);
  scanRef.current = scan;

  const takePicture = useCallback(
    (options: { quality: number; shutterSound: boolean; timeoutMs: number }) => {
      const run = async () => {
        if (!camera.current) throw new Error('Camera is not ready');
        return withTimeout(
          camera.current.takePictureAsync({
            quality: options.quality,
            shutterSound: options.shutterSound,
          }),
          options.timeoutMs,
          'Camera timed out',
        );
      };
      const next = pictureLock.current.then(run, run);
      pictureLock.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    [],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewSize({ width, height });
  };

  const capture = useCallback(async () => {
    if (!camera.current || capturingRef.current) return;
    capturingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const waitStart = Date.now();
      while (analyzingRef.current && Date.now() - waitStart < 2500) {
        await sleep(40);
      }

      setFlash(1);
      setTimeout(() => setFlash(0), 90);

      const photo = await takePicture({
        quality: 0.92,
        shutterSound,
        timeoutMs: 8000,
      });
      if (!photo?.uri) {
        trackerRef.current?.releaseCaptureLock();
        return;
      }

      setBusy(true);
      setStatus('Straightening page…');
      const live = scanRef.current;
      const fallback = live.hasDocument ? live.quad : null;
      const processed = await processCapture({
        uri: photo.uri,
        fallbackQuad: fallback,
        filter,
        detectEdges: true,
        sourceWidth: photo.width,
        sourceHeight: photo.height,
      });

      setStatus('Saving page…');
      const doc = await persistScans([processed.processedUri], {
        title: defaultTitle(),
        filter,
        edgesAlreadyApplied: true,
        originalUris: [processed.originalUri],
      });
      await addDocument(doc);
      trackerRef.current?.lockAfterCapture(processed.quad ?? fallback ?? Quad.centered());
      navigation.replace('Crop', {
        imageUri: processed.processedUri,
        originalUri: processed.originalUri,
        documentId: doc.id,
        pageId: doc.pages[0]?.id,
        filter,
      });
    } catch {
      trackerRef.current?.releaseCaptureLock();
      setStatus('Could not capture — try the shutter');
    } finally {
      capturingRef.current = false;
      setBusy(false);
    }
  }, [addDocument, filter, navigation, shutterSound, takePicture]);

  captureFn.current = () => {
    void capture();
  };

  useEffect(() => {
    const tracker = new DocumentEdgeTracker({
      onAutoCapture: () => captureFn.current(),
      onState: setScan,
      holdDurationMs: 650,
      motionThreshold: 0.024,
    });
    tracker.setAutoCapture(autoCapture);
    tracker.start();
    trackerRef.current = tracker;
    return () => tracker.dispose();
  }, []);

  useEffect(() => {
    trackerRef.current?.setAutoCapture(autoCapture);
  }, [autoCapture]);

  useEffect(() => {
    if (!permission?.granted) return;
    let cancelled = false;
    let failures = 0;

    const loop = async () => {
      await sleep(400);
      while (!cancelled) {
        if (!readyRef.current || capturingRef.current || !camera.current) {
          await sleep(120);
          continue;
        }
        analyzingRef.current = true;
        let previewUri: string | undefined;
        try {
          const shot = await takePicture({
            quality: 0.2,
            shutterSound: false,
            timeoutMs: 3000,
          });
          previewUri = shot?.uri;
          if (previewUri && !cancelled && !capturingRef.current) {
            const result = await detectLiveFromUri(previewUri);
            failures = 0;
            if (!cancelled && !capturingRef.current) {
              setStatus(null);
              setImageSize({ width: result.width, height: result.height });
              trackerRef.current?.updateFromFrame(result.quad, result.confidence);
            }
          }
        } catch {
          failures += 1;
          trackerRef.current?.updateFromFrame(null, 0);
          if (failures >= 3 && !capturingRef.current) {
            setStatus('Hold a page in view');
          }
          await sleep(700);
        } finally {
          analyzingRef.current = false;
          await deleteQuietly(previewUri);
        }
        const locked =
          scanRef.current.hasDocument && scanRef.current.confidence >= 0.7;
        await sleep(locked ? 320 : 240);
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [permission?.granted, takePicture]);

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
    <View style={styles.fill} onLayout={onLayout}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        pictureSize="High"
        autofocus="off"
        animateShutter={false}
        onCameraReady={() => {
          readyRef.current = true;
        }}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <QuadOverlay
          quad={scan.quad}
          viewWidth={viewSize.width}
          viewHeight={viewSize.height}
          imageWidth={imageSize.width}
          imageHeight={imageSize.height}
          locked={scan.hasDocument}
          progress={scan.holdProgress}
        />
      </View>
      {flash > 0 ? <View style={styles.flash} /> : null}
      <SafeAreaView style={styles.chrome} pointerEvents="box-none">
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </PressableScale>
        <Text style={styles.hint}>{status ?? scan.message}</Text>
        <View style={{ width: 28 }} />
      </SafeAreaView>
      {busy ? (
        <View style={styles.processing}>
          <ActivityIndicator color={Lime} />
          <Text style={styles.processingLabel}>{status ?? 'Capturing'}</Text>
        </View>
      ) : null}
      <View style={styles.shutterWrap}>
        <PressableScale onPress={() => void capture()} haptic="medium" disabled={busy}>
          <View style={styles.shutterOuter}>
            <View
              style={[
                styles.shutterProgress,
                {
                  opacity: scan.holdProgress > 0.02 ? 1 : 0,
                  transform: [{ scale: 1 + scan.holdProgress * 0.08 }],
                },
              ]}
            />
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
  hint: {
    flex: 1,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
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
  shutterProgress: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: Lime,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  processing: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 140,
    backgroundColor: 'rgba(11,27,63,0.78)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processingLabel: { fontFamily: Fonts.bold, color: '#FFFFFF', fontSize: 14 },
});

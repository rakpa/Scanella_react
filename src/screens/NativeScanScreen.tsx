import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanellaAppMark } from '../components/Brand';
import { BrandButton } from '../components/BrandButton';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { defaultTitle, useAppStore } from '../store/useAppStore';
import { persistScans } from '../services/documents';
import { scanWithVisionKit } from '../services/scanner';
import { RootStackParamList } from '../navigation/types';

export function NativeScanScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NativeScan'>;
}) {
  const { colors } = useTheme();
  const addDocument = useAppStore((s) => s.addDocument);
  const filter = useAppStore((s) => s.settings.defaultFilter);
  const [status, setStatus] = useState('Opening scanner…');
  const [error, setError] = useState<string | null>(null);
  const launched = useRef(false);

  const run = async () => {
    setError(null);
    setStatus('Opening scanner…');
    try {
      const pages = await scanWithVisionKit();
      if (!pages || pages.length === 0) {
        navigation.goBack();
        return;
      }
      setStatus(pages.length === 1 ? 'Saving page…' : `Saving ${pages.length} pages…`);
      const doc = await persistScans(pages, {
        title: defaultTitle(),
        filter,
        edgesAlreadyApplied: true,
      });
      await addDocument(doc);
      navigation.replace('DocumentDetail', { id: doc.id });
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    void run();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={[styles.title, { color: colors.ink }]}>That scan did not finish</Text>
            <Text style={[styles.body, { color: colors.grey }]}>{error}</Text>
            <View style={{ height: 24 }} />
            <BrandButton
              label="Try again"
              onPress={() => {
                launched.current = false;
                void run();
              }}
            />
            <View style={{ height: 10 }} />
            <BrandButton variant="ghost" label="Back to library" onPress={() => navigation.goBack()} />
          </>
        ) : (
          <>
            <ScanellaAppMark size={72} />
            <View style={{ height: 28 }} />
            <ActivityIndicator color={Lime} />
            <Text style={[styles.status, { color: colors.ink }]}>{status}</Text>
            <Text style={[styles.lock, { color: colors.grey }]}>
              Nothing leaves your device
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  status: { fontFamily: Fonts.bold, fontSize: 17, marginTop: 20 },
  lock: { fontFamily: Fonts.medium, fontSize: 13.5, marginTop: 8 },
  title: { fontFamily: Fonts.extraBold, fontSize: 22, textAlign: 'center' },
  body: { fontFamily: Fonts.medium, fontSize: 14.5, textAlign: 'center', marginTop: 8 },
});

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BrandButton, Card, Wordmark } from '../src/components/Brand';
import { useScheme } from '../src/components/theme';
import { radius } from '../src/theme/brand';
import { activeBackend, scanDocument } from '../src/lib/scanner';
import { createDocument, listDocuments, type Doc } from '../src/lib/store';

export default function Library() {
  const scheme = useScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [scanning, setScanning] = useState(false);

  // Resolved once: whether this build has the real edge detector behind it.
  const [backend] = useState(activeBackend);

  const refresh = useCallback(() => {
    listDocuments()
      .then(setDocs)
      .catch((e) => {
        console.warn('Library failed to load', e);
        setDocs([]);
      });
  }, []);

  // Reloads on every return from the detail screen, so a rename or a delete
  // is reflected without a manual pull-to-refresh.
  useFocusEffect(refresh);

  const onScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await scanDocument();
      if (result.status === 'cancelled') return;

      const id = await createDocument(result.pages);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/document/${id}`);
    } catch (e) {
      Alert.alert('Scan failed', String(e));
    } finally {
      setScanning(false);
    }
  }, [router, scanning]);

  return (
    <View style={[styles.root, { backgroundColor: scheme.canvas }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Wordmark />
        <Text style={[styles.subtitle, { color: scheme.onSurfaceVariant }]}>
          {docs === null
            ? ' '
            : docs.length === 0
              ? 'Nothing scanned yet'
              : `${docs.length} document${docs.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      {docs === null ? (
        <View style={styles.centre}>
          <ActivityIndicator color={scheme.accent} />
        </View>
      ) : docs.length === 0 ? (
        <View style={styles.centre}>
          <Text style={[styles.emptyTitle, { color: scheme.onSurface }]}>
            Scan your first page
          </Text>
          <Text style={[styles.emptyBody, { color: scheme.onSurfaceVariant }]}>
            Point the camera at a document. Edges are found for you, the page
            is straightened, and nothing leaves this device.
          </Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DocRow doc={item} onPress={() => router.push(`/document/${item.id}`)} />
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {backend === 'camera' ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: scheme.accentContainer },
            ]}
          >
            <Text style={[styles.noticeText, { color: scheme.onAccentContainer }]}>
              Expo Go: plain camera, no edge detection. Run a development build
              for the real scanner.
            </Text>
          </View>
        ) : null}
        <BrandButton
          label={scanning ? 'Scanning…' : 'Scan a document'}
          busy={scanning}
          onPress={onScan}
        />
      </View>
    </View>
  );
}

function DocRow({ doc, onPress }: { doc: Doc; onPress: () => void }) {
  const scheme = useScheme();
  const when = new Date(doc.createdAt);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: scheme.surfaceHigh }]}>
          {doc.coverUri ? (
            <Image
              source={{ uri: doc.coverUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={120}
            />
          ) : null}
        </View>
        <View style={styles.rowText}>
          <Text
            numberOfLines={1}
            style={[styles.rowTitle, { color: scheme.onSurface }]}
          >
            {doc.name}
          </Text>
          <Text style={[styles.rowMeta, { color: scheme.onSurfaceVariant }]}>
            {doc.pageCount} page{doc.pageCount === 1 ? '' : 's'} ·{' '}
            {when.toLocaleDateString()}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  subtitle: { marginTop: 4, fontSize: 15, fontWeight: '500' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  list: { padding: 20, paddingTop: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 14 },
  thumb: {
    width: 52,
    height: 68,
    borderRadius: radius.field - 6,
    overflow: 'hidden',
  },
  rowText: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  notice: { borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

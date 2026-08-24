import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '../../src/components/Brand';
import { useScheme } from '../../src/components/theme';
import { radius } from '../../src/theme/brand';
import { sharePdf } from '../../src/lib/export';
import {
  deleteDocument,
  getDocument,
  getPages,
  type Doc,
  type Page,
} from '../../src/lib/store';

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);

  const scheme = useScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [pages, setPages] = useState<Page[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(documentId)) return;
    Promise.all([getDocument(documentId), getPages(documentId)])
      .then(([d, p]) => {
        setDoc(d);
        setPages(p);
      })
      .catch((e) => {
        console.warn('Document failed to load', e);
        setPages([]);
      });
  }, [documentId]);

  useEffect(() => {
    if (doc) navigation.setOptions({ title: doc.name });
  }, [doc, navigation]);

  const onExport = useCallback(async () => {
    if (!doc || !pages || pages.length === 0 || exporting) return;
    setExporting(true);
    try {
      await sharePdf(pages, doc.name);
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  }, [doc, pages, exporting]);

  const onDelete = useCallback(() => {
    Alert.alert('Delete document?', 'The pages are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(documentId);
          router.back();
        },
      },
    ]);
  }, [documentId, router]);

  if (pages === null) {
    return (
      <View style={[styles.centre, { backgroundColor: scheme.canvas }]}>
        <ActivityIndicator color={scheme.accent} />
      </View>
    );
  }

  const width = Dimensions.get('window').width - 40;

  return (
    <View style={[styles.root, { backgroundColor: scheme.canvas }]}>
      <FlatList
        data={pages}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View>
            <Text style={[styles.pageLabel, { color: scheme.onSurfaceVariant }]}>
              Page {index + 1}
            </Text>
            <Image
              source={{ uri: item.uri }}
              style={[
                styles.page,
                {
                  width,
                  // A scan is portrait far more often than not; letting the
                  // image box itself keeps a landscape page from being
                  // cropped to a portrait frame.
                  aspectRatio: 1 / 1.414,
                  backgroundColor: scheme.surface,
                  borderColor: scheme.outline,
                },
              ]}
              contentFit="contain"
              transition={140}
            />
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <BrandButton
          label={exporting ? 'Preparing PDF…' : 'Share as PDF'}
          busy={exporting}
          onPress={onExport}
        />
        <Pressable onPress={onDelete} style={styles.delete}>
          <Text style={[styles.deleteLabel, { color: scheme.danger }]}>
            Delete document
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 20 },
  pageLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  page: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  delete: { height: 44, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { fontSize: 15, fontWeight: '600' },
});

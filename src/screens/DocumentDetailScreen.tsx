import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { saveToPhotos, shareImages, sharePdf } from '../services/export';
import { RootStackParamList } from '../navigation/types';

export function DocumentDetailScreen({
  navigation,
  route,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DocumentDetail'>;
  route: RouteProp<RootStackParamList, 'DocumentDetail'>;
}) {
  const { colors } = useTheme();
  const { id } = route.params;
  const documents = useAppStore((s) => s.documents);
  const updateDocument = useAppStore((s) => s.updateDocument);
  const deleteDocuments = useAppStore((s) => s.deleteDocuments);
  const document = documents.find((d) => d.id === id);
  const [busy, setBusy] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(document?.title ?? '');
  const [exportOpen, setExportOpen] = useState(false);

  if (!document) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <Text style={[styles.missing, { color: colors.grey }]}>That scan is no longer here.</Text>
      </SafeAreaView>
    );
  }

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    try {
      await work();
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="chevron-back" size={28} color={Lime} />
        </PressableScale>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
            {document.title}
          </Text>
          <Text style={[styles.meta, { color: colors.grey }]}>
            {document.pages.length} page{document.pages.length === 1 ? '' : 's'} ·{' '}
            {new Date(document.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <PressableScale onPress={() => setRenaming(true)} haptic="selection">
          <Ionicons name="create-outline" size={22} color={colors.ink} />
        </PressableScale>
      </View>

      <FlatList
        data={document.pages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outline },
            ]}
          >
            <Image source={{ uri: item.path }} style={styles.page} contentFit="cover" />
            <View style={styles.cardBar}>
              <Text style={[styles.pageLabel, { color: colors.ink }]}>Page {index + 1}</Text>
              <PressableScale
                onPress={() =>
                  navigation.navigate('Crop', {
                    imageUri: item.path,
                    originalUri: item.originalPath ?? item.path,
                    documentId: document.id,
                    pageId: item.id,
                    filter: item.filter,
                  })
                }
                haptic="selection"
              >
                <Text style={styles.edit}>Edit</Text>
              </PressableScale>
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.actions,
          { backgroundColor: colors.surface, borderTopColor: colors.outline },
        ]}
      >
        <BrandButton
          label="Add page"
          variant="ghost"
          onPress={() => navigation.navigate('Camera')}
        />
        <View style={{ height: 10 }} />
        <BrandButton label="Export" onPress={() => setExportOpen(true)} />
      </View>

      <Modal visible={renaming} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.ink }]}>Rename scan</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                { color: colors.ink, borderColor: colors.outline, backgroundColor: colors.canvas },
              ]}
            />
            <BrandButton
              label="Save"
              onPress={async () => {
                await updateDocument({ ...document, title: title.trim() || document.title });
                setRenaming(false);
              }}
            />
            <View style={{ height: 8 }} />
            <BrandButton variant="ghost" label="Cancel" onPress={() => setRenaming(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={exportOpen} transparent animationType="slide">
        <PressableScale onPress={() => setExportOpen(false)}>
          <View style={styles.sheetScrim} />
        </PressableScale>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.dialogTitle, { color: colors.ink }]}>Export</Text>
          <Text style={[styles.meta, { color: colors.grey, marginBottom: 16 }]}>
            {document.title}
          </Text>
          <ExportTile
            icon="document-text"
            tint={colors.pdfRed}
            title="Save PDF to Files"
            subtitle="One document, every page"
            onPress={() => {
              setExportOpen(false);
              void run('Preparing PDF…', () => sharePdf(document));
            }}
          />
          <ExportTile
            icon="images"
            tint={colors.amber}
            title="Save to Photos"
            subtitle="Adds the pages to the camera roll"
            onPress={() => {
              setExportOpen(false);
              void run('Saving to Photos…', async () => {
                const n = await saveToPhotos(document);
                Alert.alert('Saved', `${n} page${n === 1 ? '' : 's'} saved to Photos.`);
              });
            }}
          />
          <ExportTile
            icon="share-outline"
            tint={colors.docBlue}
            title="Share PDF"
            subtitle="Opens the iOS share sheet"
            onPress={() => {
              setExportOpen(false);
              void run('Preparing PDF…', () => sharePdf(document));
            }}
          />
          <ExportTile
            icon="image-outline"
            tint={Lime}
            title="Share images"
            subtitle="Sends each page as a photo"
            onPress={() => {
              setExportOpen(false);
              void run('Preparing images…', () => shareImages(document));
            }}
          />
          <View style={{ height: 8 }} />
          <BrandButton
            variant="ghost"
            label="Delete scan"
            onPress={() =>
              Alert.alert('Delete this scan?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteDocuments([document.id]);
                    setExportOpen(false);
                    navigation.goBack();
                  },
                },
              ])
            }
          />
        </View>
      </Modal>

      {busy ? (
        <View style={styles.busy}>
          <Text style={styles.busyLabel}>{busy}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ExportTile({
  icon,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} haptic="light">
      <View
        style={[
          styles.export,
          { borderColor: colors.outline, backgroundColor: colors.canvas },
        ]}
      >
        <View style={[styles.exportIcon, { backgroundColor: `${tint}22` }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.meta, { color: colors.grey }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.greyLight} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 18 },
  meta: { fontFamily: Fonts.medium, fontSize: 13 },
  list: { padding: 20, paddingBottom: 160, gap: 14 },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  page: { width: '100%', height: 220 },
  cardBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pageLabel: { fontFamily: Fonts.bold, fontSize: 15 },
  edit: { fontFamily: Fonts.bold, fontSize: 15, color: Lime },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(11,27,63,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { borderRadius: 24, padding: 20 },
  dialogTitle: { fontFamily: Fonts.extraBold, fontSize: 20, marginBottom: 12 },
  input: {
    borderWidth: 1.4,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: Fonts.semibold,
    marginBottom: 16,
  },
  sheetScrim: { flex: 1, backgroundColor: 'rgba(11,27,63,0.35)' },
  sheet: {
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  exportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 15.5 },
  busy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,27,63,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyLabel: { fontFamily: Fonts.bold, color: '#FFFFFF', fontSize: 16 },
  missing: { fontFamily: Fonts.medium, textAlign: 'center', marginTop: 80 },
});

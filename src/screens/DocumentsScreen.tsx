import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanellaAppMark, ScanellaWordmark } from '../components/Brand';
import { HeroStage } from '../components/Illustrations';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { defaultTitle, useAppStore } from '../store/useAppStore';
import { persistScans } from '../services/documents';
import { pickFiles, pickPhotos } from '../services/scanner';
import { recognizeText } from '../services/ocr';
import { ScanDocument } from '../types';
import { HomeTabParamList, RootStackParamList } from '../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabParamList, 'Documents'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DocumentsScreen({ navigation }: { navigation: Nav }) {
  const { colors } = useTheme();
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const filter = useAppStore((s) => s.settings.defaultFilter);
  const [query, setQuery] = useState('');
  const [working, setWorking] = useState('');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? documents.filter((d) => d.title.toLowerCase().includes(needle))
      : documents;
    return [...list].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [documents, query]);

  const importUris = async (uris: string[], label: string) => {
    if (!uris.length) return;
    setWorking(label);
    try {
      const doc = await persistScans(uris, {
        title: defaultTitle(),
        filter,
        edgesAlreadyApplied: false,
      });
      await addDocument(doc);
      navigation.navigate('DocumentDetail', { id: doc.id });
    } catch (e) {
      Alert.alert('Import failed', String(e));
    } finally {
      setWorking('');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.grid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <ScanellaAppMark size={34} />
              <ScanellaWordmark size={20} />
              <View style={{ flex: 1 }} />
              <View style={[styles.badge, { backgroundColor: colors.limeWash }]}>
                <Ionicons name="lock-closed" size={11} color={colors.onLime} />
                <Text style={[styles.badgeText, { color: colors.onLime }]}>On device</Text>
              </View>
            </View>
            <Text style={[styles.kicker, { color: colors.grey }]}>
              {documents.length} document{documents.length === 1 ? '' : 's'}
            </Text>
            <View style={styles.tools}>
              <Tool
                label={'Import\nfiles'}
                color={colors.pdfRed}
                icon="documents"
                onPress={async () => importUris(await pickFiles(), 'Reading files…')}
              />
              <Tool
                label={'From\nphotos'}
                color={colors.imageGreen}
                icon="images"
                onPress={async () => importUris(await pickPhotos(), 'Reading photos…')}
              />
              <Tool
                label={'Extract\ntext'}
                color={colors.docBlue}
                icon="text"
                onPress={async () => {
                  const uris = await pickPhotos();
                  if (!uris[0]) return;
                  setWorking('Reading the text…');
                  const text = await recognizeText(uris[0]);
                  setWorking('');
                  navigation.navigate('OcrResult', { text });
                }}
              />
            </View>
            {documents.length > 0 ? (
              <View
                style={[
                  styles.search,
                  { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.grey} />
                <TextInput
                  placeholder="Search your documents"
                  placeholderTextColor={colors.greyLight}
                  value={query}
                  onChangeText={setQuery}
                  style={[styles.searchInput, { color: colors.ink }]}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query ? (
            <Text style={[styles.empty, { color: colors.grey }]}>
              No documents match “{query}”.
            </Text>
          ) : (
            <View style={styles.emptyWrap}>
              <HeroStage variant="phone" />
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                Your library is empty
              </Text>
              <Text style={[styles.emptyBody, { color: colors.grey }]}>
                Tap the scan button to capture a page. Nothing leaves this iPhone.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DocumentTile
            document={item}
            onPress={() => navigation.navigate('DocumentDetail', { id: item.id })}
          />
        )}
      />
      {working ? (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Text style={styles.working}>{working}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Tool({
  label,
  color,
  icon,
  onPress,
}: {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }} haptic="light">
      <View
        style={[
          styles.tool,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={[styles.toolIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.toolLabel, { color: colors.ink }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function DocumentTile({
  document,
  onPress,
}: {
  document: ScanDocument;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const cover = document.pages[0]?.path;
  return (
    <PressableScale onPress={onPress} style={{ width: '48%' }} haptic="light">
      <View
        style={[
          styles.tile,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        <View style={[styles.thumb, { backgroundColor: colors.surfaceHigh }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="document-text" size={28} color={colors.greyLight} />
          )}
        </View>
        <Text numberOfLines={2} style={[styles.tileTitle, { color: colors.ink }]}>
          {document.title}
        </Text>
        <Text style={[styles.tileMeta, { color: colors.grey }]}>
          {document.pages.length} page{document.pages.length === 1 ? '' : 's'}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12 },
  kicker: { fontFamily: Fonts.medium, fontSize: 13, marginTop: 14, marginBottom: 12 },
  tools: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  tool: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  toolIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  toolLabel: { fontFamily: Fonts.bold, fontSize: 13.5, lineHeight: 17 },
  search: {
    height: 50,
    borderRadius: Radius.field,
    borderWidth: 1.4,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontFamily: Fonts.semibold, fontSize: 15.5 },
  grid: { justifyContent: 'space-between', marginBottom: 18 },
  tile: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  thumb: { height: 150, alignItems: 'center', justifyContent: 'center' },
  tileTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  tileMeta: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyWrap: { alignItems: 'center', paddingTop: 8 },
  emptyTitle: { fontFamily: Fonts.extraBold, fontSize: 22, marginTop: 8 },
  emptyBody: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  empty: { textAlign: 'center', fontFamily: Fonts.medium, marginTop: 40 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  working: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },
});

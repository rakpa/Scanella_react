import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { PressableScale } from '../components/PressableScale';
import { FILTERS, ScanFilter } from '../types';
import { Fonts, Lime, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';

export function CropScreen({
  navigation,
  route,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Crop'>;
  route: RouteProp<RootStackParamList, 'Crop'>;
}) {
  const { colors } = useTheme();
  const { imageUri, documentId, pageId, filter: initialFilter } = route.params;
  const defaultFilter = useAppStore((s) => s.settings.defaultFilter);
  const replacePage = useAppStore((s) => s.replacePage);
  const documents = useAppStore((s) => s.documents);
  const [filter, setFilter] = useState<ScanFilter>(initialFilter ?? defaultFilter);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [busy, setBusy] = useState(false);

  const previewStyle = useMemo(() => {
    const filters: string[] = [];
    if (filter === 'grayscale' || filter === 'bw') filters.push('grayscale(1)');
    if (filter === 'bw') filters.push('contrast(1.7)');
    if (filter === 'magic') {
      filters.push('contrast(1.2)');
      filters.push('brightness(1.06)');
    }
    if (filter === 'enhance') filters.push('contrast(1.18)');
    if (brightness) filters.push(`brightness(${1 + brightness})`);
    if (contrast) filters.push(`contrast(${1 + contrast})`);
    return filters.length ? ({ filter: filters.join(' ') } as const) : undefined;
  }, [filter, brightness, contrast]);

  const save = async () => {
    setBusy(true);
    try {
      if (documentId && pageId) {
        const doc = documents.find((d) => d.id === documentId);
        const page = doc?.pages.find((p) => p.id === pageId);
        if (page) {
          await replacePage(documentId, {
            ...page,
            filter,
            brightness,
            contrast,
          });
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#111827' }]}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Text style={styles.cancel}>Cancel</Text>
        </PressableScale>
        <Text style={styles.title}>Enhance</Text>
        <View style={{ width: 64 }} />
      </View>
      <View style={styles.preview}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, previewStyle as object]}
          contentFit="contain"
        />
      </View>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.chips}>
          {FILTERS.map((item) => {
            const selected = item.id === filter;
            return (
              <PressableScale
                key={item.id}
                onPress={() => setFilter(item.id)}
                haptic="selection"
              >
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? Lime : colors.surfaceHigh },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: selected ? colors.onLime : colors.ink },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
        <SliderRow label="Brightness" value={brightness} onChange={setBrightness} />
        <SliderRow label="Contrast" value={contrast} onChange={setContrast} />
        <BrandButton label="Save page" busy={busy} onPress={save} />
      </View>
    </SafeAreaView>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.sliderLabel, { color: colors.grey }]}>{label}</Text>
      <Slider
        minimumValue={-0.4}
        maximumValue={0.4}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Lime}
        maximumTrackTintColor={colors.outline}
        thumbTintColor={Lime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  cancel: { fontFamily: Fonts.semibold, color: Lime, fontSize: 16 },
  title: { fontFamily: Fonts.extraBold, color: '#FFFFFF', fontSize: 17 },
  preview: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  sheet: {
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: 20,
    paddingBottom: 28,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  chipLabel: { fontFamily: Fonts.bold, fontSize: 13.5 },
  sliderLabel: { fontFamily: Fonts.semibold, fontSize: 13, marginBottom: 2 },
});

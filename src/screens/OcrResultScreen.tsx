import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

export function OcrResultScreen({
  navigation,
  route,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OcrResult'>;
  route: RouteProp<RootStackParamList, 'OcrResult'>;
}) {
  const { colors } = useTheme();
  const text = route.params.text.trim();
  const empty = text.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="chevron-back" size={28} color={Lime} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.ink }]}>Extracted text</Text>
        <View style={{ width: 28 }} />
      </View>
      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="text" size={40} color={colors.greyLight} />
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>
            No text found on that page
          </Text>
          <Text style={[styles.emptyBody, { color: colors.grey }]}>
            Recognition works best on a flat, well-lit page with printed text,
            and needs a development build of Scanella so Apple Vision can run
            on-device.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outline },
            ]}
          >
            <Text selectable style={[styles.text, { color: colors.ink }]}>
              {text}
            </Text>
          </View>
          <BrandButton
            label="Copy all"
            onPress={async () => {
              await Clipboard.setStringAsync(text);
              Alert.alert('Copied', 'The text is on the clipboard.');
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 18 },
  body: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: Radius.card, borderWidth: 1, padding: 18, marginBottom: 20 },
  text: { fontFamily: Fonts.medium, fontSize: 15.5, lineHeight: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 18, marginTop: 16, textAlign: 'center' },
  emptyBody: {
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});

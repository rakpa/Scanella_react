import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanellaAppMark, ScanellaWordmark } from '../components/Brand';
import { PressableScale } from '../components/PressableScale';
import { FILTERS } from '../types';
import { Fonts, Lime, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { ThemeMode } from '../theme/colors';

export function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
        <Text style={[styles.sub, { color: colors.grey }]}>
          How Scanella captures and finishes a page
        </Text>

        <Section label="Scanning">
          <SwitchRow
            icon="camera"
            tint={colors.docBlue}
            title="Use the in-app camera"
            subtitle="Off uses the iOS document scanner, which finds edges best."
            value={settings.useInAppCamera}
            onChange={(v) => void update({ useInAppCamera: v })}
          />
          <SwitchRow
            icon="aperture"
            tint={Lime}
            title="Auto-capture"
            subtitle="Shoots once the page is steady."
            value={settings.autoCapture}
            disabled={!settings.useInAppCamera}
            onChange={(v) => void update({ autoCapture: v })}
          />
          <SwitchRow
            icon="volume-high"
            tint={colors.amber}
            title="Shutter sound"
            value={settings.shutterSound}
            disabled={!settings.useInAppCamera}
            onChange={(v) => void update({ shutterSound: v })}
            last
          />
        </Section>

        <Section label="Default enhancement">
          <Text style={[styles.hint, { color: colors.grey }]}>
            Applied to new scans. Change it per page any time.
          </Text>
          <View style={styles.chips}>
            {FILTERS.map((filter) => {
              const selected = settings.defaultFilter === filter.id;
              return (
                <PressableScale
                  key={filter.id}
                  onPress={() => void update({ defaultFilter: filter.id })}
                  haptic="selection"
                >
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? Lime : colors.surfaceHigh,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? colors.onLime : colors.ink },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </Section>

        <Section label="Appearance">
          <View style={styles.segment}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
              const selected = settings.themeMode === mode;
              return (
                <PressableScale
                  key={mode}
                  onPress={() => void update({ themeMode: mode })}
                  haptic="selection"
                  style={{ flex: 1 }}
                >
                  <View
                    style={[
                      styles.seg,
                      { backgroundColor: selected ? Lime : 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segLabel,
                        { color: selected ? colors.onLime : colors.grey },
                      ]}
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.grey, paddingHorizontal: 16 }]}>
            Light is the default. Dark is available here whenever you want it.
          </Text>
        </Section>

        <Section label="About">
          <InfoRow
            icon="lock-closed"
            tint={Lime}
            title="Everything stays on your device"
            subtitle="No accounts required, no uploads."
          />
          <InfoRow
            icon="information-circle"
            tint={colors.docBlue}
            title="About Scanella"
            subtitle="Version 1.5.0 · React Native for iOS"
            onPress={() =>
              Alert.alert(
                'Scanella',
                'Offline document scanner for iPhone.\nScans stay on your device. Nothing is uploaded.',
              )
            }
          />
        </Section>

        <View style={styles.brand}>
          <ScanellaAppMark size={46} />
          <View style={{ height: 10 }} />
          <ScanellaWordmark size={17} />
          <Text style={[styles.caption, { color: colors.grey }]}>
            Offline document scanner
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.section, { color: colors.grey }]}>{label.toUpperCase()}</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SwitchRow({
  icon,
  tint,
  title,
  subtitle,
  value,
  onChange,
  disabled,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outline },
        disabled && { opacity: 0.45 },
      ]}
    >
      <RowIcon icon={icon} tint={tint} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.grey }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: Lime, false: colors.outlineStrong }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function InfoRow({
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
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const inner = (
    <View style={styles.row}>
      <RowIcon icon={icon} tint={tint} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.grey }]}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.greyLight} /> : null}
    </View>
  );
  return onPress ? (
    <PressableScale onPress={onPress} haptic="selection">
      {inner}
    </PressableScale>
  ) : (
    inner
  );
}

function RowIcon({
  icon,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}) {
  return (
    <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
      <Ionicons name={icon} size={18} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  title: { fontFamily: Fonts.extraBold, fontSize: 28, marginTop: 12 },
  sub: { fontFamily: Fonts.medium, fontSize: 14.5, marginTop: 4, marginBottom: 8 },
  section: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    letterSpacing: 0.9,
    marginTop: 26,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 15.5 },
  rowSub: { fontFamily: Fonts.medium, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  chipLabel: { fontFamily: Fonts.bold, fontSize: 14 },
  segment: {
    flexDirection: 'row',
    margin: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'transparent',
    gap: 4,
  },
  seg: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segLabel: { fontFamily: Fonts.bold, fontSize: 13.5 },
  brand: { alignItems: 'center', marginTop: 36, opacity: 0.7 },
  caption: { fontFamily: Fonts.medium, fontSize: 12.5, marginTop: 4 },
});

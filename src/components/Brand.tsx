import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts, Lime, LimeDeep } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

export function ScanellaWordmark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.mark, { fontSize: size, color: colors.ink }]}>
      Scan<Text style={{ color: Lime }}>ella</Text>
    </Text>
  );
}

export function ScanellaAppMark({ size = 116 }: { size?: number }) {
  const r = size * 0.235;
  return (
    <View
      style={[
        styles.appMark,
        {
          width: size,
          height: size,
          borderRadius: r,
          shadowColor: LimeDeep,
        },
      ]}
    >
      <LinearGradient
        colors={['#D9F99D', Lime, LimeDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
      />
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64">
        <Rect x="6" y="2" width="52" height="24" rx="6" fill="#FFFFFF" />
        <Rect x="12" y="8" width="40" height="12" rx="4" fill="#E8F0D8" />
        <Rect x="2" y="30" width="60" height="26" rx="6" fill="#FFFFFF" />
        <Rect x="10" y="34" width="44" height="14" rx="3" fill="#0B1B3F" />
        <Circle cx="46" cy="52" r="2.4" fill="#16A75C" />
        <Circle cx="54" cy="52" r="2.4" fill="#0B1B3F" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: Fonts.extraBold,
    letterSpacing: -1,
    textAlign: 'center',
  },
  appMark: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});

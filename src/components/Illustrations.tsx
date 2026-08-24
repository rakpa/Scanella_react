import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

export function HeroStage({
  variant,
}: {
  variant: 'scanner' | 'phone' | 'privacy';
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.disc,
          { backgroundColor: colors.scheme === 'light' ? '#EDF2FB' : colors.surfaceHigh },
        ]}
      />
      {variant === 'scanner' ? <ScannerArt /> : variant === 'phone' ? <PhoneArt /> : <LockArt />}
      <Chip x={18} y={42} icon="document-text" color="#E8443A" label="PDF" />
      <Chip x={78} y={58} icon="sparkles" color={Lime} />
      <Chip x={14} y={62} icon="image" color="#16A75C" />
      <Chip x={82} y={78} icon="lock-closed" color={Lime} />
    </View>
  );
}

function Chip({
  x,
  y,
  icon,
  color,
  label,
}: {
  x: number;
  y: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label?: string;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          left: `${x}%`,
          top: `${y}%`,
          backgroundColor: '#FFFFFF',
          shadowColor: '#0B1B3F',
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      {label ? <Text style={[styles.chipLabel, { color }]}>{label}</Text> : null}
    </View>
  );
}

function ScannerArt() {
  return (
    <Svg width={168} height={148} viewBox="0 0 168 148">
      <Rect x="28" y="8" width="112" height="48" rx="12" fill="#FFFFFF" />
      <Rect x="40" y="18" width="88" height="28" rx="8" fill="#E8F0D8" />
      <Rect x="16" y="66" width="136" height="58" rx="14" fill="#FFFFFF" />
      <Rect x="32" y="78" width="104" height="28" rx="6" fill="#0B1B3F" />
      <Circle cx="118" cy="112" r="5" fill="#16A75C" />
      <Circle cx="134" cy="112" r="5" fill={Lime} />
    </Svg>
  );
}

function PhoneArt() {
  return (
    <Svg width={120} height={180} viewBox="0 0 120 180">
      <Rect x="18" y="4" width="84" height="172" rx="18" fill="#0B1B3F" />
      <Rect x="26" y="18" width="68" height="132" rx="8" fill="#F7F9FC" />
      <Rect x="34" y="28" width="52" height="72" rx="4" fill="#D9F99D" />
      <Path d="M40 40 L78 40 L74 92 L44 92 Z" fill="#FFFFFF" />
      <Circle cx="60" cy="164" r="8" fill="#FFFFFF" />
    </Svg>
  );
}

function LockArt() {
  return (
    <Svg width={140} height={150} viewBox="0 0 140 150">
      <Rect x="28" y="58" width="84" height="72" rx="16" fill="#FFFFFF" />
      <Path
        d="M48 58 V42 a22 22 0 0 1 44 0 V58"
        fill="none"
        stroke="#0B1B3F"
        strokeWidth="8"
      />
      <Circle cx="70" cy="92" r="10" fill={Lime} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 300,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  chip: {
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  chipLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

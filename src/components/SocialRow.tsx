import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radius } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

export function SocialSignInRow() {
  const { colors } = useTheme();
  const ping = (provider: string) =>
    Alert.alert(
      `${provider} sign-in`,
      `${provider} sign-in is not connected yet. Scans still stay on this iPhone.`,
    );

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.outline }]} />
        <Text style={[styles.or, { color: colors.grey }]}>or continue with</Text>
        <View style={[styles.line, { backgroundColor: colors.outline }]} />
      </View>
      <View style={styles.row}>
        <Provider label="Google" color="#EA4335" icon="logo-google" onPress={() => ping('Google')} />
        <Provider label="Apple" color={colors.ink} icon="logo-apple" onPress={() => ping('Apple')} />
        <Provider label="Facebook" color="#1877F2" icon="logo-facebook" onPress={() => ping('Facebook')} />
      </View>
    </View>
  );
}

function Provider({
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
    <PressableScale onPress={onPress} style={{ flex: 1 }} haptic="selection">
      <View
        style={[
          styles.btn,
          { borderColor: colors.outline, backgroundColor: colors.surface },
        ]}
      >
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  line: { flex: 1, height: 1 },
  or: { fontFamily: Fonts.medium, fontSize: 13.5 },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    height: 50,
    borderRadius: Radius.field,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  label: { fontFamily: Fonts.bold, fontSize: 13 },
});

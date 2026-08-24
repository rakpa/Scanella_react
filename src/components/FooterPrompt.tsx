import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

export function FooterPrompt({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.prompt, { color: colors.grey }]}>{prompt}</Text>
      <PressableScale onPress={onPress} haptic="selection">
        <Text style={styles.action}>{action}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  prompt: { fontFamily: Fonts.medium, fontSize: 15 },
  action: { fontFamily: Fonts.bold, fontSize: 15, color: Lime },
});

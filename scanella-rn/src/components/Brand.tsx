import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { buttonHeight, radius } from '../theme/brand';
import { useScheme } from './theme';

/** The "Scanella" wordmark: ink "Scan", accent "ella". */
export function Wordmark({ size = 34 }: { size?: number }) {
  const scheme = useScheme();
  return (
    <Text
      style={{
        fontSize: size,
        fontWeight: '800',
        letterSpacing: -1,
        color: scheme.onSurface,
      }}
    >
      Scan
      <Text style={{ color: scheme.accent }}>ella</Text>
    </Text>
  );
}

/** Primary full-width action: solid accent, bold label. */
export function BrandButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const scheme = useScheme();
  const inert = busy || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: scheme.accent,
          // Pressed state comes from opacity rather than a second colour so
          // the token stays the single source for the brand hue.
          opacity: inert ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={scheme.onAccent} />
      ) : (
        <Text style={[styles.buttonLabel, { color: scheme.onAccent }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** A hairline-bordered card on the canvas, the app's one container shape. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const scheme = useScheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: scheme.surface, borderColor: scheme.outline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: buttonHeight,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonLabel: { fontSize: 17, fontWeight: '700' },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});

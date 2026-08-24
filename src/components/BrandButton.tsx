import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radius, Sizes } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  onPress?: () => void;
  busy?: boolean;
  showArrow?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
};

export function BrandButton({
  label,
  onPress,
  busy,
  showArrow = false,
  variant = 'primary',
}: Props) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const danger = variant === 'danger';

  return (
    <PressableScale
      onPress={busy ? undefined : onPress}
      haptic="medium"
      scaleTo={0.98}
    >
      <View
        style={[
          styles.button,
          {
            backgroundColor: primary
              ? colors.lime
              : danger
                ? colors.error
                : 'transparent',
            borderColor: primary || danger ? 'transparent' : colors.outline,
            borderWidth: primary || danger ? 0 : 1.5,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={primary ? colors.onLime : colors.ink} />
        ) : (
          <View style={styles.row}>
            <Text
              style={[
                styles.label,
                {
                  color: primary
                    ? colors.onLime
                    : danger
                      ? '#FFFFFF'
                      : colors.ink,
                },
              ]}
            >
              {label}
            </Text>
            {showArrow ? (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={primary ? colors.onLime : colors.ink}
                style={{ marginLeft: 8 }}
              />
            ) : null}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Sizes.buttonHeight,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
});

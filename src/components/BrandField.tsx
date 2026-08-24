import React from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radius, Sizes } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  trailing?: React.ReactNode;
};

export function BrandField({ icon, trailing, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.greyLight} />
      <TextInput
        placeholderTextColor={colors.greyLight}
        style={[styles.input, { color: colors.ink }, style]}
        {...rest}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: Sizes.fieldHeight,
    borderRadius: Radius.field,
    borderWidth: 1.4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
});

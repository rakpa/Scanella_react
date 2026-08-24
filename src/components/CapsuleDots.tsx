import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

export function CapsuleDots({
  count,
  index,
}: {
  count: number;
  index: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === index;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: active ? 28 : 10,
                backgroundColor: active ? Lime : colors.outlineStrong,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
});

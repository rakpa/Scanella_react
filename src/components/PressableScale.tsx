import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
  scaleTo?: number;
};

export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  haptic = 'light',
  scaleTo = 0.97,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const bump = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 7,
      tension: 220,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled || !onPress}
      onPressIn={() => bump(scaleTo)}
      onPressOut={() => bump(1)}
      onPress={() => {
        if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (haptic === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (haptic === 'selection') void Haptics.selectionAsync();
        onPress?.();
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

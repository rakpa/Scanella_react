import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime, LimeDeep } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { isExpoGo } from '../services/scanner';
import { HomeTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<HomeTabParamList>();

export function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <ScanTabBar {...props} />}
    >
      <Tab.Screen name="Documents" component={DocumentsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function ScanTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const root = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const useInApp = useAppStore((s) => s.settings.useInAppCamera);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <NavItem
        label="Documents"
        icon={state.index === 0 ? 'folder' : 'folder-outline'}
        selected={state.index === 0}
        onPress={() => navigation.navigate('Documents')}
      />
      <PressableScale
        onPress={() =>
          root.navigate(useInApp || isExpoGo() ? 'Camera' : 'NativeScan')
        }
        haptic="medium"
        scaleTo={0.94}
      >
        <View style={[styles.scanCollar, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={['#D9F99D', Lime, LimeDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scan}
          >
            <Ionicons name="scan" size={26} color="#0B1B3F" />
          </LinearGradient>
        </View>
      </PressableScale>
      <NavItem
        label="Settings"
        icon={state.index === 1 ? 'options' : 'options-outline'}
        selected={state.index === 1}
        onPress={() => navigation.navigate('Settings')}
      />
    </View>
  );
}

function NavItem({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const color = selected ? LimeDeep : colors.grey;
  return (
    <PressableScale onPress={onPress} haptic="selection" style={{ flex: 1 }}>
      <View style={styles.item}>
        <View
          style={[
            styles.pill,
            { backgroundColor: selected ? colors.limeWash : 'transparent' },
          ]}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  item: { alignItems: 'center', gap: 3 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: { fontFamily: Fonts.bold, fontSize: 11.5 },
  scanCollar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginTop: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

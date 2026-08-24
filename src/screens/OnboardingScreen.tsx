import React, { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { CapsuleDots } from '../components/CapsuleDots';
import { HeroStage } from '../components/Illustrations';
import { PressableScale } from '../components/PressableScale';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';

const PAGES = [
  {
    lead: 'Scan Anything\nin a ',
    accent: 'Snap',
    body: 'Turn your iPhone into a powerful scanner.\nFast, clear and easy.',
    art: 'phone' as const,
  },
  {
    lead: 'Clean Pages\n',
    accent: 'Every Time',
    body: 'Edges are straightened and pages enhanced\nautomatically. Export as PDF or images.',
    art: 'scanner' as const,
  },
  {
    lead: 'Private by\n',
    accent: 'Default',
    body: 'Nothing leaves this iPhone. No accounts\nrequired, no uploads, no cloud.',
    art: 'privacy' as const,
  },
];

export function OnboardingScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const complete = useAppStore((s) => s.completeOnboarding);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const finish = async () => {
    await complete();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const next = () => {
    if (page >= PAGES.length - 1) {
      void finish();
      return;
    }
    scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextPage = Math.round(e.nativeEvent.contentOffset.x / width);
    if (nextPage !== page) setPage(nextPage);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.top}>
        <PressableScale onPress={finish} haptic="selection">
          <Text style={styles.skip}>Skip</Text>
        </PressableScale>
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((item) => (
          <View key={item.accent} style={[styles.page, { width }]}>
            <Text style={[styles.headline, { color: colors.ink }]}>
              {item.lead}
              <Text style={{ color: Lime }}>{item.accent}</Text>
            </Text>
            <Text style={[styles.body, { color: colors.grey }]}>{item.body}</Text>
            <HeroStage variant={item.art} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <CapsuleDots count={PAGES.length} index={page} />
        <View style={{ height: 22 }} />
        <BrandButton
          label={page === PAGES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  skip: { fontFamily: Fonts.semibold, fontSize: 17, color: Lime },
  page: { paddingHorizontal: 28, paddingTop: 12 },
  headline: {
    fontFamily: Fonts.extraBold,
    fontSize: 33,
    lineHeight: 40,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    fontFamily: Fonts.medium,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
});

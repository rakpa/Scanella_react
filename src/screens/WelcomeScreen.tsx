import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { ScanellaAppMark, ScanellaWordmark } from '../components/Brand';
import { FooterPrompt } from '../components/FooterPrompt';
import { HeroStage } from '../components/Illustrations';
import { Fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

export function WelcomeScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <ScanellaAppMark size={104} />
          <View style={{ height: 18 }} />
          <ScanellaWordmark size={44} />
          <Text style={[styles.tag, { color: colors.grey }]}>
            Scan anything.{'\n'}Nothing leaves your phone.
          </Text>
          <HeroStage variant="scanner" />
        </View>
        <View style={styles.footer}>
          <BrandButton
            label="Get Started"
            onPress={() => navigation.navigate('Onboarding')}
          />
          <View style={{ height: 16 }} />
          <FooterPrompt
            prompt="Already have an account?"
            action="Login"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 20 },
  hero: { flex: 1, alignItems: 'center', paddingTop: 18 },
  tag: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 17,
    lineHeight: 24,
  },
  footer: { paddingBottom: 8 },
});

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandButton } from '../components/BrandButton';
import { BrandField } from '../components/BrandField';
import { ScanellaAppMark, ScanellaWordmark } from '../components/Brand';
import { FooterPrompt } from '../components/FooterPrompt';
import { PressableScale } from '../components/PressableScale';
import { SocialSignInRow } from '../components/SocialRow';
import { Fonts, Lime } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';

function validEmail(value: string) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value.trim());
}

export function LoginScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
}) {
  const { colors } = useTheme();
  const signIn = useAppStore((s) => s.signIn);
  const skip = useAppStore((s) => s.continueWithoutAccount);
  const remembered = useAppStore((s) => s.auth.email ?? '');
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [obscure, setObscure] = useState(true);
  const [busy, setBusy] = useState(false);

  const enter = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

  const submit = async () => {
    if (!validEmail(email)) {
      Alert.alert('Email', 'That does not look like an email address.');
      return;
    }
    if (!password) {
      Alert.alert('Password', 'Enter your password.');
      return;
    }
    setBusy(true);
    await signIn(email.trim());
    setBusy(false);
    enter();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="chevron-back" size={30} color={Lime} />
        </PressableScale>
        <PressableScale
          onPress={async () => {
            await skip();
            enter();
          }}
          haptic="selection"
        >
          <Text style={styles.skip}>Skip</Text>
        </PressableScale>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScanellaAppMark size={84} />
          <View style={{ height: 12 }} />
          <ScanellaWordmark size={36} />
          <Text style={[styles.tag, { color: colors.grey }]}>Scan. Save. Simplify.</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Welcome Back!</Text>
          <Text style={[styles.sub, { color: colors.grey }]}>
            Login to continue to your account
          </Text>
          <BrandField
            icon="mail"
            placeholder="Email Address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ height: 12 }} />
          <BrandField
            icon="lock-closed"
            placeholder="Password"
            secureTextEntry={obscure}
            value={password}
            onChangeText={setPassword}
            trailing={
              <PressableScale onPress={() => setObscure((v) => !v)} haptic="selection">
                <Ionicons
                  name={obscure ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.greyLight}
                />
              </PressableScale>
            }
          />
          <View style={styles.row}>
            <Text style={[styles.remember, { color: colors.ink }]}>Remember me</Text>
            <PressableScale
              onPress={() =>
                Alert.alert(
                  'Password reset',
                  'Password reset needs an account server, which is not connected yet.',
                )
              }
              haptic="selection"
            >
              <Text style={styles.forgot}>Forgot Password?</Text>
            </PressableScale>
          </View>
          <BrandButton label="Login" busy={busy} onPress={submit} />
          <View style={{ height: 22 }} />
          <SocialSignInRow />
          <View style={{ height: 22 }} />
          <FooterPrompt
            prompt="Don't have an account?"
            action="Sign Up"
            onPress={() => navigation.navigate('Signup')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  skip: { fontFamily: Fonts.semibold, fontSize: 17, color: Lime, paddingRight: 8 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  tag: { fontFamily: Fonts.medium, fontSize: 16, marginTop: 4 },
  title: { fontFamily: Fonts.extraBold, fontSize: 27, marginTop: 28 },
  sub: { fontFamily: Fonts.medium, fontSize: 15, marginTop: 6, marginBottom: 24 },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  remember: { fontFamily: Fonts.medium, fontSize: 15 },
  forgot: { fontFamily: Fonts.semibold, fontSize: 15, color: Lime },
});

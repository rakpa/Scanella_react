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

export function SignupScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Signup'>;
}) {
  const { colors } = useTheme();
  const signUp = useAppStore((s) => s.signUp);
  const skip = useAppStore((s) => s.continueWithoutAccount);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [obscure, setObscure] = useState(true);
  const [busy, setBusy] = useState(false);

  const enter = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Name', 'Enter your name.');
    if (!validEmail(email)) {
      return Alert.alert('Email', 'That does not look like an email address.');
    }
    if (password.length < 8) {
      return Alert.alert('Password', 'Use at least 8 characters.');
    }
    if (password !== confirm) {
      return Alert.alert('Password', 'Passwords do not match.');
    }
    setBusy(true);
    await signUp(name.trim(), email.trim());
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
          <ScanellaAppMark size={80} />
          <View style={{ height: 12 }} />
          <ScanellaWordmark size={34} />
          <Text style={[styles.tag, { color: colors.grey }]}>Scan. Save. Simplify.</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Create Account</Text>
          <Text style={[styles.sub, { color: colors.grey }]}>
            Optional — scans stay on this phone either way.{'\n'}
            An account just remembers your name.
          </Text>
          <BrandField
            icon="person"
            placeholder="Full Name"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
          <View style={{ height: 12 }} />
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
                <Ionicons name={obscure ? 'eye-off' : 'eye'} size={20} color={colors.greyLight} />
              </PressableScale>
            }
          />
          <View style={{ height: 12 }} />
          <BrandField
            icon="lock-closed"
            placeholder="Confirm Password"
            secureTextEntry={obscure}
            value={confirm}
            onChangeText={setConfirm}
          />
          <Text style={[styles.terms, { color: colors.grey }]}>
            I agree to the <Text style={{ color: Lime, fontFamily: Fonts.semibold }}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={{ color: Lime, fontFamily: Fonts.semibold }}>Privacy Policy</Text>
          </Text>
          <BrandButton label="Create Account" busy={busy} onPress={submit} />
          <View style={{ height: 22 }} />
          <SocialSignInRow />
          <View style={{ height: 22 }} />
          <FooterPrompt
            prompt="Already have an account?"
            action="Login"
            onPress={() => navigation.navigate('Login')}
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
  title: { fontFamily: Fonts.extraBold, fontSize: 26, marginTop: 22 },
  sub: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  terms: {
    width: '100%',
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    marginVertical: 16,
  },
});

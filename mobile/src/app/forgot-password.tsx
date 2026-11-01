import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button } from '@/components/button';
import { KeyboardScroll } from '@/components/keyboard';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, Field, Notice } from '@/components/ui';
import { api, errorMessage, type Store } from '@/lib/api';
import { useLoad, useNow } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const RESEND_SECONDS = 60;

/**
 * Forgot password: step 1 asks for the phone/e-mail and mails a 6-digit code,
 * step 2 takes the code and the new password. Accounts without e-mail call the hotline.
 */
export default function ForgotPasswordScreen() {
  const toast = useToast();
  const params = useLocalSearchParams<{ login?: string }>();
  const store = useLoad<Store>(() => api.store());
  const now = useNow(1000);
  const [login, setLogin] = useState(typeof params.login === 'string' ? params.login : '');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [sentAt, setSentAt] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'reset' | null>(null);
  const codeRef = useRef<TextInputInstance>(null);

  // focus the code box once step 2 shows (autoFocus alone loses to the pressed button on web)
  useEffect(() => {
    if (step !== 'reset') return undefined;
    const t = setTimeout(() => codeRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [step, sentAt]);

  const hotline = store.data?.hotline;
  const wait = Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000));

  const send = async () => {
    setBusy('send');
    setError(null);
    try {
      const r = await api.forgotPassword(login.trim());
      setInfo(r.message);
      setSentAt(Date.now());
      setStep('reset');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  };

  const reset = async () => {
    setBusy('reset');
    setError(null);
    try {
      const r = await api.resetPassword(login.trim(), code, password);
      toast.show(r.message || 'Đã đặt lại mật khẩu, vui lòng đăng nhập', 'success');
      toLogin(login.trim());
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  };

  // login and this screen replace each other, so the stack keeps a single login screen (prefilled on return)
  const toLogin = (prefill: string) => router.replace({ pathname: '/login', params: prefill ? { login: prefill } : {} });
  const back = () => {
    if (step === 'reset') { setStep('request'); setError(null); setCode(''); }
    else toLogin(login.trim());
  };

  const mismatch = !!confirm && confirm !== password;
  const canReset = /^\d{6}$/.test(code) && password.length >= 8 && password === confirm;

  return (
    <PhoneFrame>
      <TopBar title="Quên mật khẩu" onBack={back} />
      <View style={{ flex: 1 }}>
        <KeyboardScroll contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={styles.steps} accessibilityLabel={`Bước ${step === 'request' ? 1 : 2} trên 2`}>
            <View style={[styles.step, styles.stepOn]} />
            <View style={[styles.step, step === 'reset' && styles.stepOn]} />
          </View>
          {step === 'request' ? (
            <Card style={{ gap: 12 }}>
              <Txt weight="extrabold" size={18}>Lấy lại mật khẩu</Txt>
              <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }}>
                Nhập số điện thoại hoặc email của tài khoản. Nếu tài khoản có email, cửa hàng sẽ gửi mã xác nhận gồm 6 chữ số tới email đó.
              </Txt>
              {error ? <ErrorBox message={error} /> : null}
              <Field label="Số điện thoại hoặc email" value={login} onChangeText={setLogin} autoCapitalize="none" keyboardType="email-address"
                autoComplete="username" autoFocus={!login} onSubmitEditing={() => { if (login.trim()) void send(); }} />
              <Button title="Gửi mã xác nhận" size="lg" icon="mail-outline" onPress={send} loading={busy === 'send'} disabled={!login.trim()} />
            </Card>
          ) : (
            <Card style={{ gap: 12 }}>
              <Txt weight="extrabold" size={18}>Nhập mã xác nhận</Txt>
              {info ? <Notice icon="mail-outline" tone="info" text={info} /> : null}
              {error ? <ErrorBox message={error} /> : null}
              <Field label="Mã xác nhận (6 chữ số)" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} ref={codeRef} autoFocus
                keyboardType="number-pad" inputMode="numeric" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode"
                placeholder="••••••" style={styles.code} accessibilityLabel="Mã xác nhận" />
              <Field label="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="Tối thiểu 8 ký tự" />
              <Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"
                error={mismatch ? 'Mật khẩu nhập lại không khớp' : null} onSubmitEditing={() => { if (canReset) void reset(); }} />
              <Button title="Đặt lại mật khẩu" size="lg" onPress={reset} loading={busy === 'reset'} disabled={!canReset} />
              <Button title={wait ? `Gửi lại mã (${wait} giây)` : 'Gửi lại mã'} variant="secondary" icon="refresh"
                onPress={send} loading={busy === 'send'} disabled={wait > 0} />
            </Card>
          )}
          <View style={styles.help}>
            <Txt size={13} color={colors.textSoft} style={{ lineHeight: 19 }}>
              Tài khoản chưa có email? Vui lòng gọi hotline{hotline ? ' ' : ''}
              {hotline ? (
                <Txt weight="bold" size={13} color={colors.primary} accessibilityRole="link"
                  onPress={() => { void Linking.openURL(`tel:${hotline.replace(/\s/g, '')}`).catch(() => undefined); }}>{hotline}</Txt>
              ) : null}
              {' '}để cửa hàng xác minh và cấp mật khẩu tạm.
            </Txt>
          </View>
          {step === 'reset' ? (
            <Pressable accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center', minHeight: 36, justifyContent: 'center' }}
              onPress={back}>
              <Txt weight="semibold" size={14} color={colors.primary}>Dùng số điện thoại hoặc email khác</Txt>
            </Pressable>
          ) : null}
        </KeyboardScroll>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepOn: { backgroundColor: colors.primary },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  help: { paddingHorizontal: 4 },
});

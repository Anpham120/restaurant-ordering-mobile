import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { KeyboardScroll } from '@/components/keyboard';
import { PasswordRules } from '@/components/password-rules';
import { PhoneFrame } from '@/components/phone';
import { Txt } from '@/components/txt';
import { ErrorBox, Field, Notice, Segmented } from '@/components/ui';
import { errorMessage, type User } from '@/lib/api';
import { EMAIL_HINT, isEmail, isName, isPhone, isStrongPassword, NAME_HINT, PHONE_HINT } from '@/lib/validate';
import { homeFor, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Banh_Xeo_with_fish_sauce_and_vegetables.jpg/500px-Banh_Xeo_with_fish_sauce_and_vegetables.jpg';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, notice, clearNotice } = useSession();
  const params = useLocalSearchParams<{ login?: string }>();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const prefill = typeof params.login === 'string' ? params.login : '';
  const [id, setId] = useState(prefill);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = (u: User) => {
    if (u.mustChangePassword) router.replace('/set-password');
    else if (u.role === 'CUSTOMER' && router.canGoBack()) router.back();
    else router.replace(homeFor(u.role));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    clearNotice();
    try {
      const u = mode === 'login'
        ? await login(id.trim(), password)
        : await register({ fullName: name.trim(), phone: phone.trim(), email: email.trim(), password });
      done(u);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const valid = mode === 'login' ? id.trim() && password
    : isName(name) && isPhone(phone) && isEmail(email) && isStrongPassword(password) && password === confirm;

  return (
    <PhoneFrame bg={colors.white}>
      <View style={{ flex: 1 }}>
        <KeyboardScroll contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.hero}>
            <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
            <View style={styles.shade} />
            <View style={[styles.brand, { paddingTop: insets.top }]}>
              <Txt weight="extrabold" size={30} color={colors.white} style={{ letterSpacing: -0.3 }}>Atlas Restaurant</Txt>
              <Txt size={15} color={colors.white} style={{ lineHeight: 22 }}>Món Việt nấu mỗi ngày, giao nóng tận nhà trong 30 phút</Txt>
            </View>
          </View>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Segmented value={mode} onChange={(v) => { setMode(v); setError(null); }}
              options={[{ value: 'login', label: 'Đăng nhập' }, { value: 'register', label: 'Đăng ký' }]} />
            {notice && !error ? <Notice icon="time-outline" tone="info" text={notice} /> : null}
            {error ? <ErrorBox message={error} /> : null}
            {mode === 'login' ? (
              <>
                <Field label="Số điện thoại hoặc email" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address"
                  autoComplete="username" />
                <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
                  onSubmitEditing={() => { if (valid) void submit(); }} />
                <Pressable accessibilityRole="link" hitSlop={8} style={styles.forgot}
                  onPress={() => router.replace({ pathname: '/forgot-password', params: id.trim() ? { login: id.trim() } : {} })}>
                  <Txt weight="semibold" size={14} color={colors.primary}>Quên mật khẩu?</Txt>
                </Pressable>
              </>
            ) : (
              <>
                <Field label="Họ và tên" value={name} onChangeText={setName} autoComplete="name" maxLength={100}
                  error={name.trim() && !isName(name) ? NAME_HINT : null} />
                <Field label="Số điện thoại" value={phone} onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))} keyboardType="phone-pad"
                  autoComplete="tel" maxLength={10} error={phone.length >= 10 && !isPhone(phone) ? PHONE_HINT : null}
                  hint="Dùng để đăng nhập và nhận cuộc gọi giao hàng" />
                <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                  error={email.trim() && !isEmail(email) ? EMAIL_HINT : null} hint="Mã đặt lại mật khẩu sẽ được gửi về email này" />
                <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
                <PasswordRules value={password} />
                <Field label="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"
                  error={confirm && confirm !== password ? 'Mật khẩu nhập lại không khớp' : null} />
              </>
            )}
            <Button title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} size="lg" onPress={submit} loading={busy} disabled={!valid} />
            <Button title="Xem thực đơn trước, đăng nhập sau" variant="secondary" onPress={() => router.replace('/')} />
            <Txt size={12} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18, marginTop: 'auto' }}>
              Nhân viên cửa hàng đăng nhập cùng màn hình này – app tự chuyển tới khu vực làm việc theo vai trò.
            </Txt>
          </View>
        </KeyboardScroll>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  hero: { height: 300 },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,25,23,0.45)' },
  brand: { position: 'absolute', left: 24, right: 24, bottom: 48, gap: 6 },
  forgot: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', marginTop: -6 },
  sheet: { flex: 1, marginTop: -28, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 16 },
});

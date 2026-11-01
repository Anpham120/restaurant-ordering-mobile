import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { KeyboardScroll } from '@/components/keyboard';
import { PhoneFrame } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, Field } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { homeFor, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/**
 * Forced after a manager reset the password: the account works with nothing else until
 * the temporary password is replaced (the gate in _layout keeps the user here).
 */
export default function SetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { user, acceptAuth, logout } = useSession();
  const toast = useToast();
  const [temp, setTemp] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return <Redirect href="/login" />;
  if (!user.mustChangePassword) return <Redirect href={homeFor(user.role)} />;

  const mismatch = !!confirm && confirm !== next;
  const same = !!next && next === temp;
  const valid = !!temp && next.length >= 8 && next === confirm && !same;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // the flag is cleared in the new profile: the <Redirect> above then opens the role's home
      acceptAuth(await api.changePassword(temp, next));
      toast.show('Đã đặt mật khẩu mới', 'success');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <PhoneFrame>
      <View style={{ flex: 1 }}>
        <KeyboardScroll contentContainerStyle={{ padding: 16, paddingTop: insets.top + 24, gap: 12 }}>
          <View style={styles.icon}><Ionicons name="key-outline" size={28} color={colors.primary} /></View>
          <Txt weight="extrabold" size={22} style={{ textAlign: 'center' }}>Đặt mật khẩu mới</Txt>
          <Txt size={14} color={colors.textSoft} style={{ textAlign: 'center', lineHeight: 20 }}>
            Xin chào {user.fullName}. Bạn đang dùng mật khẩu tạm do cửa hàng cấp – hãy đặt mật khẩu của riêng bạn để tiếp tục.
          </Txt>
          <Card style={{ gap: 12 }}>
            {error ? <ErrorBox message={error} /> : null}
            <Field label="Mật khẩu tạm" value={temp} onChangeText={setTemp} secureTextEntry autoComplete="current-password" autoFocus
              hint="Mật khẩu cửa hàng vừa đọc cho bạn" />
            <Field label="Mật khẩu mới" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password"
              error={same ? 'Mật khẩu mới phải khác mật khẩu tạm' : null} hint="Tối thiểu 8 ký tự" />
            <Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"
              error={mismatch ? 'Mật khẩu nhập lại không khớp' : null} onSubmitEditing={() => { if (valid) void submit(); }} />
            <Button title="Lưu mật khẩu và tiếp tục" size="lg" onPress={submit} loading={busy} disabled={!valid} />
          </Card>
          <Button title="Đăng xuất" variant="ghost" onPress={() => { logout(); router.replace('/login'); }} />
        </KeyboardScroll>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});

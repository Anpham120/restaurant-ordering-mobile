import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { KeyboardScroll } from '@/components/keyboard';
import { PasswordRules } from '@/components/password-rules';
import { Button } from '@/components/button';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, Field, Notice, Toggle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { EMAIL_HINT, isEmail, isName, isStrongPassword, NAME_HINT } from '@/lib/validate';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Edit name/email and change password (any signed-in role). */
export default function ProfileScreen() {
  const { user, setUser, acceptAuth } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<'profile' | 'password' | 'marketing' | null>(null);
  if (!user) return <Redirect href="/login" />;

  const saveProfile = async () => {
    setBusy('profile');
    try {
      setUser(await api.updateProfile({ fullName: name.trim(), email: email.trim(), marketingOptIn: user.marketingOptIn }));
      toast.show('Đã cập nhật thông tin', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  // saved right away, with the stored name/email (unsaved edits in the form stay as they are)
  const saveMarketing = async (on: boolean) => {
    setBusy('marketing');
    try {
      setUser(await api.updateProfile({ fullName: user.fullName, email: user.email, marketingOptIn: on }));
      toast.show(on ? 'Bạn sẽ nhận thông báo khuyến mãi' : 'Đã tắt thông báo khuyến mãi', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  const savePassword = async () => {
    setBusy('password');
    try {
      // the API signs out every other session and hands this one a fresh token
      acceptAuth(await api.changePassword(current, next));
      setCurrent(''); setNext(''); setConfirm('');
      toast.show('Đã đổi mật khẩu, các thiết bị khác đã được đăng xuất', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  const mismatch = !!confirm && confirm !== next;
  // a customer needs an e-mail: it is where password reset codes go
  const needsEmail = user?.role === 'CUSTOMER';
  const profileOk = isName(name) && (email.trim() ? isEmail(email) : !needsEmail);

  return (
    <PhoneFrame>
      <TopBar title="Thông tin tài khoản" />
      <KeyboardScroll contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 12 }}>
          <Txt weight="extrabold" size={16}>Thông tin cá nhân</Txt>
          <Field label="Họ và tên" value={name} onChangeText={setName} maxLength={100} error={name.trim() && !isName(name) ? NAME_HINT : null} />
          <View style={{ gap: 6 }}>
            <Txt weight="semibold" size={14}>Số điện thoại</Txt>
            <Txt size={15} color={colors.muted}>{user.phone} (dùng để đăng nhập)</Txt>
          </View>
          <Field label={needsEmail ? 'Email' : 'Email (không bắt buộc)'} value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" maxLength={120} error={email.trim() && !isEmail(email) ? EMAIL_HINT : null}
            hint={needsEmail ? 'Mã đặt lại mật khẩu sẽ được gửi về email này' : undefined} />
          {!user.email ? <Notice icon="mail-outline" tone="info" text="Thêm email để lấy lại mật khẩu khi cần" /> : null}
          <Button title="Lưu thông tin" onPress={saveProfile} loading={busy === 'profile'} disabled={!profileOk} />
        </Card>
        {user.role === 'CUSTOMER' ? (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="bold" size={15}>Nhận thông báo khuyến mãi</Txt>
                <Txt size={13} color={colors.muted} style={{ lineHeight: 18 }}>Ưu đãi và món mới của cửa hàng. Thông báo đơn hàng luôn được gửi.</Txt>
              </View>
              <Toggle value={user.marketingOptIn} onChange={(v) => void saveMarketing(v)} label="Nhận thông báo khuyến mãi" disabled={busy === 'marketing'} />
            </View>
          </Card>
        ) : null}
        <Card style={{ gap: 12 }}>
          <Txt weight="extrabold" size={16}>Đổi mật khẩu</Txt>
          <Field label="Mật khẩu hiện tại" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
          <Field label="Mật khẩu mới" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
          <PasswordRules value={next} />
          <Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"
            error={mismatch ? 'Mật khẩu nhập lại không khớp' : null} />
          <Button title="Đổi mật khẩu" variant="dark" onPress={savePassword} loading={busy === 'password'} disabled={!current || !isStrongPassword(next) || next !== confirm} />
          <Pressable accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'center' }}
            onPress={() => router.push({ pathname: '/forgot-password', params: { login: user.email ?? user.phone } })}>
            <Txt weight="semibold" size={14} color={colors.primary}>Quên mật khẩu hiện tại?</Txt>
          </Pressable>
          <Txt size={12} color={colors.muted}>Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</Txt>
        </Card>
      </KeyboardScroll>
    </PhoneFrame>
  );
}

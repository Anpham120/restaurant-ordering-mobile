import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, Field } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Edit name/email and change password (any signed-in role). */
export default function ProfileScreen() {
  const { user, setUser } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);
  if (!user) return <Redirect href="/login" />;

  const saveProfile = async () => {
    setBusy('profile');
    try { setUser(await api.updateProfile({ fullName: name.trim(), email: email.trim() || null })); toast.show('Đã cập nhật thông tin', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  const savePassword = async () => {
    setBusy('password');
    try { await api.changePassword(current, next); setCurrent(''); setNext(''); toast.show('Đã đổi mật khẩu', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  return (
    <PhoneFrame>
      <TopBar title="Thông tin tài khoản" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Txt weight="extrabold" size={16}>Thông tin cá nhân</Txt>
          <Field label="Họ và tên" value={name} onChangeText={setName} maxLength={100} />
          <View style={{ gap: 6 }}>
            <Txt weight="semibold" size={14}>Số điện thoại</Txt>
            <Txt size={15} color={colors.muted}>{user.phone} (dùng để đăng nhập)</Txt>
          </View>
          <Field label="Email (không bắt buộc)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={120} />
          <Button title="Lưu thông tin" onPress={saveProfile} loading={busy === 'profile'} disabled={!name.trim()} />
        </Card>
        <Card style={{ gap: 12 }}>
          <Txt weight="extrabold" size={16}>Đổi mật khẩu</Txt>
          <Field label="Mật khẩu hiện tại" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
          <Field label="Mật khẩu mới" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint="Tối thiểu 8 ký tự" />
          <Button title="Đổi mật khẩu" variant="dark" onPress={savePassword} loading={busy === 'password'} disabled={!current || next.length < 8} />
        </Card>
      </ScrollView>
    </PhoneFrame>
  );
}

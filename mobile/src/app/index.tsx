import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Muted, Screen, Title } from '@/components/screen';
import { api, errorMessage, type Role } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

type Mode = 'choose' | 'guest' | 'staff';

const roleHome: Record<Role, string> = { STAFF: '/staff/orders', KITCHEN: '/kitchen', MANAGER: '/manager/menu' };
const roleName: Record<Role, string> = { STAFF: 'Nhân viên', KITCHEN: 'Bếp', MANAGER: 'Quản lý' };

export default function Entry() {
  const session = useSession();
  const params = useLocalSearchParams<{ table?: string }>();
  const linkToken = typeof params.table === 'string' ? params.table : '';
  const [mode, setMode] = useState<Mode>(linkToken ? 'guest' : 'choose');
  const [tokenInput, setTokenInput] = useState(linkToken);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enterTable = async (token: string) => {
    const t = token.trim();
    if (!t) { setError('Hãy nhập mã QR của bàn'); return; }
    setBusy(true);
    setError(null);
    try {
      const table = await api.tableByQr(t);
      session.setTable(table.qrToken, table.code);
      router.replace('/customer/menu');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Deep link / QR: https://.../?table=<token>
  const { setTable } = session;
  useEffect(() => {
    if (!linkToken) return;
    api.tableByQr(linkToken.trim())
      .then((table) => { setTable(table.qrToken, table.code); router.replace('/customer/menu'); })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [linkToken, setTable]);

  const doLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(username.trim(), password);
      session.setStaffSession(res.token, res.user);
      router.replace(roleHome[res.user.role] as never);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Screen error={error}>
        <Text style={styles.brand}>🍜 Gọi món nhà hàng</Text>
        <Muted>Quét mã QR trên bàn để xem thực đơn và gọi món.</Muted>

        {session.tableToken && mode === 'choose' ? (
          <Card>
            <Title>Bàn {session.tableCode}</Title>
            <Button title="Tiếp tục gọi món" onPress={() => router.replace('/customer/menu')} />
            <Button title="Đổi bàn" variant="secondary" onPress={() => session.leaveTable()} />
          </Card>
        ) : null}

        {session.user && mode === 'choose' ? (
          <Card>
            <Title>{session.user.fullName}</Title>
            <Muted>Đang đăng nhập: {roleName[session.user.role]}</Muted>
            <Button title="Vào khu vực làm việc" onPress={() => router.replace(roleHome[session.user!.role] as never)} />
            <Button title="Đăng xuất" variant="secondary" onPress={session.logout} />
          </Card>
        ) : null}

        {mode === 'choose' ? (
          <>
            <Button title="Tôi là khách" onPress={() => { setError(null); setMode('guest'); }} />
            <Button title="Nhân viên đăng nhập" variant="secondary" onPress={() => { setError(null); setMode('staff'); }} />
          </>
        ) : null}

        {mode === 'guest' ? (
          <Card>
            <Title>Nhập mã bàn</Title>
            <Field label="Mã QR của bàn" value={tokenInput} onChangeText={setTokenInput} autoCapitalize="none" autoCorrect={false} placeholder="vd: 22a7e11d-1490-..." />
            <Button title="Vào bàn" onPress={() => enterTable(tokenInput)} loading={busy} />
            <Button title="Quay lại" variant="ghost" onPress={() => { setError(null); setMode('choose'); }} />
          </Card>
        ) : null}

        {mode === 'staff' ? (
          <Card>
            <Title>Đăng nhập nhân sự</Title>
            <Field label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
            <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={doLogin} />
            <Button title="Đăng nhập" onPress={doLogin} loading={busy} />
            <Button title="Quay lại" variant="ghost" onPress={() => { setError(null); setMode('choose'); }} />
            <Muted>Tài khoản demo: manager/manager123, staff/staff123, kitchen/kitchen123</Muted>
          </Card>
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  brand: { fontSize: 28, fontWeight: '800', color: colors.primary, marginTop: 24 },
});

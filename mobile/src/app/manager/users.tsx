import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chips } from '@/components/chip';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, type Role } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { usePoll } from '@/lib/use-poll';

const roleLabel: Record<Role, string> = { STAFF: 'Nhân viên', KITCHEN: 'Bếp', MANAGER: 'Quản lý' };

export default function Users() {
  const { user: me } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('STAFF');
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll(() => api.users(), 0);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };

  const create = () => run(async () => {
    if (!username.trim() || password.length < 6 || !fullName.trim()) throw new Error('Nhập tên đăng nhập, họ tên và mật khẩu ≥ 6 ký tự');
    await api.createUser({ username: username.trim(), password, fullName: fullName.trim(), phone: phone.trim() || undefined, role });
    setUsername(''); setPassword(''); setFullName(''); setPhone('');
  });

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      <Card>
        <Title>Thêm nhân sự</Title>
        <Field label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <Field label="Mật khẩu (≥ 6 ký tự)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <Field label="Họ tên" value={fullName} onChangeText={setFullName} />
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Chips<Role> options={(Object.keys(roleLabel) as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))} value={role} onChange={setRole} />
        <Button small title="Tạo tài khoản" onPress={create} />
      </Card>
      {data?.map((u) => (
        <Card key={u.id}>
          <View style={styles.head}>
            <Text style={styles.name}>{u.fullName}</Text>
            <Badge label={roleLabel[u.role]} />
          </View>
          <Muted>{u.username}{u.phone ? ` · ${u.phone}` : ''}{u.active ? '' : ' · đã khóa'}</Muted>
          {u.id !== me?.id ? (
            <Row>
              <Button small variant="danger" title="Xóa" onPress={async () => { if (await confirmAction(`Xóa tài khoản ${u.username}?`)) await run(() => api.deleteUser(u.id)); }} />
            </Row>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
});

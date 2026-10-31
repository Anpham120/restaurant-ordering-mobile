import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { colors } from '@/lib/theme';
import { usePoll } from '@/lib/use-poll';

export default function ManagerTables() {
  const [code, setCode] = useState('');
  const [seats, setSeats] = useState('4');
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll(() => api.adminTables(), 0);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };

  const link = (token: string) => Linking.createURL('/', { queryParams: { table: token } });

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      <Card>
        <Title>Thêm bàn</Title>
        <Field label="Mã bàn" value={code} onChangeText={setCode} autoCapitalize="characters" />
        <Field label="Số chỗ" value={seats} onChangeText={setSeats} keyboardType="numeric" />
        <Button small title="Thêm bàn" disabled={!code.trim()} onPress={() => run(async () => { await api.createTable(code.trim(), Number(seats) || 1); setCode(''); })} />
      </Card>
      {data?.map((t) => (
        <Card key={t.id}>
          <View style={styles.head}>
            <Text style={styles.name}>{t.code} · {t.seats} chỗ</Text>
            <Badge label={t.status === 'FREE' ? 'Trống' : 'Có khách'} status={t.status} />
          </View>
          <Muted>Mã QR (dán vào mã QR in ra):</Muted>
          <Text selectable style={styles.token}>{t.qrToken}</Text>
          <Muted>Liên kết khi quét QR:</Muted>
          <Text selectable style={styles.token}>{link(t.qrToken)}</Text>
          <Row>
            <Button small variant="secondary" title="Tạo mã mới" onPress={async () => { if (await confirmAction(`Tạo mã QR mới cho bàn ${t.code}? Mã cũ sẽ không còn dùng được.`)) await run(() => api.regenerateQr(t.id)); }} />
            <Button small variant="danger" title="Xóa" onPress={async () => { if (await confirmAction(`Xóa bàn ${t.code}?`)) await run(() => api.deleteTable(t.id)); }} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  token: { fontFamily: 'monospace', fontSize: 12, color: colors.text },
});

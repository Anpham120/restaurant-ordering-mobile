import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function CartScreen() {
  const s = useSession();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const total = s.cart.reduce((sum, l) => sum + l.menuItem.price * l.quantity, 0);

  const submit = async () => {
    if (!s.tableToken) return;
    setBusy(true);
    setError(null);
    try {
      const order = await api.createOrder({
        qrToken: s.tableToken,
        items: s.cart.map((l) => ({ menuItemId: l.menuItem.id, quantity: l.quantity, note: l.note.trim() || undefined })),
        note: note.trim() || undefined,
        voucherCode: s.voucherCode.trim() || undefined,
      });
      s.setOrderId(order.id);
      s.clearCart();
      setNote('');
      router.navigate('/customer/orders');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (s.cart.length === 0) {
    return (
      <Screen>
        <Muted>Giỏ hàng trống. Hãy chọn món ở tab Thực đơn.</Muted>
      </Screen>
    );
  }

  return (
    <Screen error={error}>
      {s.cart.map((l) => (
        <Card key={l.menuItem.id}>
          <View style={styles.head}>
            <Text style={styles.name}>{l.menuItem.name}</Text>
            <Text style={styles.price}>{money(l.menuItem.price * l.quantity)}</Text>
          </View>
          <Row>
            <Button small variant="secondary" title="−" onPress={() => s.setQuantity(l.menuItem.id, l.quantity - 1)} />
            <Text style={styles.qty}>{l.quantity}</Text>
            <Button small variant="secondary" title="+" onPress={() => s.setQuantity(l.menuItem.id, l.quantity + 1)} />
            <Button small variant="ghost" title="Xóa" onPress={() => s.setQuantity(l.menuItem.id, 0)} />
          </Row>
          <Field value={l.note} onChangeText={(t) => s.setLineNote(l.menuItem.id, t)} placeholder="Ghi chú (ít đá, không hành…)" maxLength={255} />
        </Card>
      ))}
      <Card>
        <Field label="Mã giảm giá (nếu có)" value={s.voucherCode} onChangeText={s.setVoucherCode} autoCapitalize="characters" autoCorrect={false} />
        <Field label="Ghi chú cho đơn" value={note} onChangeText={setNote} maxLength={255} />
        <View style={styles.head}>
          <Title>Tạm tính</Title>
          <Title>{money(total)}</Title>
        </View>
        <Muted>Giảm giá (nếu có) được tính khi gửi đơn.</Muted>
        <Button title="Gửi order" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  price: { fontWeight: '700', color: colors.primary },
  qty: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '600' },
});

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chips } from '@/components/chip';
import { Field } from '@/components/field';
import { Muted, Screen } from '@/components/screen';
import { api, type Category, type MenuItem } from '@/lib/api';
import { money } from '@/lib/format';
import { useSession } from '@/lib/session';
import { usePoll } from '@/lib/use-poll';
import { colors } from '@/lib/theme';

export default function MenuScreen() {
  const { addToCart, cart } = useSession();
  const [category, setCategory] = useState<number>(0);
  const [q, setQuery] = useState('');
  const { data, error, reload } = usePoll<{ cats: Category[]; items: MenuItem[] }>(async () => {
    const [cats, items] = await Promise.all([api.categories(), api.menu({ category: category || null, q: q.trim() })]);
    return { cats, items };
  }, 15000);

  const options = [{ value: 0, label: 'Tất cả' }, ...(data?.cats ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const qtyOf = (id: number) => cart.find((l) => l.menuItem.id === id)?.quantity ?? 0;

  return (
    <Screen error={error} onRefresh={reload}>
      <Field value={q} onChangeText={setQuery} onSubmitEditing={reload} onBlur={reload} placeholder="Tìm món…" returnKeyType="search" />
      <Chips options={options} value={category} onChange={(v) => { setCategory(v); setTimeout(reload, 0); }} />
      {data && data.items.length === 0 ? <Muted>Không có món phù hợp.</Muted> : null}
      {data?.items.map((m) => (
        <Card key={m.id}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{m.name}</Text>
              {m.description ? <Muted>{m.description}</Muted> : null}
              <Text style={styles.price}>{money(m.price)}</Text>
            </View>
            <View style={styles.action}>
              <Button small title={qtyOf(m.id) ? `Thêm (${qtyOf(m.id)})` : 'Thêm'} onPress={() => addToCart(m)} />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 2 },
  action: { minWidth: 90 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  price: { color: colors.primary, fontWeight: '700', marginTop: 2 },
});

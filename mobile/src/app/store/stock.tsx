import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, FoodImage, Loading, SearchBox, Toggle } from '@/components/ui';
import { api, errorMessage, type MenuItem } from '@/lib/api';
import { money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Staff mark dishes sold out for today. */
export default function Stock() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const menu = useLoad<MenuItem[]>(() => api.storeMenu());
  const set = async (m: MenuItem, v: boolean) => {
    try {
      const u = await api.setAvailability(m.id, v);
      menu.setData((d) => (d ? d.map((x) => (x.id === u.id ? u : x)) : d));
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const list = (menu.data ?? []).filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Page title="Món còn / hết hàng" subtitle={`${(menu.data ?? []).filter((m) => !m.available).length} món đang báo hết`}
      actions={<View style={{ width: 240 }}><SearchBox value={q} onChangeText={setQ} placeholder="Tìm món…" accessibilityLabel="Tìm món" /></View>}>
      {menu.error ? <ErrorBox message={menu.error} onRetry={menu.reload} /> : null}
      {menu.loading && !menu.data ? <Loading /> : (
        <Card padded={false}>
          {list.map((m, i) => (
            <View key={m.id} style={[styles.row, i > 0 && styles.line]}>
              <FoodImage uri={m.imageUrl} style={{ width: 44, height: 44 }} />
              <View style={{ flex: 1 }}>
                <Txt weight="bold" size={15}>{m.name}</Txt>
                <Txt size={13} color={colors.muted}>{m.categoryName} · {money(m.price)}</Txt>
              </View>
              <Txt weight="semibold" size={13} color={m.available ? colors.success : colors.danger}>{m.available ? 'Còn hàng' : 'Hết hàng'}</Txt>
              <Toggle value={m.available} onChange={(v) => void set(m, v)} label={`Còn hàng: ${m.name}`} />
            </View>
          ))}
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.divider },
});

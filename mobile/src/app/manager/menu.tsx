import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chips } from '@/components/chip';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, type Category, type MenuItem } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { usePoll } from '@/lib/use-poll';

interface Form { id: number | null; name: string; price: string; description: string; imageUrl: string; categoryId: number | null }
const EMPTY: Form = { id: null, name: '', price: '', description: '', imageUrl: '', categoryId: null };

export default function ManagerMenu() {
  const [form, setForm] = useState<Form | null>(null);
  const [newCat, setNewCat] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll<{ items: MenuItem[]; cats: Category[] }>(async () => {
    const [items, cats] = await Promise.all([api.adminMenuItems(), api.categories()]);
    return { items, cats };
  }, 0);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };

  const save = () => run(async () => {
    if (!form) return;
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || form.categoryId == null) throw new Error('Nhập tên, giá hợp lệ và chọn danh mục');
    const body = { categoryId: form.categoryId, name: form.name.trim(), price, description: form.description.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined };
    if (form.id == null) await api.createMenuItem(body); else await api.updateMenuItem(form.id, body);
    setForm(null);
  });

  const edit = (m: MenuItem) => setForm({ id: m.id, name: m.name, price: String(m.price), description: m.description ?? '', imageUrl: m.imageUrl ?? '', categoryId: m.category.id });

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      <Card>
        <Title>Danh mục</Title>
        <Row>
          {data?.cats.map((c) => (
            <Button key={c.id} small variant="secondary" title={`${c.name} ✕`} onPress={async () => { if (await confirmAction(`Xóa danh mục "${c.name}"?`)) await run(() => api.deleteCategory(c.id)); }} />
          ))}
        </Row>
        <Row>
          <View style={{ flex: 1, minWidth: 150 }}><Field value={newCat} onChangeText={setNewCat} placeholder="Tên danh mục mới" /></View>
          <Button small title="Thêm" disabled={!newCat.trim()} onPress={() => run(async () => { await api.createCategory(newCat.trim(), (data?.cats.length ?? 0) + 1); setNewCat(''); })} />
        </Row>
      </Card>

      {form ? (
        <Card>
          <Title>{form.id == null ? 'Thêm món' : 'Sửa món'}</Title>
          <Field label="Tên món" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
          <Field label="Giá (đ)" value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="numeric" />
          <Field label="Mô tả" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} />
          <Field label="Ảnh (URL)" value={form.imageUrl} onChangeText={(t) => setForm({ ...form, imageUrl: t })} autoCapitalize="none" />
          <Muted>Danh mục</Muted>
          <Chips options={(data?.cats ?? []).map((c) => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} />
          <Row>
            <Button small title="Lưu" onPress={save} />
            <Button small variant="ghost" title="Hủy" onPress={() => setForm(null)} />
          </Row>
        </Card>
      ) : (
        <Button title="+ Thêm món" onPress={() => setForm({ ...EMPTY, categoryId: data?.cats[0]?.id ?? null })} />
      )}

      {data?.items.map((m) => (
        <Card key={m.id}>
          <View style={styles.head}>
            <Text style={styles.name}>{m.name}</Text>
            <Badge label={m.available ? 'Còn món' : 'Hết món'} status={m.available ? 'FREE' : 'CANCELLED'} />
          </View>
          <Muted>{m.category.name} · {money(m.price)}</Muted>
          <Row>
            <Button small variant="secondary" title="Sửa" onPress={() => edit(m)} />
            <Button small variant="secondary" title={m.available ? 'Báo hết' : 'Có lại'} onPress={() => run(() => api.setAvailability(m.id, !m.available))} />
            <Button small variant="danger" title="Xóa" onPress={async () => { if (await confirmAction(`Xóa món "${m.name}"?`)) await run(() => api.deleteMenuItem(m.id)); }} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { OptionsEditor } from '@/components/options-editor';
import { Txt } from '@/components/txt';
import { Badge, Card, Chip, Empty, ErrorBox, Field, FoodImage, Loading, SearchBox, Toggle } from '@/components/ui';
import { api, errorMessage, type Category, type MenuItem, type MenuItemInput } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { money, optionText } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

interface Form { id?: number; categoryId: number; name: string; description: string; price: string; imageUrl: string; available: boolean; active: boolean }

export default function AdminMenu() {
  const toast = useToast();
  const items = useLoad<MenuItem[]>(() => api.adminItems());
  const cats = useLoad<Category[]>(() => api.adminCategories());
  const [cat, setCat] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [optionsFor, setOptionsFor] = useState<MenuItem | null>(null);
  const current = form?.id ? (items.data ?? []).find((m) => m.id === form.id) : undefined;

  const list = (items.data ?? []).filter((m) => (cat == null || m.categoryId === cat) && (!q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())));
  const edit = (m: MenuItem) => setForm({ id: m.id, categoryId: m.categoryId, name: m.name, description: m.description ?? '', price: String(m.price),
    imageUrl: m.imageUrl ?? '', available: m.available, active: m.active });
  const create = () => setForm({ categoryId: cat ?? cats.data?.[0]?.id ?? 0, name: '', description: '', price: '', imageUrl: '', available: true, active: true });

  const body = (f: Form): MenuItemInput => ({ categoryId: f.categoryId, name: f.name.trim(), description: f.description.trim() || null,
    price: Number(f.price), imageUrl: f.imageUrl.trim() || null, available: f.available, active: f.active });
  const upsert = (m: MenuItem) => items.setData((d) => (d ? (d.some((x) => x.id === m.id) ? d.map((x) => (x.id === m.id ? m : x)) : [...d, m]) : d));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const m = form.id ? await api.updateItem(form.id, body(form)) : await api.createItem(body(form));
      upsert(m);
      setForm(null);
      toast.show(`Đã lưu "${m.name}"`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const quick = async (m: MenuItem, patch: Partial<Pick<MenuItem, 'available' | 'active'>>) => {
    try {
      upsert(await api.updateItem(m.id, { categoryId: m.categoryId, name: m.name, description: m.description, price: m.price, imageUrl: m.imageUrl,
        available: patch.available ?? m.available, active: patch.active ?? m.active }));
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa hẳn món "${form.name}"? Chỉ xóa được món chưa từng có trong đơn hàng.`, 'Xóa'))) return;
    try {
      await api.deleteItem(form.id);
      items.setData((d) => (d ? d.filter((x) => x.id !== form.id) : d));
      setForm(null);
      toast.show('Đã xóa món', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const priceOk = /^\d+(\.\d{1,2})?$/.test(form?.price ?? '');
  const urlOk = !form?.imageUrl.trim() || /^https?:\/\/.+/.test(form.imageUrl.trim());

  return (
    <Page title="Thực đơn" subtitle={`${items.data?.length ?? 0} món · ${(items.data ?? []).filter((m) => !m.active).length} món ngừng bán`}
      actions={<Button title="Thêm món" icon="add" onPress={create} disabled={!cats.data?.length} />}>
      {items.error ? <ErrorBox message={items.error} onRetry={items.reload} /> : null}
      <WithEditor
        list={<>
          <View style={styles.filters}>
            <View style={{ width: 220 }}><SearchBox value={q} onChangeText={setQ} placeholder="Tìm món…" accessibilityLabel="Tìm món" /></View>
            <Chip label="Tất cả" active={cat == null} onPress={() => setCat(null)} />
            {(cats.data ?? []).map((c) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(c.id)} />)}
          </View>
          <Card padded={false}>
            {items.loading && !items.data ? <Loading /> : list.length === 0 ? <Empty title="Không có món nào" /> : (
              <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
                <View style={{ minWidth: 720, flex: 1 }}>
                  <View style={[styles.row, { borderTopWidth: 0 }]}>
                    <Txt weight="semibold" size={13} color={colors.muted} style={styles.cName}>Món</Txt>
                    <Txt weight="semibold" size={13} color={colors.muted} style={styles.cCat}>Danh mục</Txt>
                    <Txt weight="semibold" size={13} color={colors.muted} style={[styles.cPrice, { textAlign: 'right' }]}>Giá</Txt>
                    <Txt weight="semibold" size={13} color={colors.muted} style={styles.cRate}>Đánh giá</Txt>
                    <Txt weight="semibold" size={13} color={colors.muted} style={styles.cToggle}>Còn hàng</Txt>
                    <Txt weight="semibold" size={13} color={colors.muted} style={styles.cToggle}>Đang bán</Txt>
                    <View style={{ width: 44 }} />
                  </View>
                  {list.map((m) => (
                    <View key={m.id} style={[styles.row, !m.active && { opacity: 0.6 }, form?.id === m.id && { backgroundColor: colors.primarySoft }]}>
                      <View style={[styles.cName]}>
                        <FoodImage uri={m.imageUrl} style={{ width: 48, height: 48 }} />
                        <View style={{ flex: 1 }}>
                          <Txt weight="bold" size={14} numberOfLines={1}>{m.name}</Txt>
                          <Txt size={12} color={colors.muted}>Đã bán {m.soldCount}</Txt>
                        </View>
                      </View>
                      <Txt size={14} color={colors.textSoft} style={styles.cCat} numberOfLines={1}>{m.categoryName}</Txt>
                      <Txt weight="bold" size={14} style={[styles.cPrice, { textAlign: 'right' }]}>{money(m.price)}</Txt>
                      <Txt size={14} color={colors.textSoft} style={styles.cRate}>{m.ratingAvg != null ? `${m.ratingAvg.toFixed(1)} (${m.ratingCount})` : '–'}</Txt>
                      <View style={styles.cToggle}><Toggle value={m.available} onChange={(v) => void quick(m, { available: v })} label={`Còn hàng ${m.name}`} disabled={!m.active} /></View>
                      <View style={styles.cToggle}>
                        <Badge label={m.active ? 'Đang bán' : 'Ngừng bán'} bg={m.active ? colors.successSoft : colors.neutralSoft} fg={m.active ? colors.success : colors.neutralText} />
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Sửa ${m.name}`} onPress={() => edit(m)} style={{ width: 44, alignItems: 'flex-end' }}>
                        <Txt weight="bold" size={14} color={colors.primary}>Sửa</Txt>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Card>
        </>}
        editor={
          <EditorPanel open={!!form} title={form?.id ? 'Sửa món' : 'Thêm món mới'} onClose={() => setForm(null)} onSave={save} saving={saving}
            canSave={!!form && !!form.name.trim() && priceOk && urlOk && !!form.categoryId}
            extra={form?.id ? <Button title={form.active ? 'Ngừng bán' : 'Bán lại'} variant="secondary" onPress={() => set('active', !form.active)} /> : null}>
            {form ? (
              <>
                {form.imageUrl.trim() && urlOk ? <FoodImage uri={form.imageUrl.trim()} style={{ width: '100%', height: 160 }} rounded={12} /> : null}
                <Field label="Tên món" value={form.name} onChangeText={(v) => set('name', v)} maxLength={120} />
                <Field label="Giá (đ)" value={form.price} onChangeText={(v) => set('price', v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" error={form.price && !priceOk ? 'Giá không hợp lệ' : null} />
                <View style={{ gap: 6 }}>
                  <Txt weight="semibold" size={14}>Danh mục</Txt>
                  <View style={styles.filters}>
                    {(cats.data ?? []).map((c) => <Chip key={c.id} label={c.name} active={form.categoryId === c.id} onPress={() => set('categoryId', c.id)} />)}
                  </View>
                </View>
                <Field label="Mô tả" value={form.description} onChangeText={(v) => set('description', v)} multiline maxLength={500} />
                <Field label="Link ảnh" value={form.imageUrl} onChangeText={(v) => set('imageUrl', v)} autoCapitalize="none" placeholder="https://…"
                  error={urlOk ? null : 'Phải bắt đầu bằng http:// hoặc https://'} />
                {current ? (
                  <View style={styles.optBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Txt weight="semibold" size={14}>Tùy chọn (size, topping…)</Txt>
                      <Button title={current.optionGroups.length ? 'Sửa' : 'Thêm'} size="sm" variant="soft" onPress={() => setOptionsFor(current)} />
                    </View>
                    {current.optionGroups.length ? current.optionGroups.map((g) => (
                      <Txt key={g.id} size={13} color={colors.textSoft}>
                        <Txt weight="bold" size={13}>{g.name}</Txt> ({g.minSelect > 0 ? 'bắt buộc' : 'tùy chọn'}, tối đa {g.maxSelect}): {optionText(g.options.map((o) => ({ ...o, groupName: g.name })))}
                      </Txt>
                    )) : <Txt size={13} color={colors.muted}>Món chưa có tùy chọn.</Txt>}
                  </View>
                ) : form.id ? null : <Txt size={13} color={colors.muted}>Lưu món trước rồi thêm tùy chọn (size, topping…).</Txt>}
                <View style={styles.switchRow}>
                  <Txt size={14} style={{ flex: 1 }}>Còn hàng hôm nay</Txt>
                  <Toggle value={form.available} onChange={(v) => set('available', v)} label="Còn hàng" />
                </View>
                {!form.active ? <Txt size={13} color={colors.warningText}>Món đang ngừng bán – khách không nhìn thấy món này.</Txt> : null}
                {form.id ? (
                  <Pressable accessibilityRole="button" onPress={() => void remove()} style={{ alignSelf: 'flex-start' }}>
                    <Txt weight="semibold" size={13} color={colors.danger}>Xóa hẳn món này</Txt>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </EditorPanel>
        } />
      {optionsFor ? <OptionsEditor item={optionsFor} onClose={() => setOptionsFor(null)} onSaved={upsert} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  cName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 200 },
  cCat: { width: 120 },
  cPrice: { width: 80 },
  cRate: { width: 80 },
  cToggle: { width: 84 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 6 },
});

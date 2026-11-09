import { useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { problems } from '@/lib/validate';
import { ListRow } from '@/components/list-row';
import { Txt } from '@/components/txt';
import { Card, Empty, ErrorBox, Field, FoodImage, Loading } from '@/components/ui';
import { api, errorMessage, type Category } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

interface Form { id?: number; name: string; imageUrl: string; sortOrder: string }

export default function AdminCategories() {
  const toast = useToast();
  const cats = useLoad<Category[]>(() => api.adminCategories());
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const body = { name: form.name.trim(), imageUrl: form.imageUrl.trim() || null, sortOrder: Number(form.sortOrder) || 0 };
    try {
      if (form.id) await api.updateCategory(form.id, body); else await api.createCategory(body);
      setForm(null);
      await cats.reload();
      toast.show('Đã lưu danh mục', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa danh mục "${form.name}"?`, 'Xóa'))) return;
    try { await api.deleteCategory(form.id); setForm(null); await cats.reload(); toast.show('Đã xóa danh mục', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <Page title="Danh mục món" subtitle="Thứ tự hiển thị trên app theo số thứ tự tăng dần"
      actions={<Button title="Thêm danh mục" icon="add" onPress={() => setForm({ name: '', imageUrl: '', sortOrder: String((cats.data?.length ?? 0) + 1) })} />}>
      {cats.error ? <ErrorBox message={cats.error} onRetry={cats.reload} /> : null}
      <WithEditor
        list={<Card padded={false}>
          {cats.loading && !cats.data ? <Loading /> : (cats.data ?? []).length === 0 ? <Empty title="Chưa có danh mục" /> : (cats.data ?? []).map((c, i) => (
            <ListRow key={c.id} first={i === 0} selected={form?.id === c.id}
              onPress={() => setForm({ id: c.id, name: c.name, imageUrl: c.imageUrl ?? '', sortOrder: String(c.sortOrder) })}>
              <Txt weight="bold" size={14} color={colors.muted} style={{ width: 24 }}>{c.sortOrder}</Txt>
              <FoodImage uri={c.imageUrl} style={{ width: 44, height: 44 }} rounded={22} />
              <Txt weight="bold" size={15} style={{ flex: 1 }}>{c.name}</Txt>
              <Txt size={14} color={colors.muted}>{c.itemCount} món</Txt>
            </ListRow>
          ))}
        </Card>}
        editor={<EditorPanel open={!!form} title={form?.id ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setForm(null)} onSave={save} saving={saving}
          problems={problems(!form?.name.trim() && 'Nhập tên danh mục')} extra={form?.id ? <Button title="Xóa" variant="danger" onPress={() => void remove()} /> : null}>
          {form ? (
            <View style={{ gap: 12 }}>
              <Field label="Tên danh mục" value={form.name} onChangeText={(v) => set('name', v)} maxLength={60} />
              <Field label="Link ảnh đại diện" value={form.imageUrl} onChangeText={(v) => set('imageUrl', v)} autoCapitalize="none" placeholder="https://…" />
              <Field label="Thứ tự" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v.replace(/\D/g, ''))} keyboardType="numeric" />
            </View>
          ) : null}
        </EditorPanel>} />
    </Page>
  );
}

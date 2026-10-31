import { useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { ListRow } from '@/components/list-row';
import { Txt } from '@/components/txt';
import { Badge, Card, Empty, ErrorBox, Field, Loading, Toggle } from '@/components/ui';
import { api, errorMessage, type Zone } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

interface Form { id?: number; name: string; deliveryFee: string; estimatedMinutes: string; sortOrder: string; active: boolean }

export default function AdminZones() {
  const toast = useToast();
  const zones = useLoad<Zone[]>(() => api.adminZones());
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const body = { name: form.name.trim(), deliveryFee: Number(form.deliveryFee) || 0, estimatedMinutes: Number(form.estimatedMinutes) || 30,
      sortOrder: Number(form.sortOrder) || 0, active: form.active };
    try {
      if (form.id) await api.updateZone(form.id, body); else await api.createZone(body);
      setForm(null);
      await zones.reload();
      toast.show('Đã lưu khu vực giao', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa khu vực "${form.name}"?`, 'Xóa'))) return;
    try { await api.deleteZone(form.id); setForm(null); await zones.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <Page title="Khu vực giao hàng" subtitle="Phí ship và thời gian giao theo từng quận"
      actions={<Button title="Thêm khu vực" icon="add" onPress={() => setForm({ name: '', deliveryFee: '15000', estimatedMinutes: '30', sortOrder: String(zones.data?.length ?? 0), active: true })} />}>
      {zones.error ? <ErrorBox message={zones.error} onRetry={zones.reload} /> : null}
      <WithEditor
        list={<Card padded={false}>
          {zones.loading && !zones.data ? <Loading /> : (zones.data ?? []).length === 0 ? <Empty title="Chưa có khu vực nào" /> : (zones.data ?? []).map((z, i) => (
            <ListRow key={z.id} first={i === 0} selected={form?.id === z.id} dim={!z.active}
              onPress={() => setForm({ id: z.id, name: z.name, deliveryFee: String(z.deliveryFee), estimatedMinutes: String(z.estimatedMinutes), sortOrder: String(z.sortOrder), active: z.active })}>
              <Txt weight="bold" size={15} style={{ flex: 1, minWidth: 120 }}>{z.name}</Txt>
              <Txt size={14} style={{ width: 110 }}>{money(z.deliveryFee)}</Txt>
              <Txt size={14} color={colors.muted} style={{ width: 90 }}>~{z.estimatedMinutes} phút</Txt>
              <Badge label={z.active ? 'Đang giao' : 'Ngừng giao'} bg={z.active ? colors.successSoft : colors.neutralSoft} fg={z.active ? colors.success : colors.neutralText} />
            </ListRow>
          ))}
        </Card>}
        editor={<EditorPanel open={!!form} title={form?.id ? 'Sửa khu vực' : 'Thêm khu vực'} onClose={() => setForm(null)} onSave={save} saving={saving}
          canSave={!!form?.name.trim() && Number(form.estimatedMinutes) >= 5} extra={form?.id ? <Button title="Xóa" variant="danger" onPress={() => void remove()} /> : null}>
          {form ? (
            <View style={{ gap: 12 }}>
              <Field label="Tên khu vực" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Quận 1" maxLength={60} />
              <Field label="Phí giao (đ)" value={form.deliveryFee} onChangeText={(v) => set('deliveryFee', v.replace(/\D/g, ''))} keyboardType="numeric" />
              <Field label="Thời gian giao dự kiến (phút)" value={form.estimatedMinutes} onChangeText={(v) => set('estimatedMinutes', v.replace(/\D/g, ''))} keyboardType="numeric" />
              <Field label="Thứ tự" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v.replace(/\D/g, ''))} keyboardType="numeric" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt size={14} style={{ flex: 1 }}>Đang nhận giao tới khu vực này</Txt>
                <Toggle value={form.active} onChange={(v) => set('active', v)} label="Đang giao" />
              </View>
            </View>
          ) : null}
        </EditorPanel>} />
    </Page>
  );
}

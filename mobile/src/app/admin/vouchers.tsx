import { useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { ListRow } from '@/components/list-row';
import { Txt } from '@/components/txt';
import { Badge, Card, Empty, ErrorBox, Field, Loading, Segmented, Toggle } from '@/components/ui';
import { api, errorMessage, type DiscountType, type Voucher, type VoucherInput } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { discountLabel, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

interface Form {
  id?: number; code: string; description: string; discountType: DiscountType; discountValue: string; maxDiscount: string; minOrder: string;
  startAt: string; endAt: string; usageLimit: string; perUserLimit: string; active: boolean;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toInput = (s: string | null) => (s ? s.slice(0, 10) : '');
const num = (s: string) => (s.trim() ? Number(s) : null);

export default function AdminVouchers() {
  const toast = useToast();
  const list = useLoad<Voucher[]>(() => api.adminVouchers());
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (v: Voucher) => setForm({ id: v.id, code: v.code, description: v.description ?? '', discountType: v.discountType, discountValue: String(v.discountValue),
    maxDiscount: v.maxDiscount ? String(v.maxDiscount) : '', minOrder: String(v.minOrder), startAt: toInput(v.startAt), endAt: toInput(v.endAt),
    usageLimit: v.usageLimit ? String(v.usageLimit) : '', perUserLimit: v.perUserLimit ? String(v.perUserLimit) : '', active: v.active });

  const datesOk = !!form && (!form.startAt || DATE.test(form.startAt)) && (!form.endAt || DATE.test(form.endAt));
  const save = async () => {
    if (!form) return;
    setSaving(true);
    const body: VoucherInput = {
      code: form.code.trim().toUpperCase(), description: form.description.trim() || null, discountType: form.discountType, discountValue: Number(form.discountValue),
      maxDiscount: form.discountType === 'PERCENT' ? num(form.maxDiscount) : null, minOrder: num(form.minOrder) ?? 0,
      startAt: form.startAt ? `${form.startAt}T00:00:00` : null, endAt: form.endAt ? `${form.endAt}T23:59:59` : null,
      usageLimit: num(form.usageLimit), perUserLimit: num(form.perUserLimit), active: form.active,
    };
    try {
      if (form.id) await api.updateVoucher(form.id, body); else await api.createVoucher(body);
      setForm(null);
      await list.reload();
      toast.show('Đã lưu mã giảm giá', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa mã ${form.code}?`, 'Xóa'))) return;
    try { await api.deleteVoucher(form.id); setForm(null); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <Page title="Khuyến mãi" subtitle="Mã giảm giá khách nhập khi đặt hàng"
      actions={<Button title="Tạo mã giảm giá" icon="add" onPress={() => setForm({ code: '', description: '', discountType: 'PERCENT', discountValue: '10', maxDiscount: '',
        minOrder: '0', startAt: '', endAt: '', usageLimit: '', perUserLimit: '', active: true })} />}>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <WithEditor
        list={<Card padded={false}>
          {list.loading && !list.data ? <Loading /> : (list.data ?? []).length === 0 ? <Empty title="Chưa có mã giảm giá" /> : (list.data ?? []).map((v, i) => (
            <ListRow key={v.id} first={i === 0} selected={form?.id === v.id} dim={!v.active} onPress={() => edit(v)}>
              <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
                <Txt weight="extrabold" size={15} color={colors.primaryText}>{v.code}</Txt>
                <Txt size={13} color={colors.textSoft}>{v.description ?? discountLabel(v.discountType, v.discountValue, v.maxDiscount)}</Txt>
                <Txt size={12} color={colors.muted}>
                  {discountLabel(v.discountType, v.discountValue, v.maxDiscount)} · đơn từ {money(v.minOrder)}{v.endAt ? ` · hết hạn ${toInput(v.endAt).split('-').reverse().join('/')}` : ''}
                </Txt>
              </View>
              <Txt size={13} color={colors.textSoft} style={{ width: 120 }}>Đã dùng {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ''}</Txt>
              <Badge label={v.active ? 'Đang áp dụng' : 'Ngừng áp dụng'} bg={v.active ? colors.successSoft : colors.neutralSoft} fg={v.active ? colors.success : colors.neutralText} />
            </ListRow>
          ))}
        </Card>}
        editor={<EditorPanel open={!!form} title={form?.id ? `Sửa mã ${form.code}` : 'Tạo mã giảm giá'} onClose={() => setForm(null)} onSave={save} saving={saving}
          canSave={!!form?.code.trim() && Number(form.discountValue) > 0 && datesOk} extra={form?.id ? <Button title="Xóa" variant="danger" onPress={() => void remove()} /> : null}>
          {form ? (
            <View style={{ gap: 12 }}>
              <Field label="Mã" value={form.code} onChangeText={(v) => set('code', v.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} autoCapitalize="characters" maxLength={40} />
              <Field label="Mô tả cho khách" value={form.description} onChangeText={(v) => set('description', v)} placeholder="Mô tả ngắn cho khách" maxLength={200} />
              <Segmented value={form.discountType} onChange={(v) => set('discountType', v)} options={[{ value: 'PERCENT', label: 'Giảm %' }, { value: 'AMOUNT', label: 'Giảm tiền' }]} />
              <Field label={form.discountType === 'PERCENT' ? 'Phần trăm (≤ 100)' : 'Số tiền giảm (đ)'} value={form.discountValue}
                onChangeText={(v) => set('discountValue', v.replace(/\D/g, ''))} keyboardType="numeric" />
              {form.discountType === 'PERCENT' ? (
                <Field label="Giảm tối đa (đ, bỏ trống = không giới hạn)" value={form.maxDiscount} onChangeText={(v) => set('maxDiscount', v.replace(/\D/g, ''))} keyboardType="numeric" />
              ) : null}
              <Field label="Đơn tối thiểu (đ)" value={form.minOrder} onChangeText={(v) => set('minOrder', v.replace(/\D/g, ''))} keyboardType="numeric" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Bắt đầu" value={form.startAt} onChangeText={(v) => set('startAt', v)} mask="date" placeholder="yyyy-mm-dd" /></View>
                <View style={{ flex: 1 }}><Field label="Kết thúc" value={form.endAt} onChangeText={(v) => set('endAt', v)} mask="date" placeholder="yyyy-mm-dd" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Tổng lượt dùng" value={form.usageLimit} onChangeText={(v) => set('usageLimit', v.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Không giới hạn" /></View>
                <View style={{ flex: 1 }}><Field label="Lượt / khách" value={form.perUserLimit} onChangeText={(v) => set('perUserLimit', v.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Không giới hạn" /></View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt size={14} style={{ flex: 1 }}>Đang áp dụng</Txt>
                <Toggle value={form.active} onChange={(v) => set('active', v)} label="Đang áp dụng" />
              </View>
            </View>
          ) : null}
        </EditorPanel>} />
    </Page>
  );
}

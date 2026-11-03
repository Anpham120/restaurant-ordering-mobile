import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { Txt } from '@/components/txt';
import { Badge, Card, Chip, Empty, ErrorBox, Field, FoodImage, Loading, SearchBox, Segmented, Toggle } from '@/components/ui';
import { api, errorMessage, type Category, type MenuItem, type Promotion, type PromotionInput, type PromotionTarget, type Voucher } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { dateTime, fullDateTime, time } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

interface Form {
  id?: number; title: string; subtitle: string; imageUrl: string; targetType: PromotionTarget; menuItemId: number | null; categoryId: number | null;
  voucherId: number | null; startAt: string; endAt: string; sortOrder: string; active: boolean;
}
interface Refs { items: MenuItem[]; categories: Category[]; vouchers: Voucher[] }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toInput = (s: string | null) => (s ? s.slice(0, 10) : '');
const TARGETS: { value: PromotionTarget; label: string }[] = [
  { value: 'NONE', label: 'Không' }, { value: 'MENU_ITEM', label: 'Món' }, { value: 'CATEGORY', label: 'Danh mục' }, { value: 'VOUCHER', label: 'Mã giảm' },
];

function targetText(p: Promotion): string {
  switch (p.targetType) {
    case 'MENU_ITEM': return `Mở món ${p.menuItemName ?? ''}`;
    case 'CATEGORY': return `Mở danh mục ${p.categoryName ?? ''}`;
    case 'VOUCHER': return `Mở mã giảm giá ${p.voucherCode ?? ''}`;
    default: return 'Chỉ hiển thị';
  }
}

export default function AdminPromotions() {
  const toast = useToast();
  const list = useLoad<Promotion[]>(() => api.adminPromotions());
  const refs = useLoad<Refs>(async () => {
    const [items, categories, vouchers] = await Promise.all([api.adminItems(), api.adminCategories(), api.adminVouchers()]);
    return { items: items.filter((m) => m.active), categories, vouchers: vouchers.filter((v) => v.active) };
  });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (p: Promotion) => setForm({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', imageUrl: p.imageUrl, targetType: p.targetType,
    menuItemId: p.menuItemId, categoryId: p.categoryId, voucherId: p.voucherId, startAt: toInput(p.startAt), endAt: toInput(p.endAt),
    sortOrder: String(p.sortOrder), active: p.active });
  const create = () => setForm({ title: '', subtitle: '', imageUrl: '', targetType: 'NONE', menuItemId: null, categoryId: null, voucherId: null,
    startAt: '', endAt: '', sortOrder: String((list.data?.length ?? 0) + 1), active: true });

  const urlOk = !!form && /^https?:\/\/.+/.test(form.imageUrl.trim());
  const datesOk = !!form && (!form.startAt || DATE.test(form.startAt)) && (!form.endAt || DATE.test(form.endAt));
  const targetOk = !!form && (form.targetType === 'NONE' || (form.targetType === 'MENU_ITEM' && !!form.menuItemId)
    || (form.targetType === 'CATEGORY' && !!form.categoryId) || (form.targetType === 'VOUCHER' && !!form.voucherId));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const body: PromotionInput = {
      title: form.title.trim(), subtitle: form.subtitle.trim() || null, imageUrl: form.imageUrl.trim(), targetType: form.targetType,
      menuItemId: form.targetType === 'MENU_ITEM' ? form.menuItemId : null, categoryId: form.targetType === 'CATEGORY' ? form.categoryId : null,
      voucherId: form.targetType === 'VOUCHER' ? form.voucherId : null,
      startAt: form.startAt ? `${form.startAt}T00:00:00` : null, endAt: form.endAt ? `${form.endAt}T23:59:59` : null,
      sortOrder: Number(form.sortOrder) || 0, active: form.active,
    };
    try {
      if (form.id) await api.updatePromotion(form.id, body); else await api.createPromotion(body);
      setForm(null);
      await list.reload();
      toast.show('Đã lưu chương trình', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const announce = async (p: Promotion) => {
    if (!(await confirmAction(`Gửi thông báo "${p.title}" tới khách hàng đã đồng ý nhận khuyến mãi? Mỗi chương trình chỉ gửi được một lần; trong giờ yên lặng thông báo sẽ được hẹn gửi sau.`, 'Gửi thông báo'))) return;
    setSending(p.id);
    try {
      const r = await api.announcePromotion(p.id);
      toast.show(r.message, r.scheduledAt ? 'info' : 'success');
      await list.reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSending(null); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa chương trình "${form.title}"?`, 'Xóa'))) return;
    try { await api.deletePromotion(form.id); setForm(null); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const r = refs.data;
  const needle = q.trim().toLowerCase();

  return (
    <Page title="Chương trình quảng bá" subtitle="Banner ở trang chủ app – bấm vào dẫn tới món, danh mục hoặc mã giảm giá"
      actions={<Button title="Tạo chương trình" icon="add" onPress={create} />}>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <WithEditor
        list={list.loading && !list.data ? <Loading /> : (list.data ?? []).length === 0 ? <Card><Empty icon="megaphone-outline" title="Chưa có chương trình nào" /></Card> : (
          <View style={{ gap: 12 }}>
            {(list.data ?? []).map((p) => (
              <View key={p.id} style={[styles.card, shadow, form?.id === p.id && { borderColor: colors.primary }]}>
                <FoodImage uri={p.imageUrl} style={styles.thumb} />
                <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <Txt weight="bold" size={16}>{p.title}</Txt>
                    <Badge label={p.live ? 'Đang hiển thị' : p.active ? 'Ngoài thời gian' : 'Đã tắt'}
                      bg={p.live ? colors.successSoft : colors.neutralSoft} fg={p.live ? colors.success : colors.neutralText} />
                    {p.notified || p.announcedAt ? <Badge label="Đã gửi" bg={colors.infoSoft} fg={colors.info} />
                      : p.announceAt ? <Badge label={`Hẹn gửi ${time(p.announceAt)} ${dateTime(p.announceAt).slice(0, 5)}`} bg={colors.warningSoft} fg={colors.warningText} /> : null}
                  </View>
                  {p.subtitle ? <Txt size={13} color={colors.textSoft} numberOfLines={2}>{p.subtitle}</Txt> : null}
                  <Txt size={12} color={colors.muted}>
                    {targetText(p)}{p.startAt ? ` · từ ${fullDateTime(p.startAt).slice(0, 10)}` : ''}{p.endAt ? ` · đến ${fullDateTime(p.endAt).slice(0, 10)}` : ''}
                  </Txt>
                </View>
                <View style={styles.actions}>
                  {p.notified || p.announcedAt || p.announceAt ? null : (
                    <Button title="Gửi thông báo" size="sm" variant="soft" icon="megaphone-outline"
                      disabled={!p.live} loading={sending === p.id} onPress={() => void announce(p)} />
                  )}
                  <Button title="Sửa" size="sm" variant="secondary" onPress={() => edit(p)} />
                </View>
              </View>
            ))}
          </View>
        )}
        editor={<EditorPanel open={!!form} title={form?.id ? 'Sửa chương trình' : 'Tạo chương trình'} onClose={() => setForm(null)} onSave={save} saving={saving}
          canSave={!!form?.title.trim() && urlOk && datesOk && targetOk} extra={form?.id ? <Button title="Xóa" variant="danger" onPress={() => void remove()} /> : null}>
          {form ? (
            <View style={{ gap: 12 }}>
              <View style={styles.preview}>
                <View style={{ flex: 1, padding: 14, gap: 4, justifyContent: 'center' }}>
                  <Txt weight="bold" size={11} color={colors.white} style={{ opacity: 0.9, letterSpacing: 0.5 }}>XEM TRƯỚC BANNER</Txt>
                  <Txt weight="extrabold" size={17} color={colors.white} numberOfLines={2}>{form.title || 'Tiêu đề chương trình'}</Txt>
                  {form.subtitle ? <Txt size={12} color={colors.white} numberOfLines={2}>{form.subtitle}</Txt> : null}
                </View>
                <FoodImage uri={urlOk ? form.imageUrl.trim() : null} style={{ width: 110 }} rounded={0} />
              </View>
              <Field label="Tiêu đề" value={form.title} onChangeText={(v) => set('title', v)} maxLength={120} />
              <Field label="Mô tả ngắn" value={form.subtitle} onChangeText={(v) => set('subtitle', v)} maxLength={300} />
              <Field label="Link ảnh" value={form.imageUrl} onChangeText={(v) => set('imageUrl', v)} autoCapitalize="none" placeholder="https://…"
                error={!form.imageUrl || urlOk ? null : 'Phải bắt đầu bằng http:// hoặc https://'} />
              <View style={{ gap: 6 }}>
                <Txt weight="semibold" size={14}>Bấm vào banner sẽ mở</Txt>
                <Segmented value={form.targetType} onChange={(v) => set('targetType', v)} options={TARGETS} />
              </View>
              {!r && form.targetType !== 'NONE' ? <Loading /> : null}
              {r && form.targetType === 'MENU_ITEM' ? (
                <View style={{ gap: 8 }}>
                  <SearchBox value={q} onChangeText={setQ} placeholder="Tìm món…" accessibilityLabel="Tìm món" />
                  <View style={styles.chips}>
                    {r.items.filter((m) => !needle || m.name.toLowerCase().includes(needle)).slice(0, 24).map((m) => (
                      <Chip key={m.id} label={m.name} active={form.menuItemId === m.id} onPress={() => set('menuItemId', m.id)} />
                    ))}
                  </View>
                </View>
              ) : null}
              {r && form.targetType === 'CATEGORY' ? (
                <View style={styles.chips}>
                  {r.categories.map((c) => <Chip key={c.id} label={c.name} active={form.categoryId === c.id} onPress={() => set('categoryId', c.id)} />)}
                </View>
              ) : null}
              {r && form.targetType === 'VOUCHER' ? (
                r.vouchers.length ? (
                  <View style={styles.chips}>
                    {r.vouchers.map((v) => <Chip key={v.id} label={v.code} active={form.voucherId === v.id} onPress={() => set('voucherId', v.id)} />)}
                  </View>
                ) : <Txt size={13} color={colors.warningText}>Chưa có mã giảm giá nào đang áp dụng.</Txt>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Bắt đầu" value={form.startAt} onChangeText={(v) => set('startAt', v)} mask="date" placeholder="yyyy-mm-dd" /></View>
                <View style={{ flex: 1 }}><Field label="Kết thúc" value={form.endAt} onChangeText={(v) => set('endAt', v)} mask="date" placeholder="yyyy-mm-dd" /></View>
              </View>
              {!datesOk ? <Txt size={12} color={colors.danger}>Ngày theo định dạng yyyy-mm-dd</Txt> : null}
              <Field label="Thứ tự hiển thị" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v.replace(/\D/g, ''))} keyboardType="numeric" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt size={14} style={{ flex: 1 }}>Đang hiển thị</Txt>
                <Toggle value={form.active} onChange={(v) => set('active', v)} label="Đang hiển thị" />
              </View>
            </View>
          ) : null}
        </EditorPanel>} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderWidth: 1.5, borderColor: 'transparent' },
  thumb: { width: 150, height: 84 },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  preview: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.primary, flexDirection: 'row', minHeight: 110 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

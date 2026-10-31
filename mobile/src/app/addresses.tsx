import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/modal';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Badge, Card, Empty, ErrorBox, Field, Loading } from '@/components/ui';
import { api, errorMessage, type Address, type AddressInput, type Zone } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Form = AddressInput & { id?: number };

export default function AddressesScreen() {
  const { user } = useSession();
  const toast = useToast();
  const list = useLoad<Address[]>(() => api.addresses());
  const zones = useLoad<Zone[]>(() => api.zones());
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  if (!user) return <Redirect href="/login" />;

  const openNew = () => setForm({
    zoneId: zones.data?.[0]?.id ?? 0, label: (list.data?.length ?? 0) === 0 ? 'Nhà riêng' : '', recipientName: user.fullName,
    recipientPhone: user.phone, street: '', note: '', makeDefault: (list.data?.length ?? 0) === 0,
  });
  const openEdit = (a: Address) => setForm({ id: a.id, zoneId: a.zoneId, label: a.label, recipientName: a.recipientName, recipientPhone: a.recipientPhone,
    street: a.street, note: a.note ?? '', makeDefault: a.isDefault });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body: AddressInput = { ...form, note: form.note?.trim() || null };
      if (form.id) await api.updateAddress(form.id, body); else await api.addAddress(body);
      setForm(null);
      toast.show('Đã lưu địa chỉ', 'success');
      await list.reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const remove = async (a: Address) => {
    if (!(await confirmAction(`Xóa địa chỉ "${a.label}"?`, 'Xóa'))) return;
    try { await api.deleteAddress(a.id); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const makeDefault = async (a: Address) => {
    try { await api.defaultAddress(a.id); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <PhoneFrame>
      <TopBar title="Sổ địa chỉ" />
      {list.loading && !list.data ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          {(list.data ?? []).length === 0 ? <Empty icon="location-outline" title="Chưa có địa chỉ nào" text="Thêm địa chỉ để cửa hàng giao món tới bạn." /> : null}
          {(list.data ?? []).map((a) => (
            <Card key={a.id} style={{ gap: 8 }}>
              <View style={styles.rowBetween}>
                <View style={styles.rowGap}>
                  <Ionicons name={a.label.toLowerCase().includes('công ty') ? 'business-outline' : 'home-outline'} size={18} color={colors.primary} />
                  <Txt weight="extrabold" size={15}>{a.label}</Txt>
                  {a.isDefault ? <Badge label="Mặc định" bg={colors.primarySoft} fg={colors.primaryText} /> : null}
                </View>
                <Pressable accessibilityRole="button" onPress={() => openEdit(a)} hitSlop={8}><Txt weight="semibold" size={14} color={colors.primary}>Sửa</Txt></Pressable>
              </View>
              <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }}>{a.recipientName} · {a.recipientPhone}{'\n'}{a.street}, {a.zoneName}</Txt>
              {a.note ? <Txt size={13} color={colors.muted}>Ghi chú: {a.note}</Txt> : null}
              <Txt size={13} color={a.zoneActive ? colors.muted : colors.danger}>
                {a.zoneActive ? `Phí giao ${money(a.deliveryFee)} · khoảng ${a.estimatedMinutes} phút` : 'Cửa hàng tạm ngưng giao tới khu vực này'}
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!a.isDefault ? <Button title="Đặt làm mặc định" size="sm" variant="soft" onPress={() => void makeDefault(a)} style={{ flex: 1 }} /> : null}
                <Button title="Xóa" size="sm" variant="danger" onPress={() => void remove(a)} />
              </View>
            </Card>
          ))}
          <Button title="Thêm địa chỉ mới" icon="add" onPress={openNew} disabled={!zones.data?.length} />
        </ScrollView>
      )}

      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}
        footer={<Button title="Lưu địa chỉ" onPress={save} loading={saving}
          disabled={!form || !form.label.trim() || !form.street.trim() || !form.recipientName.trim() || !form.recipientPhone.trim() || !form.zoneId} />}>
        {form ? (
          <>
            <Field label="Tên gợi nhớ" value={form.label} onChangeText={(v) => set('label', v)} placeholder="Nhà riêng, Công ty…" maxLength={40} />
            <Field label="Người nhận" value={form.recipientName} onChangeText={(v) => set('recipientName', v)} maxLength={100} />
            <Field label="Số điện thoại" value={form.recipientPhone} onChangeText={(v) => set('recipientPhone', v.replace(/[^0-9]/g, ''))} keyboardType="phone-pad" maxLength={11} />
            <Field label="Số nhà, tên đường, phường" value={form.street} onChangeText={(v) => set('street', v)} placeholder="12 Nguyễn Huệ, P. Bến Nghé" maxLength={200} />
            <View style={{ gap: 6 }}>
              <Txt weight="semibold" size={14}>Quận / khu vực</Txt>
              <View style={styles.zones}>
                {(zones.data ?? []).map((z) => (
                  <Pressable key={z.id} accessibilityRole="radio" accessibilityState={{ checked: form.zoneId === z.id }} onPress={() => set('zoneId', z.id)}
                    style={[styles.zone, form.zoneId === z.id && styles.zoneOn]}>
                    <Txt weight="semibold" size={13} color={form.zoneId === z.id ? colors.white : colors.textSoft}>{z.name}</Txt>
                    <Txt size={11} color={form.zoneId === z.id ? colors.white : colors.muted}>{money(z.deliveryFee)}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
            <Field label="Ghi chú cho người giao (không bắt buộc)" value={form.note ?? ''} onChangeText={(v) => set('note', v)} placeholder="Gửi bảo vệ, gọi trước khi tới…" maxLength={200} />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.makeDefault }} onPress={() => set('makeDefault', !form.makeDefault)} style={styles.rowGap}>
              <Ionicons name={form.makeDefault ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Txt size={14}>Đặt làm địa chỉ mặc định</Txt>
            </Pressable>
          </>
        ) : null}
      </Sheet>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zone: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  zoneOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});

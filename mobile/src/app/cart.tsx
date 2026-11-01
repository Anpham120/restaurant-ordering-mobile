import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Sheet } from '@/components/modal';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, Field, FoodImage, Line, Loading, Notice, Stepper } from '@/components/ui';
import { api, errorMessage, type Address, type CheckoutPreview, type PaymentMethod } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { money, optionText } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useCartChange } from '@/lib/use-cart-change';

export default function CartScreen() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  return (
    <PhoneFrame>
      <TopBar title="Giỏ hàng" />
      <Checkout />
    </PhoneFrame>
  );
}

function Checkout() {
  const insets = useSafeAreaInsets();
  const { cart, refresh, replace, voucherHint, setVoucherHint } = useCart();
  const { setLine } = useCartChange();
  const toast = useToast();
  const addresses = useLoad<Address[]>(() => api.addresses());
  const [addressId, setAddressId] = useState<number | null>(null);
  const [voucherInput, setVoucherInput] = useState(voucherHint ?? '');
  const [voucher, setVoucher] = useState<string | null>(voucherHint);
  const [method, setMethod] = useState<PaymentMethod>('COD');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [picking, setPicking] = useState(false);
  const [placing, setPlacing] = useState(false);

  const list = addresses.data ?? [];
  const chosen = list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0] ?? null;

  useEffect(() => { void refresh(); }, [refresh]);
  // the hint from a promotion banner is used once
  useEffect(() => { if (voucherHint) setVoucherHint(null); }, [voucherHint, setVoucherHint]);

  // recompute totals whenever the cart, address or voucher changes
  const cartKey = cart.lines.map((l) => `${l.lineId}:${l.quantity}`).join(',');
  useEffect(() => {
    let alive = true;
    if (!chosen || cart.lines.length === 0) return undefined;
    api.preview({ addressId: chosen.id, voucherCode: voucher, paymentMethod: method }).then((p) => { if (alive) setPreview(p); })
      .catch((e: unknown) => { if (alive) toast.show(errorMessage(e), 'error'); });
    return () => { alive = false; };
  }, [chosen, voucher, method, cartKey, cart.lines.length, toast]);

  const applyVoucher = () => setVoucher(voucherInput.trim() ? voucherInput.trim().toUpperCase() : null);

  const place = async () => {
    if (!chosen) return;
    setPlacing(true);
    try {
      const order = await api.placeOrder({ addressId: chosen.id, voucherCode: voucher, note: note.trim() || null, paymentMethod: method });
      replace({ lines: [], itemCount: 0, subtotal: 0, hasProblems: false });
      if (order.status === 'AWAITING_PAYMENT') {
        toast.show('Đã tạo đơn, vui lòng chuyển khoản để hoàn tất', 'success');
        router.replace(`/pay/${order.id}`);
      } else {
        toast.show('Đặt hàng thành công!', 'success');
        router.replace(`/order/${order.id}`);
      }
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (cart.lines.length === 0) {
    return <Empty icon="bag-handle-outline" title="Giỏ hàng đang trống" text="Chọn vài món ngon rồi quay lại đây nhé."
      action={<Button title="Xem thực đơn" onPress={() => router.replace('/')} />} />;
  }
  if (addresses.loading && !addresses.data) return <Loading />;

  const p = preview && chosen && preview.address.id === chosen.id ? preview : null;
  const voucherOk = p && voucher && !p.voucherMessage;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {addresses.error ? <ErrorBox message={addresses.error} onRetry={addresses.reload} /> : null}

        <View style={[styles.card, shadow]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowGap}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Txt weight="extrabold" size={15}>{chosen ? `Giao đến · ${chosen.label}` : 'Địa chỉ giao hàng'}</Txt>
            </View>
            <Pressable accessibilityRole="button" onPress={() => (list.length ? setPicking(true) : router.push('/addresses'))} hitSlop={8}>
              <Txt weight="semibold" size={14} color={colors.primary}>{list.length ? 'Thay đổi' : 'Thêm địa chỉ'}</Txt>
            </Pressable>
          </View>
          {chosen ? (
            <Txt size={14} color={colors.textSoft} style={{ lineHeight: 21 }}>
              <Txt weight="bold" size={14}>{chosen.recipientName} · {chosen.recipientPhone}{'\n'}</Txt>
              {chosen.street}, {chosen.zoneName}
            </Txt>
          ) : <Txt size={14} color={colors.muted}>Bạn chưa có địa chỉ nào. Thêm địa chỉ để đặt hàng.</Txt>}
          {chosen ? <Notice icon="time-outline" tone="success" text={`Giao dự kiến ${chosen.estimatedMinutes}–${chosen.estimatedMinutes + 10} phút`} /> : null}
        </View>

        <View style={[styles.card, shadow, { paddingVertical: 6 }]}>
          {cart.lines.map((l) => (
            <View key={l.lineId} style={styles.line}>
              <FoodImage uri={l.imageUrl} style={[styles.thumb, !l.orderable && { opacity: 0.45 }]} />
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Txt weight="bold" size={15} numberOfLines={1}>{l.name}</Txt>
                {l.options.length ? <Txt size={13} color={colors.textSoft} numberOfLines={2}>{optionText(l.options)}</Txt> : null}
                {l.problem ? <Txt weight="semibold" size={13} color={colors.danger}>{l.problem}</Txt>
                  : l.note ? <Txt size={13} color={colors.muted} numberOfLines={1}>{l.note}</Txt> : null}
                <Txt weight="bold" size={14} color={colors.primary}>{money(l.lineTotal)}</Txt>
              </View>
              {l.orderable ? <Stepper value={l.quantity} onChange={(v) => void setLine(l.lineId, v, l.note)} outline size={32} />
                : <Button title="Bỏ" size="sm" variant="danger" onPress={() => void setLine(l.lineId, 0)} />}
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.more}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Txt weight="semibold" size={14} color={colors.primary}>Thêm món khác</Txt>
          </Pressable>
        </View>

        <View style={[styles.card, shadow]}>
          <Txt weight="extrabold" size={15}>Mã giảm giá</Txt>
          {voucherOk ? (
            <View style={styles.voucherOn}>
              <Txt size={14} style={{ flex: 1 }}><Txt weight="bold" size={14} color={colors.primaryText}>{p.voucherCode}</Txt> · giảm {money(p.discount)}</Txt>
              <Pressable accessibilityRole="button" onPress={() => { setVoucher(null); setVoucherInput(''); }} hitSlop={8}>
                <Txt weight="semibold" size={14} color={colors.muted}>Bỏ</Txt>
              </Pressable>
            </View>
          ) : (
            <View style={styles.rowGap}>
              <TextInput value={voucherInput} onChangeText={setVoucherInput} placeholder="Nhập mã, ví dụ WELCOME10" placeholderTextColor={colors.faint}
                autoCapitalize="characters" accessibilityLabel="Mã giảm giá" style={styles.voucherInput} onSubmitEditing={applyVoucher} />
              <Button title="Áp dụng" size="sm" variant="soft" onPress={applyVoucher} disabled={!voucherInput.trim()} style={{ height: 46 }} />
            </View>
          )}
          {p?.voucherMessage ? (
            <View style={styles.rowBetween}>
              <Txt size={13} color={colors.danger} style={{ flex: 1 }}>{p.voucherMessage}</Txt>
              <Pressable accessibilityRole="button" onPress={() => { setVoucher(null); setVoucherInput(''); }} hitSlop={8}>
                <Txt weight="semibold" size={13} color={colors.primary}>Bỏ mã</Txt>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, shadow]}>
          <Field label="Ghi chú cho cửa hàng" value={note} onChangeText={setNote} placeholder="Ví dụ: gọi trước khi giao" maxLength={300} />
        </View>

        <View style={[styles.card, shadow]}>
          <Txt weight="extrabold" size={15}>Thanh toán</Txt>
          <PayOption on={method === 'COD'} onPress={() => setMethod('COD')} icon="cash-outline" iconColor={colors.success}
            title="Tiền mặt khi nhận hàng (COD)" />
          {(p?.paymentMethods ?? []).includes('BANK_TRANSFER') ? (
            <PayOption on={method === 'BANK_TRANSFER'} onPress={() => setMethod('BANK_TRANSFER')} icon="qr-code-outline" iconColor={colors.info}
              title="Chuyển khoản VietQR" sub="Quét mã bằng app ngân hàng · tự xác nhận sau vài giây" />
          ) : null}
          <View style={styles.summary}>
            <Line label={`Tạm tính (${cart.itemCount} món)`} value={money(p?.subtotal ?? cart.subtotal)} />
            <Line label={`Phí giao hàng${chosen ? ` · ${chosen.zoneName}` : ''}`} value={p ? money(p.deliveryFee) : '—'} />
            {p && p.discount > 0 ? <Line label="Giảm giá" value={`−${money(p.discount)}`} valueColor={colors.success} /> : null}
          </View>
        </View>

        {p && p.problems.filter((x) => x !== p.voucherMessage).map((x) => <Notice key={x} icon="alert-circle" tone="danger" text={x} />)}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.rowBetween}>
          <Txt weight="semibold" size={15}>Tổng cộng</Txt>
          <Txt weight="extrabold" size={22} color={colors.primary}>{p ? money(p.total) : money(cart.subtotal)}</Txt>
        </View>
        <Button title={method === 'BANK_TRANSFER' ? 'Đặt hàng & thanh toán' : 'Đặt hàng'} size="lg" onPress={place} loading={placing} disabled={!p || !p.canPlace} />
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Chọn địa chỉ giao hàng"
        footer={<Button title="Quản lý sổ địa chỉ" variant="secondary" icon="create-outline" onPress={() => { setPicking(false); router.push('/addresses'); }} />}>
        {list.map((a) => (
          <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ checked: chosen?.id === a.id }}
            onPress={() => { setAddressId(a.id); setPicking(false); }} style={[styles.pick, chosen?.id === a.id && styles.pickOn]}>
            <Ionicons name={chosen?.id === a.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="bold" size={14}>{a.label}{a.isDefault ? ' · Mặc định' : ''}</Txt>
              <Txt size={13} color={colors.textSoft}>{a.recipientName} · {a.recipientPhone}</Txt>
              <Txt size={13} color={colors.muted}>{a.street}, {a.zoneName} · phí {money(a.deliveryFee)}</Txt>
            </View>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

function PayOption({ on, onPress, icon, iconColor, title, sub }: {
  on: boolean; onPress: () => void; icon: 'cash-outline' | 'qr-code-outline'; iconColor: string; title: string; sub?: string;
}) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.pay, on && styles.payOn]}>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Txt size={14} weight={on ? 'semibold' : 'regular'}>{title}</Txt>
        {sub ? <Txt size={12} color={colors.success}>{sub}</Txt> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pay: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  payOn: { borderColor: colors.primary, backgroundColor: '#FFF7F2' },
  content: { padding: 16, gap: 12, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 56, height: 56 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  voucherOn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF7F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  voucherInput: { flex: 1, height: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  summary: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, paddingHorizontal: 16, gap: 10 },
  pick: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12 },
  pickOn: { borderColor: colors.primary, backgroundColor: '#FFF7F2' },
});

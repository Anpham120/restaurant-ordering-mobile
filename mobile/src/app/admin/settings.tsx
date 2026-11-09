import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { SaveBlockers } from '@/components/editor';
import { Txt } from '@/components/txt';
import { LocationPicker } from '@/components/location-picker';
import { Card, Chip, ErrorBox, Field, Loading, Notice, Toggle } from '@/components/ui';
import { api, errorMessage, type Store } from '@/lib/api';
import { BANKS, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { problems } from '@/lib/validate';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AdminSettings() {
  const toast = useToast();
  const s = useLoad<Store>(() => api.settings());
  const [f, setF] = useState<{
    storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string; minOrderAmount: string; acceptingOrders: boolean;
    bankCode: string; bankAccount: string; bankHolder: string; timeout: string;
    latitude: number | null; longitude: number | null;
    baseKm: string; baseFee: string; extraFee: string; maxKm: string; prepMinutes: string; minutesPerKm: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s.data && !f) {
      const d = s.data;
      // seed the form once from the loaded settings
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setF({ storeName: d.storeName, hotline: d.hotline, storeAddress: d.storeAddress, openTime: d.openTime.slice(0, 5), closeTime: d.closeTime.slice(0, 5),
        minOrderAmount: String(d.minOrderAmount), acceptingOrders: d.acceptingOrders, bankCode: d.bankCode ?? '', bankAccount: d.bankAccount ?? '',
        bankHolder: d.bankHolder ?? '', timeout: String(d.transferTimeoutMinutes),
        latitude: d.latitude, longitude: d.longitude, baseKm: String(d.deliveryBaseKm), baseFee: String(d.deliveryBaseFee),
        extraFee: String(d.deliveryExtraFeePerKm), maxKm: String(d.deliveryMaxKm), prepMinutes: String(d.prepMinutes), minutesPerKm: String(d.minutesPerKm) });
    }
  }, [s.data, f]);

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      s.setData(await api.updateSettings({ storeName: f.storeName.trim(), hotline: f.hotline.trim(), storeAddress: f.storeAddress.trim(),
        openTime: `${f.openTime}:00`, closeTime: f.closeTime === '23:59' ? '23:59:59' : `${f.closeTime}:00`, minOrderAmount: Number(f.minOrderAmount) || 0, acceptingOrders: f.acceptingOrders,
        bankCode: f.bankCode || null, bankAccount: f.bankAccount.trim() || null, bankHolder: f.bankHolder.trim() || null, transferTimeoutMinutes: Number(f.timeout) || 15,
        latitude: f.latitude, longitude: f.longitude, deliveryBaseKm: Number(f.baseKm), deliveryBaseFee: Number(f.baseFee), deliveryExtraFeePerKm: Number(f.extraFee),
        deliveryMaxKm: Number(f.maxKm), prepMinutes: Number(f.prepMinutes), minutesPerKm: Number(f.minutesPerKm) }));
      toast.show('Đã lưu cài đặt cửa hàng', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };

  const bankOk = !!f && (!f.bankCode && !f.bankAccount.trim() || (!!f.bankCode && /^[A-Za-z0-9]{4,19}$/.test(f.bankAccount.trim())));
  const timeoutOk = !!f && Number(f.timeout) >= 5 && Number(f.timeout) <= 120;
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
  const deliveryOk = !!f && num(f.baseKm) >= 0.5 && num(f.maxKm) >= num(f.baseKm) && num(f.maxKm) <= 99 && num(f.baseFee) >= 0 && num(f.extraFee) >= 0
    && num(f.prepMinutes) >= 0 && num(f.prepMinutes) <= 240 && num(f.minutesPerKm) >= 1 && num(f.minutesPerKm) <= 30 && f.latitude != null;
  /** Same rule as the backend: base fee inside the base radius, then per started km, rounded up to 1,000đ. */
  const feeAt = (d: number) => {
    if (!f) return 0;
    const raw = num(f.baseFee) + (d > num(f.baseKm) ? Math.ceil(d - num(f.baseKm)) * num(f.extraFee) : 0);
    return Math.ceil(raw / 1000) * 1000;
  };
  const blockers = !f ? [] : problems(
    !f.storeName.trim() && 'Nhập tên cửa hàng',
    !/^\d{8,15}$/.test(f.hotline) && 'Hotline gồm 8–15 chữ số',
    !f.storeAddress.trim() && 'Nhập địa chỉ cửa hàng',
    !HM.test(f.openTime) && 'Giờ mở nhận đơn dạng HH:mm, ví dụ 07:00',
    !HM.test(f.closeTime) && 'Giờ ngừng nhận đơn dạng HH:mm, ví dụ 22:00',
    HM.test(f.openTime) && HM.test(f.closeTime) && f.closeTime <= f.openTime && 'Giờ ngừng nhận đơn phải sau giờ mở',
    !deliveryOk && 'Kiểm tra lại phần phí và phạm vi giao hàng',
    !bankOk && 'Chọn ngân hàng và nhập số tài khoản (4–19 chữ số/chữ)',
    !timeoutOk && 'Thời hạn chuyển khoản từ 5 đến 120 phút',
  );

  return (
    <Page title="Cài đặt cửa hàng">
      {s.error ? <ErrorBox message={s.error} onRetry={s.reload} /> : null}
      {!f ? <Loading /> : (
        <Card style={{ gap: 14, maxWidth: 640 }}>
          {s.data && !s.data.openNow ? <Notice icon="time-outline" text={`Hiện khách chưa đặt được: ${s.data.closedReason}`} /> : null}
          <Field label="Tên cửa hàng" value={f.storeName} onChangeText={(v) => setF({ ...f, storeName: v })} maxLength={100} />
          <Field label="Hotline" value={f.hotline} onChangeText={(v) => setF({ ...f, hotline: v.replace(/\D/g, '') })} keyboardType="phone-pad" maxLength={15} />
          <Field label="Địa chỉ cửa hàng" value={f.storeAddress} onChangeText={(v) => setF({ ...f, storeAddress: v })} maxLength={200} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Giờ mở nhận đơn" value={f.openTime} onChangeText={(v) => setF({ ...f, openTime: v })} mask="time" placeholder="07:00"
              error={HM.test(f.openTime) ? null : 'Định dạng HH:mm'} /></View>
            <View style={{ flex: 1 }}><Field label="Giờ ngừng nhận đơn" value={f.closeTime} onChangeText={(v) => setF({ ...f, closeTime: v })} mask="time" placeholder="22:00"
              error={HM.test(f.closeTime) ? (f.closeTime > f.openTime ? null : 'Phải sau giờ mở') : 'Định dạng HH:mm'} /></View>
          </View>
          <Field label="Giá trị đơn tối thiểu (đ, chưa tính phí giao)" value={f.minOrderAmount} onChangeText={(v) => setF({ ...f, minOrderAmount: v.replace(/\D/g, '') })} mask="money" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt size={14} style={{ flex: 1 }}>Đang nhận đơn (tắt để tạm ngưng, ví dụ khi quá tải)</Txt>
            <Toggle value={f.acceptingOrders} onChange={(v) => setF({ ...f, acceptingOrders: v })} label="Đang nhận đơn" />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14, gap: 12 }}>
            <Txt weight="extrabold" size={16}>Vị trí cửa hàng và phí giao hàng</Txt>
            <Txt size={13} color={colors.muted}>
              Phí giao tính theo quãng đường từ cửa hàng tới khách: một mức phí cơ bản cho bán kính đầu, vượt ra ngoài thì cộng thêm theo từng km, và xa hơn phạm vi tối đa thì không giao.
            </Txt>
            <LocationPicker title="Vị trí cửa hàng" showQuote={false} value={f.latitude != null && f.longitude != null ? { latitude: f.latitude, longitude: f.longitude } : null}
              hint="Tìm tên tòa nhà hoặc địa chỉ của cửa hàng, chọn đúng kết quả để đặt vị trí."
              onPick={(p, name) => setF((x) => (x ? { ...x, latitude: p.latitude, longitude: p.longitude, storeAddress: name ? name.slice(0, 200) : x.storeAddress } : x))} />
            {f.latitude != null && f.longitude != null ? (
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${f.latitude},${f.longitude}`)}>
                <Txt size={13} color={colors.primary} weight="semibold">Vị trí đang dùng: {f.latitude.toFixed(6)}, {f.longitude.toFixed(6)} · xem trên Google Maps</Txt>
              </Pressable>
            ) : <Txt size={13} color={colors.danger}>Chưa có vị trí cửa hàng, khách sẽ không đặt được hàng.</Txt>}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Bán kính phí cơ bản (km)" value={f.baseKm} onChangeText={(v) => setF({ ...f, baseKm: v.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad"
                error={num(f.baseKm) >= 0.5 ? null : 'Tối thiểu 0,5 km'} /></View>
              <View style={{ flex: 1 }}><Field label="Phí cơ bản (đ)" value={f.baseFee} onChangeText={(v) => setF({ ...f, baseFee: v.replace(/\D/g, '') })} mask="money"
                error={num(f.baseFee) >= 0 ? null : 'Nhập số tiền'} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Phụ phí mỗi km vượt (đ)" value={f.extraFee} onChangeText={(v) => setF({ ...f, extraFee: v.replace(/\D/g, '') })} mask="money"
                error={num(f.extraFee) >= 0 ? null : 'Nhập số tiền'} /></View>
              <View style={{ flex: 1 }}><Field label="Giao xa nhất (km)" value={f.maxKm} onChangeText={(v) => setF({ ...f, maxKm: v.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad"
                error={num(f.maxKm) >= num(f.baseKm) && num(f.maxKm) <= 99 ? null : 'Phải ≥ bán kính phí cơ bản'} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Chuẩn bị món (phút)" value={f.prepMinutes} onChangeText={(v) => setF({ ...f, prepMinutes: v.replace(/\D/g, '') })} keyboardType="numeric"
                error={num(f.prepMinutes) >= 0 && num(f.prepMinutes) <= 240 ? null : '0–240'} /></View>
              <View style={{ flex: 1 }}><Field label="Di chuyển (phút/km)" value={f.minutesPerKm} onChangeText={(v) => setF({ ...f, minutesPerKm: v.replace(/\D/g, '') })} keyboardType="numeric"
                error={num(f.minutesPerKm) >= 1 && num(f.minutesPerKm) <= 30 ? null : '1–30'} /></View>
            </View>
            {deliveryOk ? (
              <View style={{ backgroundColor: colors.input, borderRadius: 10, padding: 12, gap: 4 }}>
                <Txt weight="semibold" size={13}>Bảng phí khách sẽ thấy (đường đi ước tính)</Txt>
                {[2, num(f.baseKm), num(f.baseKm) + 1.5, (num(f.baseKm) + num(f.maxKm)) / 2, num(f.maxKm)].filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                  <Txt key={d} size={13} color={colors.textSoft}>
                    {d <= num(f.baseKm) ? `Đến ${d.toFixed(1).replace('.', ',')} km` : `Khoảng ${d.toFixed(1).replace('.', ',')} km`}: {money(feeAt(d))} · giao trong ~{num(f.prepMinutes) + Math.ceil(d * num(f.minutesPerKm))} phút
                  </Txt>
                ))}
                <Txt size={12} color={colors.muted}>Xa hơn {String(num(f.maxKm)).replace('.', ',')} km: cửa hàng không giao.</Txt>
              </View>
            ) : null}
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14, gap: 12 }}>
            <Txt weight="extrabold" size={16}>Nhận chuyển khoản (VietQR + SePay)</Txt>
            <Txt size={13} color={colors.muted}>Khách quét mã QR để chuyển khoản; SePay báo về hệ thống và đơn tự xác nhận. Bỏ trống ngân hàng và số tài khoản để chỉ nhận COD.</Txt>
            <View style={{ gap: 6 }}>
              <Txt weight="semibold" size={14}>Ngân hàng</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label="Không dùng" active={!f.bankCode} onPress={() => setF({ ...f, bankCode: '', bankAccount: '' })} />
                {BANKS.map((b) => <Chip key={b.code} label={b.name} active={f.bankCode === b.code} onPress={() => setF({ ...f, bankCode: b.code })} />)}
              </View>
            </View>
            <Field label="Số tài khoản nhận tiền" value={f.bankAccount} onChangeText={(v) => setF({ ...f, bankAccount: v.replace(/[^A-Za-z0-9]/g, '') })}
              maxLength={19} editable={!!f.bankCode} error={bankOk ? null : 'Chọn ngân hàng và nhập số tài khoản (4–19 chữ số/chữ)'} />
            <Field label="Tên chủ tài khoản (không dấu cũng được)" value={f.bankHolder} onChangeText={(v) => setF({ ...f, bankHolder: v })} maxLength={80} editable={!!f.bankCode} />
            <Field label="Thời hạn chuyển khoản (phút)" value={f.timeout} onChangeText={(v) => setF({ ...f, timeout: v.replace(/\D/g, '') })} keyboardType="numeric"
              error={timeoutOk ? null : 'Từ 5 đến 120 phút'} hint="Quá hạn chưa nhận tiền, đơn tự hủy" />
          </View>
          <SaveBlockers problems={blockers} />
          <Button title="Lưu cài đặt" onPress={save} loading={saving} disabled={blockers.length > 0} />
        </Card>
      )}
    </Page>
  );
}

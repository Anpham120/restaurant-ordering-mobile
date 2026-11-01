import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Card, Chip, ErrorBox, Field, Loading, Notice, Toggle } from '@/components/ui';
import { api, errorMessage, type Store } from '@/lib/api';
import { BANKS } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AdminSettings() {
  const toast = useToast();
  const s = useLoad<Store>(() => api.settings());
  const [f, setF] = useState<{
    storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string; minOrderAmount: string; acceptingOrders: boolean;
    bankCode: string; bankAccount: string; bankHolder: string; timeout: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s.data && !f) {
      const d = s.data;
      // seed the form once from the loaded settings
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setF({ storeName: d.storeName, hotline: d.hotline, storeAddress: d.storeAddress, openTime: d.openTime.slice(0, 5), closeTime: d.closeTime.slice(0, 5),
        minOrderAmount: String(d.minOrderAmount), acceptingOrders: d.acceptingOrders, bankCode: d.bankCode ?? '', bankAccount: d.bankAccount ?? '',
        bankHolder: d.bankHolder ?? '', timeout: String(d.transferTimeoutMinutes) });
    }
  }, [s.data, f]);

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      s.setData(await api.updateSettings({ storeName: f.storeName.trim(), hotline: f.hotline.trim(), storeAddress: f.storeAddress.trim(),
        openTime: `${f.openTime}:00`, closeTime: f.closeTime === '23:59' ? '23:59:59' : `${f.closeTime}:00`, minOrderAmount: Number(f.minOrderAmount) || 0, acceptingOrders: f.acceptingOrders,
        bankCode: f.bankCode || null, bankAccount: f.bankAccount.trim() || null, bankHolder: f.bankHolder.trim() || null, transferTimeoutMinutes: Number(f.timeout) || 15 }));
      toast.show('Đã lưu cài đặt cửa hàng', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };

  const bankOk = !!f && (!f.bankCode && !f.bankAccount.trim() || (!!f.bankCode && /^[A-Za-z0-9]{4,19}$/.test(f.bankAccount.trim())));
  const timeoutOk = !!f && Number(f.timeout) >= 5 && Number(f.timeout) <= 120;
  const valid = !!f && bankOk && timeoutOk && !!f.storeName.trim() && /^\d{8,15}$/.test(f.hotline) && !!f.storeAddress.trim() && HM.test(f.openTime) && HM.test(f.closeTime) && f.closeTime > f.openTime;

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
            <View style={{ flex: 1 }}><Field label="Giờ mở nhận đơn" value={f.openTime} onChangeText={(v) => setF({ ...f, openTime: v })} placeholder="07:00"
              error={HM.test(f.openTime) ? null : 'Định dạng HH:mm'} /></View>
            <View style={{ flex: 1 }}><Field label="Giờ ngừng nhận đơn" value={f.closeTime} onChangeText={(v) => setF({ ...f, closeTime: v })} placeholder="22:00"
              error={HM.test(f.closeTime) ? (f.closeTime > f.openTime ? null : 'Phải sau giờ mở') : 'Định dạng HH:mm'} /></View>
          </View>
          <Field label="Giá trị đơn tối thiểu (đ, chưa tính phí giao)" value={f.minOrderAmount} onChangeText={(v) => setF({ ...f, minOrderAmount: v.replace(/\D/g, '') })} keyboardType="numeric" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt size={14} style={{ flex: 1 }}>Đang nhận đơn (tắt để tạm ngưng, ví dụ khi quá tải)</Txt>
            <Toggle value={f.acceptingOrders} onChange={(v) => setF({ ...f, acceptingOrders: v })} label="Đang nhận đơn" />
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
          <Button title="Lưu cài đặt" onPress={save} loading={saving} disabled={!valid} />
        </Card>
      )}
    </Page>
  );
}

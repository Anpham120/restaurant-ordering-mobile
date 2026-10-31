import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, Field, Loading, Notice, Toggle } from '@/components/ui';
import { api, errorMessage, type Store } from '@/lib/api';
import { useLoad } from '@/lib/hooks';
import { useToast } from '@/lib/toast';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AdminSettings() {
  const toast = useToast();
  const s = useLoad<Store>(() => api.settings());
  const [f, setF] = useState<{ storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string; minOrderAmount: string; acceptingOrders: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s.data && !f) {
      const d = s.data;
      // seed the form once from the loaded settings
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setF({ storeName: d.storeName, hotline: d.hotline, storeAddress: d.storeAddress, openTime: d.openTime.slice(0, 5), closeTime: d.closeTime.slice(0, 5),
        minOrderAmount: String(d.minOrderAmount), acceptingOrders: d.acceptingOrders });
    }
  }, [s.data, f]);

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      s.setData(await api.updateSettings({ storeName: f.storeName.trim(), hotline: f.hotline.trim(), storeAddress: f.storeAddress.trim(),
        openTime: `${f.openTime}:00`, closeTime: f.closeTime === '23:59' ? '23:59:59' : `${f.closeTime}:00`, minOrderAmount: Number(f.minOrderAmount) || 0, acceptingOrders: f.acceptingOrders }));
      toast.show('Đã lưu cài đặt cửa hàng', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };

  const valid = !!f && !!f.storeName.trim() && /^\d{8,15}$/.test(f.hotline) && !!f.storeAddress.trim() && HM.test(f.openTime) && HM.test(f.closeTime) && f.closeTime > f.openTime;

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
          <Button title="Lưu cài đặt" onPress={save} loading={saving} disabled={!valid} />
        </Card>
      )}
    </Page>
  );
}

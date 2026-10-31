import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chips } from '@/components/chip';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, type DiscountType } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { money } from '@/lib/format';
import { usePoll } from '@/lib/use-poll';

export default function Vouchers() {
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('PERCENT');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [limit, setLimit] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll(() => api.vouchers(), 0);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };

  const create = () => run(async () => {
    const v = Number(value);
    if (!code.trim() || !Number.isFinite(v) || v <= 0) throw new Error('Nhập mã và giá trị giảm hợp lệ');
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error('Ngày hết hạn phải dạng YYYY-MM-DD');
    await api.createVoucher({
      code: code.trim().toUpperCase(), discountType: type, discountValue: v, minOrder: Number(minOrder) || 0,
      usageLimit: limit ? Number(limit) : null, endAt: endDate ? `${endDate}T23:59:59` : null,
    });
    setCode(''); setValue(''); setLimit(''); setEndDate('');
  });

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      <Card>
        <Title>Tạo voucher</Title>
        <Field label="Mã" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
        <Chips<DiscountType> options={[{ value: 'PERCENT', label: 'Giảm %' }, { value: 'AMOUNT', label: 'Giảm tiền' }]} value={type} onChange={setType} />
        <Field label={type === 'PERCENT' ? 'Phần trăm (≤ 100)' : 'Số tiền (đ)'} value={value} onChangeText={setValue} keyboardType="numeric" />
        <Field label="Đơn tối thiểu (đ)" value={minOrder} onChangeText={setMinOrder} keyboardType="numeric" />
        <Field label="Giới hạn lượt dùng (bỏ trống = không giới hạn)" value={limit} onChangeText={setLimit} keyboardType="numeric" />
        <Field label="Hết hạn (YYYY-MM-DD, bỏ trống = không hết hạn)" value={endDate} onChangeText={setEndDate} autoCapitalize="none" />
        <Button small title="Tạo voucher" onPress={create} />
      </Card>
      {data?.map((v) => (
        <Card key={v.id}>
          <Text style={{ fontSize: 17, fontWeight: '700' }}>{v.code}</Text>
          <Muted>
            {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${money(v.discountValue)}`} · đơn từ {money(v.minOrder)}
            {v.usageLimit != null ? ` · tối đa ${v.usageLimit} lượt` : ''}{v.endAt ? ` · hết hạn ${v.endAt.slice(0, 10)}` : ''}
          </Muted>
          <Row>
            <Button small variant="danger" title="Xóa" onPress={async () => { if (await confirmAction(`Xóa voucher ${v.code}?`)) await run(() => api.deleteVoucher(v.id)); }} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

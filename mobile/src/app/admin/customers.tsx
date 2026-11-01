import { useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { useResetPassword } from '@/components/reset-password';
import { Txt } from '@/components/txt';
import { Badge, Card, Empty, ErrorBox, Loading, SearchBox } from '@/components/ui';
import { api, errorMessage, type CustomerSummary, type Page as P } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { dateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function AdminCustomers() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const list = useLoad<P<CustomerSummary>>(() => api.customers(q.trim(), page, 30), [q, page]);
  const pw = useResetPassword();

  const toggle = async (c: CustomerSummary) => {
    if (!(await confirmAction(`${c.active ? 'Khóa' : 'Mở khóa'} tài khoản ${c.fullName}?`, c.active ? 'Khóa' : 'Mở khóa'))) return;
    try { await api.setUserActive(c.id, !c.active); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const data = list.data;
  return (
    <Page title="Khách hàng" subtitle={data ? `${data.totalElements} tài khoản` : undefined}
      actions={<View style={{ width: 260 }}><SearchBox value={q} onChangeText={(v) => { setQ(v); setPage(0); }} placeholder="Tên hoặc số điện thoại…" accessibilityLabel="Tìm khách hàng" /></View>}>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <Card padded={false}>
        {list.loading && !data ? <Loading /> : (data?.content ?? []).length === 0 ? <Empty title="Không có khách hàng" /> : (data?.content ?? []).map((c, i) => (
          <ListRow key={c.id} first={i === 0} dim={!c.active}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Txt weight="bold" size={15}>{c.fullName}</Txt>
              <Txt size={13} color={colors.muted}>{c.phone}{c.email ? ` · ${c.email}` : ''}</Txt>
            </View>
            <Txt size={13} color={colors.textSoft} style={{ width: 90 }}>{c.orderCount} đơn</Txt>
            <Txt size={13} color={colors.muted} style={{ width: 130 }}>Từ {dateTime(c.createdAt)}</Txt>
            {!c.active ? <Badge label="Đã khóa" bg={colors.dangerSoft} fg={colors.danger} /> : null}
            <Button title="Đặt lại mật khẩu" size="sm" variant="secondary" icon="key-outline" loading={pw.busy === c.id} onPress={() => void pw.reset(c)} />
            <Button title={c.active ? 'Khóa' : 'Mở khóa'} size="sm" variant={c.active ? 'danger' : 'secondary'} onPress={() => void toggle(c)} />
          </ListRow>
        ))}
      </Card>
      {data && data.totalPages > 1 ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Button title="Trang trước" size="sm" variant="secondary" disabled={page === 0} onPress={() => setPage(page - 1)} />
          <Txt size={14}>Trang {page + 1}/{data.totalPages}</Txt>
          <Button title="Trang sau" size="sm" variant="secondary" disabled={page + 1 >= data.totalPages} onPress={() => setPage(page + 1)} />
        </View>
      ) : null}
      {pw.dialog}
    </Page>
  );
}

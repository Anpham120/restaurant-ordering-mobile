import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Badge, Card, Empty, ErrorBox, Loading, Segmented } from '@/components/ui';
import { api, errorMessage, type BankTransaction, type PaymentListItem } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { dateTime, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Tab = 'refund' | 'refunded' | 'bank';

/** Refund queue (paid online, then cancelled) and the bank transfers SePay reported. */
export default function AdminPayments() {
  const [tab, setTab] = useState<Tab>('refund');
  return (
    <Page title="Thanh toán" subtitle="Hoàn tiền cho đơn đã chuyển khoản nhưng bị hủy, và các giao dịch ngân hàng nhận được qua SePay">
      <View style={{ maxWidth: 560 }}>
        <Segmented value={tab} onChange={setTab}
          options={[{ value: 'refund', label: 'Chờ hoàn tiền' }, { value: 'refunded', label: 'Đã hoàn tiền' }, { value: 'bank', label: 'Giao dịch ngân hàng' }]} />
      </View>
      {tab === 'bank' ? <BankList /> : <Refunds done={tab === 'refunded'} />}
    </Page>
  );
}

function Refunds({ done }: { done: boolean }) {
  const toast = useToast();
  const list = useLoad<PaymentListItem[]>(() => api.payments(done ? 'REFUNDED' : 'REFUND_PENDING'), [done], 30000);
  const [busy, setBusy] = useState<number | null>(null);
  const mark = async (p: PaymentListItem) => {
    if (!(await confirmAction(`Xác nhận đã hoàn ${money(p.amount)} cho đơn #${p.orderCode} (${p.customerName})?`, 'Đã hoàn tiền'))) return;
    setBusy(p.id);
    try {
      await api.markRefunded(p.id);
      list.setData((d) => (d ? d.filter((x) => x.id !== p.id) : d));
      toast.show('Đã ghi nhận hoàn tiền và báo cho khách', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  if (list.loading && !list.data) return <Loading />;
  if (list.error && !list.data) return <ErrorBox message={list.error} onRetry={list.reload} />;
  const items = list.data ?? [];
  return (
    <Card padded={false}>
      {items.length === 0 ? <Empty icon="checkmark-done-outline" title={done ? 'Chưa có khoản hoàn tiền nào' : 'Không có khoản nào cần hoàn'} /> : items.map((p, i) => (
        <View key={p.id} style={[styles.row, i > 0 && styles.line]}>
          <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
            <Txt weight="bold" size={15}>#{p.orderCode} · {p.customerName}</Txt>
            <Txt size={13} color={colors.muted}>
              Chuyển khoản lúc {dateTime(p.paidAt)}{done && p.confirmedByName ? ` · hoàn bởi ${p.confirmedByName}` : ''}
            </Txt>
          </View>
          <Txt weight="extrabold" size={16} style={{ width: 120, textAlign: 'right' }}>{money(p.amount)}</Txt>
          {done ? <Badge label="Đã hoàn tiền" bg={colors.infoSoft} fg={colors.info} />
            : <Button title="Đã hoàn tiền" size="sm" variant="success" loading={busy === p.id} onPress={() => void mark(p)} />}
        </View>
      ))}
    </Card>
  );
}

function BankList() {
  const list = useLoad<BankTransaction[]>(() => api.bankTransactions(100), [], 30000);
  if (list.loading && !list.data) return <Loading />;
  if (list.error && !list.data) return <ErrorBox message={list.error} onRetry={list.reload} />;
  const items = list.data ?? [];
  return (
    <Card padded={false}>
      {items.length === 0 ? <Empty icon="card-outline" title="Chưa nhận giao dịch nào" text="Giao dịch chuyển khoản đến tài khoản cửa hàng sẽ hiện ở đây khi SePay báo về." /> : (
        <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ minWidth: 820, flex: 1 }}>
            <View style={[styles.trow, styles.head]}>
              <Txt weight="semibold" size={13} color={colors.muted} style={styles.cTime}>Thời gian</Txt>
              <Txt weight="semibold" size={13} color={colors.muted} style={[styles.cAmount, { textAlign: 'right' }]}>Số tiền</Txt>
              <Txt weight="semibold" size={13} color={colors.muted} style={styles.cContent}>Nội dung</Txt>
              <Txt weight="semibold" size={13} color={colors.muted} style={styles.cOrder}>Đơn</Txt>
              <Txt weight="semibold" size={13} color={colors.muted} style={styles.cNote}>Ghi chú</Txt>
            </View>
            {items.map((t) => {
              const ok = t.note === 'Khớp đơn';
              return (
                <View key={t.id} style={[styles.trow, styles.line]}>
                  <View style={styles.cTime}>
                    <Txt size={14}>{dateTime(t.receivedAt)}</Txt>
                    <Txt size={12} color={colors.muted}>{t.gateway ?? ''}</Txt>
                  </View>
                  <Txt weight="bold" size={14} style={[styles.cAmount, { textAlign: 'right' }]}>{money(t.amount)}</Txt>
                  <Txt size={13} color={colors.textSoft} style={styles.cContent} numberOfLines={2}>{t.content ?? ''}</Txt>
                  <Txt weight="semibold" size={13} style={styles.cOrder}>{t.orderCode ? `#${t.orderCode}` : '—'}</Txt>
                  <View style={styles.cNote}>
                    <Badge label={t.note ?? ''} bg={ok ? colors.successSoft : colors.warningSoft} fg={ok ? colors.success : colors.warningText} size={11} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, flexWrap: 'wrap' },
  trow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.divider },
  head: { paddingVertical: 10 },
  cTime: { width: 120 },
  cAmount: { width: 110 },
  cContent: { flex: 1, minWidth: 200 },
  cOrder: { width: 140 },
  cNote: { width: 200, alignItems: 'flex-start' },
});

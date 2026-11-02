import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/modal';
import { Txt } from '@/components/txt';
import { ErrorBox, Loading, SearchBox, Toggle } from '@/components/ui';
import { api, errorMessage, type MenuItem, type Order } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { minutesSince, mmss } from '@/lib/format';
import { useLoad, useNow } from '@/lib/hooks';
import { homeFor, useSession } from '@/lib/session';
import { colors, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Kitchen display: large tickets, timers coloured by waiting time, one tap per step. */
export default function Kitchen() {
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const toast = useToast();
  const { user, logout } = useSession();
  const queue = useLoad<Order[]>(() => api.kitchenQueue(), [], 5000);
  const menu = useLoad<MenuItem[]>(() => api.storeMenu(), [], 30000);
  const [busy, setBusy] = useState<number | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [q, setQ] = useState('');

  const step = async (o: Order) => {
    setBusy(o.id);
    try {
      const next = await api.setStatus(o.id, o.status === 'CONFIRMED' ? 'PREPARING' : 'READY');
      queue.setData((d) => (d ? d.map((x) => (x.id === next.id ? next : x)).filter((x) => x.status === 'CONFIRMED' || x.status === 'PREPARING') : d));
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  const setStock = async (m: MenuItem, available: boolean) => {
    try {
      const u = await api.setAvailability(m.id, available);
      menu.setData((d) => (d ? d.map((x) => (x.id === u.id ? u : x)) : d));
      toast.show(`${m.name}: ${available ? 'còn hàng' : 'đã báo hết'}`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const tickets = queue.data ?? [];
  const items = tickets.reduce((n, o) => n + o.itemCount, 0);
  const soldOut = (menu.data ?? []).filter((m) => !m.available);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <Txt weight="extrabold" size={26} color={colors.text}>Bếp</Txt>
          <Txt size={15} color={colors.muted}>{tickets.length} phiếu đang chờ · {items} món</Txt>
        </View>
        <View style={styles.headActions}>
          <Txt size={14} color={colors.muted}>Báo hết món:</Txt>
          {soldOut.map((m) => (
            <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.name} đang hết, chạm để báo còn hàng`}
              onPress={() => void setStock(m, true)} style={styles.soldOut}>
              <Txt weight="bold" size={14} color={colors.danger}>{m.name} · Hết</Txt>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setStockOpen(true)} style={styles.outline}>
            <Ionicons name="add" size={16} color={colors.textSoft} />
            <Txt weight="semibold" size={14} color={colors.textSoft}>Chọn món</Txt>
          </Pressable>
          {user?.role === 'MANAGER' ? (
            <Pressable accessibilityRole="button" onPress={() => router.replace(homeFor(user.role))} style={styles.outline}>
              <Txt weight="semibold" size={14} color={colors.textSoft}>Về trang quản lý</Txt>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" style={styles.outline}
              onPress={async () => { if (await confirmAction('Đăng xuất khỏi màn hình bếp?', 'Đăng xuất')) { logout(); router.replace('/login'); } }}>
              <Txt weight="semibold" size={14} color={colors.textSoft}>Đăng xuất</Txt>
            </Pressable>
          )}
        </View>
      </View>

      {queue.error ? <ErrorBox message={queue.error} onRetry={queue.reload} /> : null}
      {queue.loading && !queue.data ? <Loading /> : tickets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.faint} />
          <Txt weight="bold" size={20} color={colors.textSoft}>Chưa có phiếu nào cần làm</Txt>
          <Txt size={15} color={colors.muted}>Đơn mới sẽ hiện ở đây ngay khi nhân viên xác nhận.</Txt>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {tickets.map((o) => {
            const mins = minutesSince(o.createdAt, now);
            const tone = mins >= 15 ? { bg: colors.danger, fg: colors.white } : mins >= 10 ? { bg: colors.warning, fg: colors.white } : { bg: colors.neutralSoft, fg: colors.text };
            const cooking = o.status === 'PREPARING';
            return (
              <View key={o.id} style={styles.ticket}>
                <View style={[styles.ticketHead, { backgroundColor: tone.bg }]}>
                  <Txt weight="extrabold" size={20} color={tone.fg}>#{o.code.slice(-4)}</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="timer-outline" size={20} color={tone.fg} />
                    <Txt weight="extrabold" size={20} color={tone.fg}>{mmss(o.createdAt, now)}</Txt>
                  </View>
                </View>
                <View style={styles.ticketBody}>
                  {cooking ? <Txt weight="bold" size={13} color={colors.primary}>ĐANG NẤU</Txt> : null}
                  {o.items.map((i) => (
                    <View key={i.id} style={styles.line}>
                      <Txt weight="extrabold" size={22} color={colors.primary} style={{ minWidth: 38 }}>{i.quantity}×</Txt>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Txt weight="bold" size={20} color={colors.text} style={{ lineHeight: 26 }}>{i.name}</Txt>
                        {i.options.length ? (
                          <View style={styles.opts}>
                            {i.options.map((op) => <View key={op.id} style={styles.opt}><Txt weight="bold" size={15} color={colors.primaryText}>{op.name}</Txt></View>)}
                          </View>
                        ) : null}
                        {i.note ? <View style={styles.note}><Txt weight="bold" size={15} color={colors.text}>{i.note}</Txt></View> : null}
                      </View>
                    </View>
                  ))}
                  {o.note ? <Txt size={14} color={colors.textSoft} style={styles.orderNote}>Ghi chú đơn: {o.note}</Txt> : null}
                  <Pressable accessibilityRole="button" disabled={busy === o.id} onPress={() => void step(o)}
                    style={({ pressed }) => [styles.btn, { backgroundColor: cooking ? colors.success : colors.primary, opacity: pressed || busy === o.id ? 0.8 : 1 }]}>
                    <Txt weight="extrabold" size={18} color={colors.white}>{cooking ? 'Xong – chuyển giao' : 'Bắt đầu nấu'}</Txt>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Sheet visible={stockOpen} onClose={() => setStockOpen(false)} title="Báo hết / còn món">
        <SearchBox value={q} onChangeText={setQ} placeholder="Tìm món…" accessibilityLabel="Tìm món" />
        {(menu.data ?? []).filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())).map((m) => (
          <View key={m.id} style={styles.stockRow}>
            <Txt weight="semibold" size={15} style={{ flex: 1 }}>{m.name}</Txt>
            <Txt size={13} color={m.available ? colors.success : colors.danger}>{m.available ? 'Còn hàng' : 'Hết'}</Txt>
            <Toggle value={m.available} onChange={(v) => void setStock(m, v)} label={`Còn hàng: ${m.name}`} />
          </View>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 20, gap: 18 },
  head: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  headActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  soldOut: { height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.dangerSoft, justifyContent: 'center' },
  outline: { height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', paddingBottom: 24 },
  ticket: { width: 320, flexGrow: 1, maxWidth: 420, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  ticketBody: { padding: 16, gap: 12 },
  line: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  note: { alignSelf: 'flex-start', backgroundColor: colors.noteBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: { backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  orderNote: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  btn: { height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
});

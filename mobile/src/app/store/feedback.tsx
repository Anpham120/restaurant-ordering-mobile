import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Badge, Empty, ErrorBox, Field, Loading, Segmented } from '@/components/ui';
import { api, errorMessage, type Feedback } from '@/lib/api';
import { dateTime, feedbackTopicLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Filter = 'open' | 'answered' | 'all';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Chờ trả lời' }, { value: 'answered', label: 'Đã trả lời' }, { value: 'all', label: 'Tất cả' },
];
const QUICK = ['Cảm ơn bạn đã góp ý, cửa hàng sẽ cải thiện ngay.', 'Xin lỗi bạn vì sự bất tiện, cửa hàng sẽ liên hệ lại qua điện thoại.'];

/** Customer feedback for staff and managers: oldest unanswered first, reply in place (the customer is notified). */
export default function FeedbackInbox() {
  const [filter, setFilter] = useState<Filter>('open');
  const list = useLoad<Feedback[]>(() => api.storeFeedback(filter === 'all' ? undefined : filter === 'answered'), [filter], 15000);
  // answered ones leave the "waiting" list; elsewhere the card is updated in place
  const replace = (f: Feedback) => list.setData((l) => {
    if (!l) return l;
    return filter === 'open' ? l.filter((x) => x.id !== f.id) : l.map((x) => (x.id === f.id ? f : x));
  });
  const items = list.data ?? [];
  return (
    <Page title="Góp ý khách hàng" subtitle="Câu trả lời được gửi tới khách thành thông báo trong ứng dụng"
      actions={<View style={{ width: 360, maxWidth: '100%' }}><Segmented options={FILTERS} value={filter} onChange={(v) => { list.setData(null); setFilter(v); }} /></View>}>
      {list.error && !list.data ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data ? <Loading />
        : items.length === 0 ? <Empty icon="chatbubbles-outline" title={filter === 'open' ? 'Không còn góp ý chờ trả lời' : 'Chưa có góp ý'} />
          : <View style={styles.grid}>{items.map((f) => <Item key={f.id} f={f} onReplied={replace} />)}</View>}
    </Page>
  );
}

function Item({ f, onReplied }: { f: Feedback; onReplied: (f: Feedback) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(!f.reply);
  const [text, setText] = useState(f.reply ?? '');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { const r = await api.replyFeedback(f.id, text.trim()); onReplied(r); setEditing(false); toast.show(`Đã trả lời ${r.customerName}`, 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <Badge label={feedbackTopicLabel[f.topic]} bg={colors.neutralSoft} fg={colors.neutralText} />
          {f.orderCode ? <Badge label={`Đơn ${f.orderCode}`} bg={colors.primarySoft} fg={colors.primaryText} /> : null}
        </View>
        {f.reply ? <Badge label="Đã trả lời" bg={colors.successSoft} fg={colors.success} /> : <Badge label="Chờ trả lời" bg={colors.warningSoft} fg={colors.warningText} />}
      </View>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Txt weight="bold" size={15}>{f.customerName}</Txt>
          <Txt size={12} color={colors.muted}>{dateTime(f.createdAt)}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Gọi ${f.customerName}`} onPress={() => void Linking.openURL(`tel:${f.customerPhone}`)} style={styles.call}>
          <Ionicons name="call" size={15} color={colors.primary} />
          <Txt weight="semibold" size={13} color={colors.primary}>{f.customerPhone}</Txt>
        </Pressable>
      </View>
      <Txt size={14} style={{ lineHeight: 20 }}>{f.message}</Txt>
      {editing ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {QUICK.map((q) => (
              <Pressable key={q} accessibilityRole="button" onPress={() => setText(q)} style={styles.quick}>
                <Txt size={12} color={colors.textSoft} numberOfLines={1}>{q}</Txt>
              </Pressable>
            ))}
          </View>
          <Field value={text} onChangeText={setText} multiline maxLength={1000} placeholder="Nhập câu trả lời cho khách" accessibilityLabel="Câu trả lời" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {f.reply ? <Button title="Hủy" variant="secondary" size="sm" onPress={() => { setText(f.reply ?? ''); setEditing(false); }} style={{ flex: 1 }} /> : null}
            <Button title="Gửi trả lời" icon="send" size="sm" onPress={() => void send()} loading={busy} disabled={!text.trim()} style={{ flex: 2 }} />
          </View>
        </View>
      ) : (
        <View style={styles.reply}>
          <Txt weight="bold" size={13} color={colors.primaryText}>Đã trả lời{f.repliedByName ? ` · ${f.repliedByName}` : ''} · {dateTime(f.repliedAt)}</Txt>
          <Txt size={14} style={{ lineHeight: 20 }}>{f.reply}</Txt>
          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Txt weight="semibold" size={13} color={colors.primary}>Sửa câu trả lời</Txt>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 10, flexGrow: 1, flexBasis: 340, maxWidth: 560 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  quick: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  reply: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: colors.primary },
});

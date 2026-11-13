import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { KeyboardScroll } from '@/components/keyboard';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Badge, Card, Chip, ErrorBox, Field, Loading } from '@/components/ui';
import { api, errorMessage, type Feedback, type FeedbackTopic, type Order, type Page, type Store } from '@/lib/api';
import { dateTime, feedbackTopicLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { homeFor, useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const TOPICS: FeedbackTopic[] = ['ORDER', 'FOOD', 'DELIVERY', 'APP', 'OTHER'];
const MAX = 1000;

/** Feedback & support: call or text the hotline, or write to the store in the app and read its answer here. */
export default function FeedbackScreen() {
  const { user } = useSession();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const store = useLoad<Store>(() => api.store());
  if (user && user.role !== 'CUSTOMER') return <Redirect href={homeFor(user.role)} />;
  const hotline = store.data?.hotline;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  return (
    <PhoneFrame>
      <TopBar title="Góp ý & hỗ trợ" onBack={back} />
      <KeyboardScroll contentContainerStyle={styles.body}>
        <View style={styles.contacts}>
          <Contact icon="call" label="Gọi hotline" sub={hotline ?? '…'} bg={colors.success}
            onPress={hotline ? () => void Linking.openURL(`tel:${hotline}`) : undefined} />
          <Contact icon="chatbubbles" label="Nhắn tin SMS" sub="Trả lời qua điện thoại" bg={colors.info}
            onPress={hotline ? () => void Linking.openURL(`sms:${hotline}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent('Atlas Restaurant - góp ý: ')}`) : undefined} />
        </View>
        {user ? <Form initialOrderId={params.orderId ? Number(params.orderId) : null} /> : (
          <Card style={{ gap: 10 }}>
            <Txt weight="extrabold" size={16}>Gửi góp ý trong ứng dụng</Txt>
            <Txt size={14} color={colors.muted}>Đăng nhập để gửi góp ý và nhận câu trả lời của cửa hàng ngay trong ứng dụng.</Txt>
            <Button title="Đăng nhập" onPress={() => router.push('/login')} />
          </Card>
        )}
      </KeyboardScroll>
    </PhoneFrame>
  );
}

function Contact({ icon, label, sub, bg, onPress }: {
  icon: 'call' | 'chatbubbles'; label: string; sub: string; bg: string; onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => [styles.contact, shadow, pressed && { opacity: 0.85 }]}>
      <View style={[styles.contactIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={20} color={colors.white} /></View>
      <Txt weight="bold" size={15}>{label}</Txt>
      <Txt size={12} color={colors.muted} numberOfLines={1}>{sub}</Txt>
    </Pressable>
  );
}

function Form({ initialOrderId }: { initialOrderId: number | null }) {
  const toast = useToast();
  const [topic, setTopic] = useState<FeedbackTopic | null>(initialOrderId ? 'ORDER' : null);
  const [orderId, setOrderId] = useState<number | null>(initialOrderId);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const orders = useLoad<Page<Order>>(() => api.myOrders(0, 5));
  const history = useLoad<Feedback[]>(() => api.myFeedback(), [], 30000);
  // an order opened from its detail screen may be older than the five shown
  const linked = useLoad<Order | null>(() => (initialOrderId ? api.myOrder(initialOrderId) : Promise.resolve(null)), [initialOrderId]);
  const latest = orders.data?.content ?? [];
  const choices = linked.data && !latest.some((o) => o.id === linked.data!.id) ? [linked.data, ...latest] : latest;
  const problem = !topic ? 'Chọn chủ đề góp ý' : !message.trim() ? 'Nhập nội dung góp ý' : null;

  const send = async () => {
    if (!topic || problem) return;
    setBusy(true);
    try {
      const f = await api.sendFeedback(topic, message.trim(), orderId);
      history.setData((h) => [f, ...(h ?? [])]);
      setMessage('');
      setTopic(null);
      setOrderId(null);
      toast.show('Đã gửi góp ý. Cửa hàng sẽ trả lời trong ứng dụng', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <Txt weight="extrabold" size={16}>Gửi góp ý cho cửa hàng</Txt>
        <View style={{ gap: 8 }}>
          <Txt weight="semibold" size={14}>Chủ đề</Txt>
          <View style={styles.chips}>
            {TOPICS.map((t) => <Chip key={t} label={feedbackTopicLabel[t]} active={topic === t} onPress={() => setTopic(t)} />)}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt weight="semibold" size={14}>Về đơn hàng <Txt size={13} color={colors.muted}>(không bắt buộc)</Txt></Txt>
          <View style={styles.chips}>
            <Chip label="Không gắn đơn" active={orderId === null} onPress={() => setOrderId(null)} />
            {choices.map((o) => <Chip key={o.id} label={`#${o.code.slice(-4)} · ${dateTime(o.createdAt).split(' ')[0]}`} active={orderId === o.id} onPress={() => setOrderId(o.id)} />)}
          </View>
        </View>
        <Field label="Nội dung" value={message} onChangeText={setMessage} multiline maxLength={MAX} placeholder="VD: Món giao đến hơi nguội, mong quán đóng gói kỹ hơn"
          hint={`${message.length}/${MAX}`} style={{ minHeight: 110, textAlignVertical: 'top', paddingTop: 12 }} />
        {problem && (topic || message) ? <Txt size={13} color={colors.muted}>{problem}</Txt> : null}
        <Button title="Gửi góp ý" icon="send" onPress={() => void send()} loading={busy} disabled={!!problem} />
      </Card>

      <View style={{ gap: 10 }}>
        <Txt weight="extrabold" size={16}>Góp ý đã gửi</Txt>
        {history.loading && !history.data ? <Loading /> : history.error && !history.data ? <ErrorBox message={history.error} onRetry={history.reload} />
          : (history.data ?? []).length === 0 ? <Txt size={14} color={colors.muted}>Bạn chưa gửi góp ý nào.</Txt>
            : history.data!.map((f) => <Sent key={f.id} f={f} />)}
      </View>
    </>
  );
}

function Sent({ f }: { f: Feedback }) {
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <Badge label={feedbackTopicLabel[f.topic]} bg={colors.neutralSoft} fg={colors.neutralText} />
          {f.orderCode ? <Badge label={`#${f.orderCode.slice(-4)}`} bg={colors.primarySoft} fg={colors.primaryText} /> : null}
        </View>
        {f.reply ? <Badge label="Đã trả lời" bg={colors.successSoft} fg={colors.success} /> : <Badge label="Chờ trả lời" bg={colors.warningSoft} fg={colors.warningText} />}
      </View>
      <Txt size={14} style={{ lineHeight: 20 }}>{f.message}</Txt>
      <Txt size={12} color={colors.muted}>Gửi lúc {dateTime(f.createdAt)}</Txt>
      {f.reply ? (
        <View style={styles.reply}>
          <Txt weight="bold" size={13} color={colors.primaryText}>Cửa hàng trả lời{f.repliedByName ? ` · ${f.repliedByName}` : ''}</Txt>
          <Txt size={14} style={{ lineHeight: 20 }}>{f.reply}</Txt>
          <Txt size={12} color={colors.muted}>{dateTime(f.repliedAt)}</Txt>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  contacts: { flexDirection: 'row', gap: 12 },
  contact: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 4 },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  reply: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: colors.primary },
});

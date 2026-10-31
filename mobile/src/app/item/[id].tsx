import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PhoneFrame } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Badge, ErrorBox, Field, FoodImage, Loading, Stars, Stepper } from '@/components/ui';
import { api, errorMessage, type MenuItemDetail } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { dateTime, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useCartChange } from '@/lib/use-cart-change';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const { data, error, loading, reload, setData } = useLoad<MenuItemDetail>(() => api.item(itemId), [itemId]);
  return (
    <PhoneFrame bg={colors.white}>
      {loading && !data ? <Loading /> : error && !data ? <View style={{ padding: 16, paddingTop: 72 }}><ErrorBox message={error} onRetry={reload} /></View>
        : data ? <Detail detail={data} onFavorite={(fav) => setData({ ...data, item: { ...data.item, favorite: fav } })} /> : null}
      <BackButton />
    </PhoneFrame>
  );
}

function BackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={[styles.round, shadow, { top: insets.top + 16, left: 16 }]}>
      <Ionicons name="chevron-back" size={22} color={colors.text} />
    </Pressable>
  );
}

function Detail({ detail, onFavorite }: { detail: MenuItemDetail; onFavorite: (v: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const { item, reviews } = detail;
  const { user } = useSession();
  const { quantityOf, cart } = useCart();
  const change = useCartChange();
  const toast = useToast();
  const inCart = quantityOf(item.id);
  const line = cart.lines.find((l) => l.menuItemId === item.id);
  const [qty, setQty] = useState(inCart || 1);
  const [note, setNote] = useState(line?.note ?? '');
  const [busy, setBusy] = useState(false);

  const toggleFavorite = async () => {
    if (!user) { router.push('/login'); return; }
    try {
      if (item.favorite) await api.removeFavorite(item.id); else await api.addFavorite(item.id);
      onFavorite(!item.favorite);
      toast.show(item.favorite ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const submit = async () => {
    setBusy(true);
    const ok = await change(item.id, qty, note.trim() || null);
    setBusy(false);
    if (ok) router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <FoodImage uri={item.imageUrl} style={styles.hero} rounded={0} />
        <View style={styles.sheet}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={item.categoryName} bg={colors.primarySoft} fg={colors.primaryText} />
              {!item.available ? <Badge label="Tạm hết" bg={colors.neutralSoft} fg={colors.neutralText} /> : null}
            </View>
            <Txt weight="extrabold" size={24} style={{ lineHeight: 30 }}>{item.name}</Txt>
            <View style={styles.meta}>
              {item.ratingAvg != null ? (
                <>
                  <Ionicons name="star" size={16} color={colors.star} />
                  <Txt weight="bold" size={14}>{item.ratingAvg.toFixed(1)}</Txt>
                  <Txt size={14} color={colors.muted}>({item.ratingCount} đánh giá)</Txt>
                  <Txt size={14} color={colors.muted}>·</Txt>
                </>
              ) : <Txt size={14} color={colors.muted}>Chưa có đánh giá ·</Txt>}
              <Txt size={14} color={colors.muted}>Đã bán {item.soldCount}</Txt>
            </View>
            <Txt weight="extrabold" size={22} color={colors.primary}>{money(item.price)}</Txt>
            {item.description ? <Txt size={15} color={colors.textSoft} style={{ lineHeight: 23 }}>{item.description}</Txt> : null}
          </View>

          {item.available ? (
            <Field label="Ghi chú cho quán (không bắt buộc)" value={note} onChangeText={setNote} placeholder="Ví dụ: không hành, nhiều tái, ít bánh…"
              multiline maxLength={200} />
          ) : null}

          <View style={{ gap: 10 }}>
            <Txt weight="bold" size={15}>Đánh giá gần đây</Txt>
            {reviews.length === 0 ? <Txt size={14} color={colors.muted}>Chưa có đánh giá nào cho món này.</Txt> : reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <Txt weight="bold" size={13}>{r.customerName}</Txt>
                  <Stars value={r.rating} size={13} />
                </View>
                {r.comment ? <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }}>{r.comment}</Txt> : null}
                <Txt size={12} color={colors.muted}>{dateTime(r.createdAt)}</Txt>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel={item.favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} onPress={toggleFavorite}
        style={[styles.round, shadow, { top: insets.top + 16, right: 16 }]}>
        <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={21} color={colors.primary} />
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {item.available ? (
          <>
            <View style={styles.qtyBox}><Stepper value={qty} onChange={setQty} min={1} outline size={30} /></View>
            <Button title={`${inCart ? 'Cập nhật giỏ' : 'Thêm vào giỏ'} · ${money(item.price * qty)}`} size="lg" onPress={submit} loading={busy} style={{ flex: 1, paddingHorizontal: 8 }} />
          </>
        ) : <Button title="Món tạm hết, vui lòng chọn món khác" size="lg" variant="secondary" disabled style={{ flex: 1 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 300 },
  round: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  review: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 4 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  qtyBox: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 6, justifyContent: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardScroll } from '@/components/keyboard';
import { Button } from '@/components/button';
import { PhoneFrame } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Badge, ErrorBox, Field, FoodImage, Loading, Stars, Stepper } from '@/components/ui';
import { api, errorMessage, type MenuItemDetail, type OptionGroup } from '@/lib/api';
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
  const { quantityOf } = useCart();
  const { addConfigured } = useCartChange();
  const toast = useToast();
  const inCart = quantityOf(item.id);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // single-choice required groups start on their first available option (e.g. the regular size)
  const [chosen, setChosen] = useState<Record<number, number[]>>(() => Object.fromEntries(item.optionGroups.map((g) => {
    const first = g.options.find((o) => o.available);
    return [g.id, g.minSelect > 0 && g.maxSelect === 1 && first ? [first.id] : []];
  })));
  const picked = useMemo(() => item.optionGroups.flatMap((g) => g.options.filter((o) => (chosen[g.id] ?? []).includes(o.id))), [item, chosen]);
  const unit = item.price + picked.reduce((s, o) => s + o.priceDelta, 0);
  const missing = item.optionGroups.find((g) => (chosen[g.id]?.length ?? 0) < g.minSelect);
  const toggle = (g: OptionGroup, optionId: number) => setChosen((c) => {
    const cur = c[g.id] ?? [];
    if (g.maxSelect === 1) return { ...c, [g.id]: cur.includes(optionId) && g.minSelect === 0 ? [] : [optionId] };
    if (cur.includes(optionId)) return { ...c, [g.id]: cur.filter((x) => x !== optionId) };
    return cur.length >= g.maxSelect ? c : { ...c, [g.id]: [...cur, optionId] };
  });

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
    const ok = await addConfigured(item.id, qty, note.trim() || null, picked.map((o) => o.id));
    setBusy(false);
    if (ok) { if (router.canGoBack()) router.back(); else router.replace('/'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScroll contentContainerStyle={{ paddingBottom: 150 }}>
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

          {item.available ? item.optionGroups.map((g) => {
            const sel = chosen[g.id] ?? [];
            const required = g.minSelect > 0;
            return (
              <View key={g.id} style={styles.group}>
                <View style={styles.groupHead}>
                  <Txt weight="extrabold" size={15}>{g.name}</Txt>
                  <Badge label={required ? `Bắt buộc · chọn ${g.maxSelect === 1 ? 1 : `${g.minSelect}–${g.maxSelect}`}` : `Tùy chọn · tối đa ${g.maxSelect}`}
                    bg={required ? colors.primarySoft : colors.neutralSoft} fg={required ? colors.primaryText : colors.neutralText} />
                </View>
                {g.options.map((o) => {
                  const on = sel.includes(o.id);
                  const disabled = !o.available || (!on && g.maxSelect > 1 && sel.length >= g.maxSelect);
                  return (
                    <Pressable key={o.id} accessibilityRole={g.maxSelect === 1 ? 'radio' : 'checkbox'} accessibilityState={{ checked: on, disabled }}
                      disabled={disabled} onPress={() => toggle(g, o.id)} style={[styles.option, disabled && { opacity: 0.45 }]}>
                      <View style={[g.maxSelect === 1 ? styles.radio : styles.check, on && (g.maxSelect === 1 ? styles.radioOn : styles.checkOn)]}>
                        {on ? (g.maxSelect === 1 ? <View style={styles.radioDot} /> : <Ionicons name="checkmark" size={15} color={colors.white} />) : null}
                      </View>
                      <Txt size={15} style={{ flex: 1 }}>{o.name}{!o.available ? ' (tạm hết)' : ''}</Txt>
                      <Txt size={14} color={colors.muted}>+{money(o.priceDelta)}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            );
          }) : null}

          {item.available ? (
            <Field label="Ghi chú cho quán (không bắt buộc)" value={note} onChangeText={setNote} placeholder="Thêm ghi chú cho món này"
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
      </KeyboardScroll>

      <Pressable accessibilityRole="button" accessibilityLabel={item.favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} onPress={toggleFavorite}
        style={[styles.round, shadow, { top: insets.top + 16, right: 16 }]}>
        <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={21} color={colors.primary} />
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {item.available && (picked.length || missing || inCart) ? (
          <Txt size={12} color={missing ? colors.danger : colors.muted} numberOfLines={1} style={{ textAlign: 'center' }}>
            {missing ? `Vui lòng chọn ${missing.name.toLowerCase()}` : picked.length ? picked.map((o) => o.name).join(' · ') : ''}
            {!missing && inCart ? `${picked.length ? '  ·  ' : ''}Đã có ${inCart} trong giỏ` : ''}
          </Txt>
        ) : null}
        <View style={styles.bottomRow}>
          {item.available ? (
            <>
              <View style={styles.qtyBox}><Stepper value={qty} onChange={setQty} min={1} outline size={30} /></View>
              <Button title={`Thêm vào giỏ · ${money(unit * qty)}`} size="lg" onPress={submit} loading={busy} disabled={!!missing}
                style={{ flex: 1, paddingHorizontal: 8 }} />
            </>
          ) : <Button title="Món tạm hết, vui lòng chọn món khác" size="lg" variant="secondary" disabled style={{ flex: 1 }} />}
        </View>
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
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingHorizontal: 16, gap: 8 },
  bottomRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  group: { gap: 4, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D6CFC9', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D6CFC9', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  qtyBox: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 6, justifyContent: 'center' },
});

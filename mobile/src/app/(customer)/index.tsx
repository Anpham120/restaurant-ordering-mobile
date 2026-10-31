import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { DishCard, DishRow } from '@/components/dish';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, FoodImage, Loading, Notice, SearchBox } from '@/components/ui';
import { api, type Address, type Category, type MenuItem, type Store, type Voucher } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { discountLabel, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';
import { useCartChange } from '@/lib/use-cart-change';

interface HomeData { store: Store; categories: Category[]; menu: MenuItem[]; popular: MenuItem[]; vouchers: Voucher[]; address: Address | null }

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { quantityOf } = useCart();
  const change = useCartChange();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<number | null>(null);

  const { data, error, loading, reload } = useLoad<HomeData>(async () => {
    const [store, categories, menu, popular, vouchers, addresses] = await Promise.all([
      api.store(), api.categories(), api.menu(), api.popular(6), api.vouchers(),
      user?.role === 'CUSTOMER' ? api.addresses() : Promise.resolve([] as Address[]),
    ]);
    return { store, categories, menu, popular, vouchers, address: addresses.find((a) => a.isDefault) ?? addresses[0] ?? null };
  }, [user?.id]);

  const sections = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const items = data.menu.filter((m) => (cat == null || m.categoryId === cat)
      && (!needle || m.name.toLowerCase().includes(needle) || (m.description ?? '').toLowerCase().includes(needle)));
    return data.categories
      .map((c) => ({ category: c, items: items.filter((m) => m.categoryId === c.id) }))
      .filter((s) => s.items.length > 0);
  }, [data, q, cat]);

  const voucher = data?.vouchers[0];
  const searching = q.trim().length > 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headRow}>
          <Pressable accessibilityRole="button" style={styles.addr}
            onPress={() => router.push(user ? '/addresses' : '/login')}>
            <View style={styles.pin}><Ionicons name="location" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={12} color={colors.muted}>Giao đến</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Txt weight="bold" size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {data?.address ? `${data.address.street}, ${data.address.zoneName}` : user ? 'Thêm địa chỉ giao hàng' : 'Đăng nhập để đặt món'}
                </Txt>
                <Ionicons name="chevron-down" size={16} color={colors.text} />
              </View>
            </View>
          </Pressable>
          {data ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Gọi cửa hàng ${data.store.hotline}`} style={styles.call}
              onPress={() => void Linking.openURL(`tel:${data.store.hotline}`)}>
              <Ionicons name="call-outline" size={21} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
        <SearchBox value={q} onChangeText={setQ} placeholder="Tìm phở, bún, cơm tấm…" accessibilityLabel="Tìm món" returnKeyType="search" />
      </View>

      {loading && !data ? <Loading /> : error && !data ? <View style={{ padding: 16 }}><ErrorBox message={error} onRetry={reload} /></View> : data ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!data.store.openNow ? (
            <View style={styles.pad}><Notice icon="time-outline" tone="warning" text={data.store.closedReason ?? 'Cửa hàng đang đóng cửa'} /></View>
          ) : null}

          {!searching && voucher ? (
            <View style={[styles.pad]}>
              <View style={styles.banner}>
                <View style={styles.bannerText}>
                  <Txt weight="semibold" size={12} color={colors.white} style={{ letterSpacing: 0.5, opacity: 0.9 }}>ƯU ĐÃI HÔM NAY</Txt>
                  <Txt weight="extrabold" size={18} color={colors.white} style={{ lineHeight: 23 }} numberOfLines={3}>
                    {voucher.description ?? discountLabel(voucher.discountType, voucher.discountValue, voucher.maxDiscount)}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Txt size={13} color={colors.white}>Nhập mã</Txt>
                    <View style={styles.code}><Txt weight="bold" size={13} color={colors.primary}>{voucher.code}</Txt></View>
                    {voucher.minOrder > 0 ? <Txt size={12} color={colors.white} style={{ opacity: 0.9 }}>đơn từ {money(voucher.minOrder)}</Txt> : null}
                  </View>
                </View>
                <FoodImage uri={data.popular[0]?.imageUrl ?? data.categories[0]?.imageUrl} style={styles.bannerImg} rounded={0} />
              </View>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
            <CategoryBubble label="Tất cả" active={cat == null} onPress={() => setCat(null)} />
            {data.categories.map((c) => (
              <CategoryBubble key={c.id} label={c.name} image={c.imageUrl} active={cat === c.id} onPress={() => setCat(cat === c.id ? null : c.id)} />
            ))}
          </ScrollView>

          {!searching && cat == null && data.popular.length ? (
            <View style={{ gap: 12 }}>
              <View style={[styles.pad, styles.sectionHead]}>
                <Txt weight="extrabold" size={18}>Bán chạy nhất</Txt>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {data.popular.map((p) => <DishCard key={p.id} item={p} onAdd={() => void change(p.id, quantityOf(p.id) + 1)} />)}
              </ScrollView>
            </View>
          ) : null}

          {sections.length === 0 ? (
            <Empty icon="search-outline" title="Không tìm thấy món phù hợp" text="Thử tìm với từ khóa khác nhé." />
          ) : sections.map((s) => (
            <View key={s.category.id} style={[styles.pad, { gap: 10 }]}>
              <Txt weight="extrabold" size={18}>{s.category.name}</Txt>
              {s.items.map((m) => <DishRow key={m.id} item={m} qty={quantityOf(m.id)} onChange={(v) => void change(m.id, v)} />)}
            </View>
          ))}
        </ScrollView>
      ) : null}
      <CartBar />
    </View>
  );
}

function CategoryBubble({ label, image, active, onPress }: { label: string; image?: string | null; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={styles.bubble}>
      <View style={[styles.bubbleRing, active && styles.bubbleOn]}>
        {image ? <FoodImage uri={image} style={styles.bubbleImg} rounded={29} /> : (
          <View style={[styles.bubbleImg, styles.allIcon]}><Ionicons name="grid" size={22} color={colors.primary} /></View>
        )}
      </View>
      <Txt weight="semibold" size={12} style={{ textAlign: 'center', lineHeight: 15 }} numberOfLines={2}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addr: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  call: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 16, paddingBottom: 110, gap: 20 },
  pad: { paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  banner: { borderRadius: radius.xl, backgroundColor: colors.primary, flexDirection: 'row', overflow: 'hidden', minHeight: 128 },
  bannerText: { flex: 1, padding: 16, justifyContent: 'center', gap: 6 },
  bannerImg: { width: 128 },
  code: { backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  cats: { paddingHorizontal: 16, gap: 14 },
  bubble: { width: 66, alignItems: 'center', gap: 6 },
  bubbleRing: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  bubbleOn: { borderColor: colors.primary },
  bubbleImg: { width: 54, height: 54, borderRadius: 27 },
  allIcon: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});

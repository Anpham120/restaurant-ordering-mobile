import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { Button } from '@/components/button';
import { DishCard, DishRow } from '@/components/dish';
import { Sheet } from '@/components/modal';
import { PromoCarousel } from '@/components/promo-carousel';
import { PromoPopup } from '@/components/promo-popup';
import { useHiddenPromos } from '@/lib/hidden-promos';
import { dismissWelcome, lastDismissedWelcome } from '@/lib/welcome';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, FoodImage, Loading, Notice, SearchBox } from '@/components/ui';
import { api, type Address, type Category, type MenuItem, type Promotion, type Store, type Voucher } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { discountLabel, money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useUnread } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useCartChange } from '@/lib/use-cart-change';

interface HomeData { store: Store; categories: Category[]; menu: MenuItem[]; popular: MenuItem[]; vouchers: Voucher[]; promotions: Promotion[]; address: Address | null }

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user, welcomeSeq } = useSession();
  const [dismissedSeq, setDismissedSeq] = useState(lastDismissedWelcome);
  const { plainLine, setVoucherHint } = useCart();
  const toast = useToast();
  const unread = useUnread();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const { setPlain } = useCartChange();
  const plainQty = (id: number) => plainLine(id)?.quantity ?? 0;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<number | null>(null);

  const { data, error, loading, reload } = useLoad<HomeData>(async () => {
    const [store, categories, menu, popular, vouchers, promotions, addresses] = await Promise.all([
      api.store(), api.categories(), api.menu(), api.popular(6), api.vouchers(), api.promotions(),
      user?.role === 'CUSTOMER' ? api.addresses() : Promise.resolve([] as Address[]),
    ]);
    return { store, categories, menu, popular, vouchers, promotions, address: addresses.find((a) => a.isDefault) ?? addresses[0] ?? null };
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

  const openPromo = (p: Promotion) => {
    if (p.targetType === 'MENU_ITEM' && p.menuItemId) router.push(`/item/${p.menuItemId}`);
    else if (p.targetType === 'CATEGORY' && p.categoryId) setCat(p.categoryId);
    else if (p.targetType === 'VOUCHER') setPromo(p);
  };
  // once per app start and once per sign-in, guests included: the newest running campaigns in a popup, swipeable;
  // they stay in the banner below afterwards
  // campaigns muted with "Không hiển thị lại" never come back in the pop-up (they stay in the banner)
  const muted = useHiddenPromos();
  const popupPromos = useMemo(() => [...(data?.promotions ?? [])].filter((p) => !muted.hidden.has(p.id)).sort((a, b) => b.id - a.id).slice(0, 5),
    [data?.promotions, muted.hidden]);
  const showPopup = (!user || user.role === 'CUSTOMER') && muted.ready && welcomeSeq > dismissedSeq && popupPromos.length > 0 && !!data;
  const closePopup = () => { dismissWelcome(welcomeSeq); setDismissedSeq(welcomeSeq); };
  const mutePromo = (p: Promotion) => {
    muted.hide(p.id);
    if (popupPromos.length <= 1) closePopup();
    toast.show('Đã ẩn quảng cáo này. Ưu đãi vẫn xem được ở banner trang chủ', 'info');
  };
  const promoVoucher = promo ? data?.vouchers.find((v) => v.id === promo.voucherId) : undefined;

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
                  {data?.address ? data.address.street : user ? 'Thêm địa chỉ giao hàng' : 'Đăng nhập để đặt món'}
                </Txt>
                <Ionicons name="chevron-down" size={16} color={colors.text} />
              </View>
            </View>
          </Pressable>
          {user?.role === 'CUSTOMER' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={unread.count ? `Thông báo, ${unread.count} chưa đọc` : unread.promotions ? 'Thông báo, có khuyến mãi mới' : 'Thông báo'} style={styles.call}
              onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unread.count ? <View style={styles.badge}><Txt weight="bold" size={10} color={colors.white}>{unread.count > 9 ? '9+' : unread.count}</Txt></View>
                : unread.promotions ? <View style={styles.promoDot} /> : null}
            </Pressable>
          ) : data ? (
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

          {!searching && data.promotions.length ? <PromoCarousel promotions={data.promotions} onPress={openPromo} /> : null}

          {!searching && !data.promotions.length && voucher ? (
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
                {data.popular.map((p) => <DishCard key={p.id} item={p} onAdd={() => void setPlain(p, plainQty(p.id) + 1)} />)}
              </ScrollView>
            </View>
          ) : null}

          {sections.length === 0 ? (
            <Empty icon="search-outline" title="Không tìm thấy món phù hợp" text="Thử tìm với từ khóa khác nhé." />
          ) : sections.map((s) => (
            <View key={s.category.id} style={[styles.pad, { gap: 10 }]}>
              <Txt weight="extrabold" size={18}>{s.category.name}</Txt>
              {s.items.map((m) => <DishRow key={m.id} item={m} qty={plainQty(m.id)} onChange={(v) => void setPlain(m, v)} />)}
            </View>
          ))}
        </ScrollView>
      ) : null}
      <CartBar />

      <PromoPopup promotions={popupPromos} visible={showPopup} onClose={closePopup} onOpen={(p) => { closePopup(); openPromo(p); }} onHide={mutePromo} />

      <Sheet visible={!!promo} onClose={() => setPromo(null)} title={promo?.title ?? ''} width={420}
        footer={promo?.voucherCode ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Sao chép mã" icon="copy-outline" variant="secondary" style={{ flex: 1 }}
              onPress={() => { void Clipboard.setStringAsync(promo.voucherCode!); toast.show(`Đã sao chép mã ${promo.voucherCode}`, 'success'); }} />
            <Button title="Dùng mã này" icon="pricetag-outline" style={{ flex: 1 }}
              onPress={() => { setVoucherHint(promo.voucherCode); setPromo(null); toast.show(`Mã ${promo.voucherCode} sẽ được áp dụng ở giỏ hàng`, 'success'); }} />
          </View>
        ) : undefined}>
        {promo ? (
          <View style={{ gap: 12 }}>
            <FoodImage uri={promo.imageUrl} style={{ width: '100%', height: 150 }} rounded={12} />
            {promo.subtitle ? <Txt size={15} color={colors.textSoft} style={{ lineHeight: 22 }}>{promo.subtitle}</Txt> : null}
            {promo.voucherCode ? (
              <View style={styles.codeBox}>
                <Txt size={13} color={colors.muted}>Mã giảm giá</Txt>
                <Txt weight="extrabold" size={22} color={colors.primaryText} style={{ letterSpacing: 1 }}>{promo.voucherCode}</Txt>
                {promoVoucher ? (
                  <Txt size={13} color={colors.textSoft}>
                    {discountLabel(promoVoucher.discountType, promoVoucher.discountValue, promoVoucher.maxDiscount)}
                    {promoVoucher.minOrder > 0 ? ` · đơn từ ${money(promoVoucher.minOrder)}` : ''}
                  </Txt>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>
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
  promoDot: { position: 'absolute', top: 10, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.white },
  badge: { position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  codeBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF7F2', borderRadius: 12, padding: 14, gap: 4, alignItems: 'center' },
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

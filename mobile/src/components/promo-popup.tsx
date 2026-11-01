import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance,
} from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { FoodImage } from '@/components/ui';
import type { Promotion } from '@/lib/api';
import { colors, radius } from '@/lib/theme';

const CTA: Record<Promotion['targetType'], string> = { VOUCHER: 'Lấy mã', MENU_ITEM: 'Xem món', CATEGORY: 'Xem thực đơn', NONE: 'Đã hiểu' };

/**
 * Pop-up with the newest running campaigns, shown once after the customer signs in. Swipe sideways to read all of them
 * (arrows and dots for mouse users); the campaigns stay in the banner on the home screen afterwards.
 */
export function PromoPopup({ promotions, visible, onClose, onOpen }: {
  promotions: Promotion[]; visible: boolean; onClose: () => void; onOpen: (p: Promotion) => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(screenW - 40, 400);
  const ref = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const n = promotions.length;

  const go = (i: number) => {
    const t = Math.max(0, Math.min(n - 1, i));
    ref.current?.scrollTo({ x: t * cardW, animated: true });
    setIndex(t);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (i !== index && i >= 0 && i < n) setIndex(i);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng quảng cáo" />
        <View style={[styles.card, { width: cardW }]}>
          <View style={styles.head}>
            <View style={styles.tag}><Txt weight="bold" size={12} color={colors.primaryText}>{n > 1 ? `ƯU ĐÃI MỚI · ${index + 1}/${n}` : 'ƯU ĐÃI MỚI'}</Txt></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View>
            <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}
              accessibilityLabel="Các chương trình khuyến mãi mới">
              {promotions.map((p) => (
                <View key={p.id} style={{ width: cardW, paddingHorizontal: 16, gap: 10 }} accessibilityLabel={`Chương trình: ${p.title}`}>
                  <FoodImage uri={p.imageUrl} style={styles.img} rounded={radius.lg} />
                  <Txt weight="extrabold" size={20} style={{ lineHeight: 26 }} numberOfLines={3}>{p.title}</Txt>
                  {p.subtitle ? <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }} numberOfLines={4}>{p.subtitle}</Txt> : null}
                  {p.targetType === 'VOUCHER' && p.voucherCode ? (
                    <View style={styles.code}><Txt weight="extrabold" size={18} color={colors.primaryText} style={{ letterSpacing: 1 }}>{p.voucherCode}</Txt></View>
                  ) : null}
                  <Button title={p.targetType === 'VOUCHER' ? 'Lấy mã ưu đãi' : CTA[p.targetType]} onPress={() => (p.targetType === 'NONE' ? onClose() : onOpen(p))} />
                </View>
              ))}
            </ScrollView>
            {n > 1 ? (
              <>
                {index > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Chương trình trước" onPress={() => go(index - 1)} style={[styles.arrow, { left: 6 }]}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
                {index < n - 1 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Chương trình tiếp theo" onPress={() => go(index + 1)} style={[styles.arrow, { right: 6 }]}>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>

          {n > 1 ? (
            <View style={styles.dots}>
              {promotions.map((p, i) => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Chương trình ${i + 1}`} onPress={() => go(i)} hitSlop={6}
                style={[styles.dot, i === index && styles.dotOn]} />)}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, paddingTop: 14, paddingBottom: 16, gap: 12, overflow: 'hidden', maxHeight: '92%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  tag: { backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutralSoft, alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: 170 },
  code: { alignSelf: 'flex-start', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF7F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  arrow: { position: 'absolute', top: 70, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D6CFC9' },
  dotOn: { width: 20, backgroundColor: colors.primary },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance,
} from 'react-native';

import type { Promotion } from '@/lib/api';
import { colors, radius } from '@/lib/theme';
import { Txt } from './txt';
import { FoodImage } from './ui';

const CTA: Record<Promotion['targetType'], string> = { VOUCHER: 'Lấy mã', MENU_ITEM: 'Xem món', CATEGORY: 'Xem thực đơn', NONE: '' };
const ADVANCE_MS = 5000;
/** After the user touches, drags or hovers the banners, wait this long before auto-advancing again. */
const IDLE_MS = 6000;

/**
 * Home banners of the restaurant's running campaigns: swipe, auto-advance every 5 s, dots.
 * Auto-advance pauses while the user touches, drags or hovers the banners (resumes ~6 s after),
 * while the app is in the background, and is off entirely when the system asks to reduce motion.
 */
export function PromoCarousel({ promotions, onPress }: { promotions: Promotion[]; onPress: (p: Promotion) => void }) {
  const ref = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [holding, setHolding] = useState(false);   // finger down, dragging or mouse over
  const [idle, setIdle] = useState(true);          // no interaction for IDLE_MS
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduceMotion(v); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; sub.remove(); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);

  const hold = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    setHolding(true);
    setIdle(false);
  }, []);
  const release = useCallback(() => {
    setHolding(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { idleTimer.current = null; setIdle(true); }, IDLE_MS);
  }, []);

  const running = promotions.length > 1 && !!width && !reduceMotion && active && !holding && idle;
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % promotions.length;
        ref.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, ADVANCE_MS);
    return () => clearInterval(t);
  }, [running, promotions.length, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < promotions.length) setIndex(i);
  };

  return (
    // onMouseEnter/Leave only fire on web (react-native-web); native uses the touch and drag events
    <View style={{ gap: 8 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} onMouseEnter={hold} onMouseLeave={release}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}
        onTouchStart={hold} onTouchEnd={release} onTouchCancel={release} onScrollBeginDrag={hold} onScrollEndDrag={release}
        accessibilityLabel="Chương trình khuyến mãi">
        {promotions.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.title} onPress={() => onPress(p)} style={{ width: width || 1 }}>
            <View style={styles.banner}>
              <View style={styles.text}>
                <Txt weight="semibold" size={11} color={colors.white} style={{ letterSpacing: 0.5, opacity: 0.9 }}>
                  {p.targetType === 'VOUCHER' ? 'ƯU ĐÃI' : p.targetType === 'MENU_ITEM' ? 'MÓN NỔI BẬT' : 'CHƯƠNG TRÌNH'}
                </Txt>
                <Txt weight="extrabold" size={18} color={colors.white} style={{ lineHeight: 23 }} numberOfLines={2}>{p.title}</Txt>
                {p.subtitle ? <Txt size={12} color={colors.white} style={{ opacity: 0.95, lineHeight: 17 }} numberOfLines={2}>{p.subtitle}</Txt> : null}
                {CTA[p.targetType] ? (
                  <View style={styles.cta}>
                    <Txt weight="bold" size={12} color={colors.primary}>{p.targetType === 'VOUCHER' && p.voucherCode ? p.voucherCode : CTA[p.targetType]}</Txt>
                  </View>
                ) : null}
              </View>
              <FoodImage uri={p.imageUrl} style={styles.img} rounded={0} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {promotions.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Chương trình ${index + 1} trên ${promotions.length}`}>
          {promotions.map((p, i) => <View key={p.id} style={[styles.dot, i === index && styles.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, borderRadius: radius.xl, backgroundColor: colors.primary, flexDirection: 'row', overflow: 'hidden', minHeight: 136 },
  text: { flex: 1, padding: 16, justifyContent: 'center', gap: 5 },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  img: { width: 128 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D6CFC9' },
  dotOn: { width: 18, backgroundColor: colors.primary },
});

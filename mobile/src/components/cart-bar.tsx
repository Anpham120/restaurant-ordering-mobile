import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { colors, shadowStrong } from '@/lib/theme';
import { Txt } from './txt';

/** Floating "view cart" bar shown above the tab bar while the cart has items. */
export function CartBar({ bottom = 16 }: { bottom?: number }) {
  const { cart } = useCart();
  if (cart.itemCount === 0) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem giỏ hàng, ${cart.itemCount} món`} onPress={() => router.push('/cart')}
      style={({ pressed }) => [styles.bar, shadowStrong, { bottom, backgroundColor: pressed ? '#000' : colors.text }]}>
      <View style={styles.left}>
        <View style={styles.count}><Txt weight="extrabold" size={14} color={colors.white}>{cart.itemCount}</Txt></View>
        <Txt weight="semibold" size={15} color={colors.white}>Xem giỏ hàng</Txt>
      </View>
      <Txt weight="extrabold" size={16} color={colors.white}>{money(cart.subtotal)}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, height: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

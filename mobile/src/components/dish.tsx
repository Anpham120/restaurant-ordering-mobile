import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MenuItem } from '@/lib/api';
import { money } from '@/lib/format';
import { colors, radius, shadow } from '@/lib/theme';
import { Txt } from './txt';
import { AddButton, Badge, FoodImage, RatingPill, Stepper } from './ui';

interface Props { item: MenuItem; qty: number; onChange: (q: number) => void }

/**
 * Menu row: photo, name, description, price and an add button that turns into a stepper.
 * The tappable area and the cart control are siblings (on web a Pressable is a <button>, which cannot nest).
 */
export function DishRow({ item, qty, onChange }: Props) {
  const off = !item.available;
  return (
    <View style={[styles.row, shadow]}>
      <Pressable accessibilityLabel={item.name} onPress={() => router.push(`/item/${item.id}`)} style={({ pressed }) => [styles.rowPress, pressed && { opacity: 0.9 }]}>
        <FoodImage uri={item.imageUrl} style={[styles.img, off && styles.dim]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Txt weight="bold" size={15} numberOfLines={1} color={off ? colors.muted : colors.text} style={{ flexShrink: 1 }}>{item.name}</Txt>
            <RatingPill avg={item.ratingAvg} count={item.ratingCount || undefined} />
          </View>
          {item.description ? <Txt size={13} color={colors.muted} numberOfLines={2} style={{ lineHeight: 18 }}>{item.description}</Txt> : null}
          <View style={styles.priceRow}>
            <Txt weight="bold" size={15} color={off ? colors.muted : colors.primary}>{money(item.price)}</Txt>
          </View>
        </View>
      </Pressable>
      <View style={styles.action}>
        {off ? <Badge label="Tạm hết" bg={colors.neutralSoft} fg={colors.neutralText} />
          : qty > 0 ? <Stepper value={qty} onChange={onChange} size={30} /> : <AddButton onPress={() => onChange(1)} label={`Thêm ${item.name} vào giỏ`} />}
      </View>
    </View>
  );
}

/** Horizontal best-seller card. */
export function DishCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  return (
    <View style={[styles.card, shadow]}>
      <Pressable accessibilityLabel={item.name} onPress={() => router.push(`/item/${item.id}`)}>
        <View>
          <FoodImage uri={item.imageUrl} style={styles.cardImg} rounded={0} />
          {item.ratingAvg != null ? <View style={styles.cardRating}><RatingPill avg={item.ratingAvg} /></View> : null}
        </View>
        <View style={styles.cardBody}>
          <Txt weight="bold" size={14} numberOfLines={2} style={{ minHeight: 36, lineHeight: 18 }}>{item.name}</Txt>
          <Txt weight="bold" size={14} color={colors.primary}>{money(item.price)}</Txt>
        </View>
      </Pressable>
      <View style={styles.cardAdd}>
        {item.available ? <AddButton onPress={onAdd} label={`Thêm ${item.name} vào giỏ`} /> : <Txt size={12} color={colors.muted}>Tạm hết</Txt>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.white, borderRadius: radius.lg },
  rowPress: { padding: 10, flexDirection: 'row', gap: 12 },
  img: { width: 92, height: 92 },
  dim: { opacity: 0.45 },
  body: { flex: 1, gap: 4, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceRow: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 110, minHeight: 32 },
  action: { position: 'absolute', right: 10, bottom: 10 },
  card: { width: 150, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  cardImg: { width: 150, height: 112 },
  cardRating: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  cardBody: { padding: 10, paddingBottom: 12, gap: 6 },
  cardAdd: { position: 'absolute', right: 10, bottom: 10 },
});

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { SearchBox } from '@/components/ui';
import { api, errorMessage, type DeliveryQuote, type GeoPlace } from '@/lib/api';
import { km, money } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

export interface PickedLocation { latitude: number; longitude: number }

/** Where a position came from: a typed search (the address text should follow) or the phone's GPS (only fill an empty address). */
export type PickSource = 'search' | 'gps';

/**
 * Picks the delivery position without a map SDK: search an address (OpenStreetMap through our API) or use the phone's
 * GPS. As soon as a position is set it shows what the restaurant will charge: distance, fee and delivery estimate.
 */
export function LocationPicker({ value, onPick, hint, title = 'Vị trí giao hàng', showQuote = true }: {
  value: PickedLocation | null;
  onPick: (p: PickedLocation, placeName: string | null, source: PickSource) => void;
  hint?: string;
  title?: string;
  /** Hidden when the manager sets the restaurant's own position (the quote is relative to that position). */
  showQuote?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the quote belongs to the position it was fetched for; a stale one is simply not shown
  const [fetched, setFetched] = useState<{ key: string; quote: DeliveryQuote } | null>(null);

  const lat = value?.latitude, lng = value?.longitude;
  const key = lat != null && lng != null ? `${lat},${lng}` : '';
  useEffect(() => {
    if (!showQuote || lat == null || lng == null) return undefined;
    let alive = true;
    api.deliveryQuote(lat, lng).then((q) => { if (alive) setFetched({ key: `${lat},${lng}`, quote: q }); }).catch(() => undefined);
    return () => { alive = false; };
  }, [lat, lng, showQuote]);
  const quote = fetched && fetched.key === key ? fetched.quote : null;

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) { setError('Nhập ít nhất 3 ký tự để tìm địa chỉ'); return; }
    setBusy('search'); setError(null);
    try {
      const found = await api.searchPlaces(q);
      setResults(found);
      if (found.length === 0) setError('Không tìm thấy địa chỉ này. Thử thêm tên phường hoặc dùng vị trí hiện tại.');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  };

  const locate = async () => {
    setBusy('gps'); setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setError('Bạn chưa cho phép ứng dụng dùng vị trí. Hãy bật quyền vị trí hoặc tìm địa chỉ bằng ô bên trên.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: round6(pos.coords.latitude), longitude: round6(pos.coords.longitude) };
      let name: string | null = null;
      try { name = (await api.reversePlace(p.latitude, p.longitude))[0]?.name ?? null; } catch { /* the position alone is enough */ }
      setResults(null);
      onPick(p, name, 'gps');
    } catch (e) { setError(e instanceof Error && e.message ? 'Không lấy được vị trí hiện tại. Hãy thử tìm địa chỉ bằng ô bên trên.' : errorMessage(e)); }
    finally { setBusy(null); }
  };

  const choose = (g: GeoPlace) => {
    setResults(null); setQuery(''); setError(null);
    onPick({ latitude: g.latitude, longitude: g.longitude }, g.name, 'search');
  };

  return (
    <View style={{ gap: 10 }}>
      <Txt weight="semibold" size={14}>{title}</Txt>
      {hint ? <Txt size={12} color={colors.muted}>{hint}</Txt> : null}
      <Button title="Dùng vị trí hiện tại của tôi" icon="locate" variant="soft" onPress={() => void locate()} loading={busy === 'gps'} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <SearchBox value={query} onChangeText={setQuery} placeholder="Hoặc tìm địa chỉ, tòa nhà, địa điểm…" returnKeyType="search"
            onSubmitEditing={() => void search()} accessibilityLabel="Tìm địa chỉ" />
        </View>
        <Button title="Tìm" size="sm" onPress={() => void search()} loading={busy === 'search'} />
      </View>
      {error ? <Txt size={13} color={colors.danger}>{error}</Txt> : null}
      {results && results.length > 0 ? (
        <View style={styles.list}>
          {results.map((g, i) => (
            <Pressable key={`${g.latitude},${g.longitude},${i}`} accessibilityRole="button" accessibilityLabel={`Chọn ${g.name}`} onPress={() => choose(g)}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Txt size={13} style={{ flex: 1, lineHeight: 18 }}>{g.name}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!showQuote ? null : value ? (
        <View style={[styles.quote, quote && !quote.deliverable && styles.quoteBad]}>
          {!quote ? <ActivityIndicator color={colors.primary} /> : quote.deliverable ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Txt size={13} style={{ flex: 1, lineHeight: 19 }}>
                <Txt weight="bold" size={13}>{quote.distanceKm < 0.1 ? 'Ngay tại cửa hàng' : `Cách cửa hàng khoảng ${km(quote.distanceKm)}`}</Txt>
                {` · phí giao ${money(quote.deliveryFee)} · giao trong khoảng ${quote.estimatedMinutes} phút`}
              </Txt>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Txt size={13} color={colors.danger} style={{ flex: 1, lineHeight: 19 }}>{quote.message}</Txt>
            </>
          )}
        </View>
      ) : (
        <Txt size={12} color={colors.muted}>Chọn vị trí để biết phí giao hàng và thời gian giao dự kiến.</Txt>
      )}
    </View>
  );
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.successSoft },
  quoteBad: { backgroundColor: colors.dangerSoft },
});

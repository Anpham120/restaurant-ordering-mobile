import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CartBar } from '@/components/cart-bar';
import { DishRow } from '@/components/dish';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { api, type MenuItem } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useCartChange } from '@/lib/use-cart-change';

export default function FavoritesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.head, { paddingTop: insets.top + 14 }]}>
        <Txt weight="extrabold" size={22}>Món yêu thích</Txt>
      </View>
      {user ? <List /> : (
        <Empty icon="heart-outline" title="Đăng nhập để lưu món yêu thích" action={<Button title="Đăng nhập" onPress={() => router.push('/login')} />} />
      )}
      <CartBar />
    </View>
  );
}

function List() {
  const { quantityOf } = useCart();
  const change = useCartChange();
  const { data, error, loading, reload } = useLoad<MenuItem[]>(() => api.favorites());
  if (loading && !data) return <Loading />;
  if (error && !data) return <View style={{ padding: 16 }}><ErrorBox message={error} onRetry={reload} /></View>;
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Empty icon="heart-outline" title="Chưa có món yêu thích" text="Nhấn biểu tượng trái tim ở trang món ăn để lưu lại món bạn thích." />}
      renderItem={({ item }) => <DishRow item={item} qty={quantityOf(item.id)} onChange={(v) => void change(item.id, v)} />}
    />
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
});

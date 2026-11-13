import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { DeliveryProof, Order } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors, radius } from '@/lib/theme';
import { Txt } from './txt';
import { Loading } from './ui';

/** Who is delivering, with a call button (customer and store screens). */
export function ShipperLine({ order }: { order: Order }) {
  if (!order.shipperName) return null;
  return (
    <View style={styles.shipper}>
      <View style={styles.avatar}><Ionicons name="bicycle" size={20} color={colors.success} /></View>
      <View style={{ flex: 1 }}>
        <Txt size={12} color={colors.muted}>Shipper</Txt>
        <Txt weight="bold" size={15}>{order.shipperName}</Txt>
      </View>
      {order.shipperPhone && order.status === 'DELIVERING' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Gọi shipper ${order.shipperName}`} hitSlop={6}
          onPress={() => void Linking.openURL(`tel:${order.shipperPhone}`)} style={styles.call}>
          <Ionicons name="call" size={18} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The doorstep photo the shipper took to confirm the delivery; `load` picks the endpoint for the signed-in role. */
export function DeliveryProofPhoto({ orderId, load }: { orderId: number; load: (id: number) => Promise<DeliveryProof> }) {
  const proof = useLoad<DeliveryProof>(() => load(orderId), [orderId]);
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.head}>
        <Ionicons name="camera" size={16} color={colors.success} />
        <Txt weight="bold" size={14}>Ảnh xác nhận giao hàng</Txt>
      </View>
      {proof.loading && !proof.data ? <Loading /> : proof.error ? <Txt size={13} color={colors.danger}>{proof.error}</Txt> : proof.data ? (
        <>
          <Image source={{ uri: proof.data.photo }} style={styles.photo} contentFit="cover" accessibilityLabel="Ảnh shipper chụp khi giao hàng" />
          <Txt size={12} color={colors.muted}>
            {proof.data.shipperName ? `${proof.data.shipperName} · ` : ''}chụp lúc {dateTime(proof.data.takenAt)}
          </Txt>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shipper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  call: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.input },
});

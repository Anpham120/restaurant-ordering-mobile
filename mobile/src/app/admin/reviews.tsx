import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { ListRow } from '@/components/list-row';
import { Txt } from '@/components/txt';
import { Card, Empty, ErrorBox, Loading, Stars } from '@/components/ui';
import { api, type Review } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';

export default function AdminReviews() {
  const list = useLoad<Review[]>(() => api.reviews(100));
  const data = list.data ?? [];
  const avg = data.length ? data.reduce((s, r) => s + r.rating, 0) / data.length : null;
  return (
    <Page title="Đánh giá của khách" subtitle={avg != null ? `${data.length} đánh giá gần nhất · trung bình ${avg.toFixed(1)} ★` : undefined}>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <Card padded={false}>
        {list.loading && !list.data ? <Loading /> : data.length === 0 ? <Empty icon="star-outline" title="Chưa có đánh giá" /> : data.map((r, i) => (
          <ListRow key={r.id} first={i === 0}>
            <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Txt weight="bold" size={15}>{r.menuItemName}</Txt>
                <Stars value={r.rating} size={14} />
              </View>
              {r.comment ? <Txt size={14} color={colors.textSoft}>{r.comment}</Txt> : <Txt size={13} color={colors.faint}>Không có nhận xét</Txt>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt weight="semibold" size={13}>{r.customerName}</Txt>
              <Txt size={12} color={colors.muted}>{dateTime(r.createdAt)} · đơn #{r.orderId}</Txt>
            </View>
          </ListRow>
        ))}
      </Card>
    </Page>
  );
}

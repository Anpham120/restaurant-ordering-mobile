import { useState } from 'react';
import { Text } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Muted, Row, Screen } from '@/components/screen';
import { api, errorMessage } from '@/lib/api';
import { requestTypeLabel } from '@/lib/format';
import { usePoll } from '@/lib/use-poll';

export default function Requests() {
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll(() => api.openRequests(), 5000);

  const done = async (id: number) => {
    setActionError(null);
    try { await api.doneRequest(id); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      {data && data.length === 0 ? <Muted>Không có yêu cầu nào.</Muted> : null}
      {data?.map((r) => (
        <Card key={r.id}>
          <Row>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>Bàn {r.tableCode}</Text>
            <Badge label={requestTypeLabel[r.type]} status="OPEN" />
          </Row>
          <Muted>{new Date(r.createdAt).toLocaleTimeString()}</Muted>
          <Button small title="Xong" onPress={() => done(r.id)} />
        </Card>
      ))}
    </Screen>
  );
}

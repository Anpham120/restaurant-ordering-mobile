import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Empty } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
      <Empty icon="compass-outline" title="Không tìm thấy trang" text="Đường dẫn không tồn tại hoặc đã thay đổi."
        action={<Button title="Về trang chủ" onPress={() => router.replace('/')} />} />
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Txt } from '@/components/txt';
import { colors } from '@/lib/theme';
import { passwordRules } from '@/lib/validate';

/** Live checklist under a new-password field: each requirement turns green when met. */
export function PasswordRules({ value }: { value: string }) {
  if (!value) return null;
  return (
    <View style={{ gap: 3, marginTop: -4 }} accessibilityLabel="Yêu cầu mật khẩu">
      {passwordRules(value).map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.ok ? colors.success : colors.faint} />
          <Txt size={12} color={r.ok ? colors.success : colors.muted}>{r.label}</Txt>
        </View>
      ))}
    </View>
  );
}

import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Button } from './button';
import { Sheet } from './modal';
import { Txt } from './txt';
import { Notice } from './ui';

interface Target { id: number; fullName: string; phone: string }
interface Issued { name: string; phone: string; password: string }

/**
 * Manager resets an account's password: the API returns a one-time temporary password, the user
 * must set a new one at the next sign-in. Returns the action plus the dialog that shows the result.
 */
export function useResetPassword() {
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  const reset = async (u: Target) => {
    if (!(await confirmAction(`Đặt lại mật khẩu cho ${u.fullName} (${u.phone})? Mật khẩu cũ sẽ không dùng được nữa và tài khoản bị đăng xuất khỏi mọi thiết bị.`, 'Đặt lại mật khẩu'))) return;
    setBusy(u.id);
    try {
      const r = await api.resetUserPassword(u.id);
      setIssued({ name: u.fullName, phone: u.phone, password: r.temporaryPassword });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  const copy = async () => {
    if (!issued) return;
    try { await Clipboard.setStringAsync(issued.password); toast.show('Đã sao chép mật khẩu tạm', 'success'); }
    catch { toast.show('Không sao chép được, vui lòng đọc trực tiếp', 'error'); }
  };

  const dialog = (
    <Sheet visible={!!issued} onClose={() => setIssued(null)} title="Mật khẩu tạm" width={460}
      footer={<Button title="Xong" onPress={() => setIssued(null)} />}>
      {issued ? (
        <View style={{ gap: 12 }}>
          <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }}>
            Mật khẩu của <Txt weight="bold" size={14}>{issued.name}</Txt> ({issued.phone}) đã được đặt lại.
          </Txt>
          <View style={styles.box}>
            <Txt weight="extrabold" size={26} style={styles.pw} selectable accessibilityLabel={`Mật khẩu tạm ${issued.password.split('').join(' ')}`}>
              {issued.password}
            </Txt>
            <Button title="Sao chép" size="sm" variant="secondary" icon="copy-outline" onPress={() => void copy()} />
          </View>
          <Notice icon="call-outline" tone="info"
            text="Gọi đúng số điện thoại của tài khoản và đọc mật khẩu này cho khách. Khi đăng nhập, khách sẽ được yêu cầu đặt mật khẩu mới." />
          <Txt size={12} color={colors.muted}>Mật khẩu chỉ hiện một lần – đóng hộp thoại là không xem lại được.</Txt>
        </View>
      ) : null}
    </Sheet>
  );

  return { reset, busy, dialog };
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  pw: { flex: 1, letterSpacing: 2, fontVariant: ['tabular-nums'] },
});

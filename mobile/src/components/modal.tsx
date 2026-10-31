import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/lib/theme';
import { Button } from './button';
import { Txt } from './txt';
import { Field } from './ui';

/** Centered dialog on wide screens, bottom sheet on phones. */
export function Sheet({ visible, onClose, title, children, footer, width = 520 }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={[styles.sheet, { maxWidth: width }]}>
          <View style={styles.head}>
            <Txt weight="extrabold" size={18} style={{ flex: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Asks for a reason before a cancellation; the reason is required. */
export function ReasonDialog({ visible, title, placeholder, confirmLabel = 'Xác nhận hủy', onCancel, onConfirm, suggestions = [] }: {
  visible: boolean; title: string; placeholder?: string; confirmLabel?: string; onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void; suggestions?: string[];
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setReason(''); onCancel(); };
  const submit = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); setReason(''); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={close} title={title} width={460}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Quay lại" variant="secondary" onPress={close} style={{ flex: 1 }} />
        <Button title={confirmLabel} variant="primary" onPress={submit} loading={busy} disabled={!reason.trim()} style={{ flex: 1 }} />
      </View>}>
      {suggestions.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => setReason(s)} accessibilityRole="button"
              style={[styles.suggest, reason === s && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
              <Txt size={13} weight="semibold" color={reason === s ? colors.primaryText : colors.textSoft}>{s}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field label="Lý do" value={reason} onChangeText={setReason} placeholder={placeholder ?? 'Nhập lý do'} multiline maxLength={250} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxHeight: '90%', backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 14 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  suggest: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});

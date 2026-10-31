import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useWide } from '@/lib/hooks';
import { colors, radius } from '@/lib/theme';
import { Button } from './button';
import { Sheet } from './modal';
import { Txt } from './txt';

/** Edit form shown as a side panel on wide screens, as a sheet on phones. */
export function EditorPanel({ open, title, onClose, onSave, saving, canSave = true, extra, children }: {
  open: boolean; title: string; onClose: () => void; onSave: () => void; saving?: boolean; canSave?: boolean; extra?: ReactNode; children: ReactNode;
}) {
  const wide = useWide(1200);
  if (!open) return null;
  const footer = (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      <Button title="Lưu thay đổi" onPress={onSave} loading={saving} disabled={!canSave} style={{ flexGrow: 1 }} />
      {extra}
      <Button title="Đóng" variant="secondary" onPress={onClose} />
    </View>
  );
  if (!wide) return <Sheet visible onClose={onClose} title={title} footer={footer}>{children}</Sheet>;
  return (
    <View style={styles.panel} accessibilityLabel={title}>
      <Txt weight="extrabold" size={18}>{title}</Txt>
      {children}
      {footer}
    </View>
  );
}

/** Lays out a list next to its editor panel. */
export function WithEditor({ list, editor }: { list: ReactNode; editor: ReactNode }) {
  return (
    <View style={styles.split}>
      <View style={{ flex: 3, minWidth: 0, gap: 14 }}>{list}</View>
      {editor}
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  panel: { width: 340, backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 12 },
});

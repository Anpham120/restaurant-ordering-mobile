import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useWide } from '@/lib/hooks';
import { colors, radius } from '@/lib/theme';
import { Button } from './button';
import { Sheet } from './modal';
import { Txt } from './txt';

/** Edit form shown as a side panel on wide screens, as a sheet on phones. */
export function EditorPanel({ open, title, onClose, onSave, saving, problems = [], extra, children }: {
  open: boolean; title: string; onClose: () => void; onSave: () => void; saving?: boolean;
  /** What still blocks saving, in words; the save button stays disabled while the list is not empty. */
  problems?: string[]; extra?: ReactNode; children: ReactNode;
}) {
  const wide = useWide(1200);
  if (!open) return null;
  const footer = (
    <View style={{ gap: 10 }}>
      <SaveBlockers problems={problems} />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Button title="Lưu thay đổi" onPress={onSave} loading={saving} disabled={problems.length > 0} style={{ flexGrow: 1 }} />
        {extra}
        <Button title="Đóng" variant="secondary" onPress={onClose} />
      </View>
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

/** Why a save button is disabled: one line per problem, next to the button so it is seen. */
export function SaveBlockers({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null;
  return (
    <View style={styles.blockers} accessibilityRole="alert">
      <Txt weight="semibold" size={13} color={colors.danger}>Chưa lưu được:</Txt>
      {problems.map((p) => <Txt key={p} size={13} color={colors.danger} style={{ lineHeight: 18 }}>- {p}</Txt>)}
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
  blockers: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  panel: { width: 340, backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 12 },
});

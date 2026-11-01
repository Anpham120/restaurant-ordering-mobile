import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { api, errorMessage, type MenuItem, type OptionGroupInput } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Button } from './button';
import { Sheet } from './modal';
import { Txt } from './txt';
import { Toggle } from './ui';

interface DraftOption { id?: number | null; name: string; price: string; available: boolean }
interface DraftGroup { key: string; id?: number | null; name: string; min: string; max: string; options: DraftOption[] }

let seq = 0;
const key = () => `g${++seq}`;

function toDraft(item: MenuItem): DraftGroup[] {
  return item.optionGroups.map((g) => ({
    key: key(), id: g.id, name: g.name, min: String(g.minSelect), max: String(g.maxSelect),
    options: g.options.map((o) => ({ id: o.id, name: o.name, price: String(o.priceDelta), available: o.available })),
  }));
}

/** Edits the option groups of a dish (size, topping…): choose min/max per group, extra price and stock per option. */
export function OptionsEditor({ item, onClose, onSaved }: { item: MenuItem; onClose: () => void; onSaved: (m: MenuItem) => void }) {
  const toast = useToast();
  const [groups, setGroups] = useState<DraftGroup[]>(() => toDraft(item));
  const [saving, setSaving] = useState(false);

  const setGroup = (k: string, patch: Partial<DraftGroup>) => setGroups((gs) => gs.map((g) => (g.key === k ? { ...g, ...patch } : g)));
  const setOption = (k: string, i: number, patch: Partial<DraftOption>) =>
    setGroups((gs) => gs.map((g) => (g.key === k ? { ...g, options: g.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) } : g)));

  const problem = (() => {
    for (const g of groups) {
      if (!g.name.trim()) return 'Mỗi nhóm cần có tên';
      if (!g.options.length) return `Nhóm "${g.name}" chưa có tùy chọn`;
      if (g.options.some((o) => !o.name.trim() || !/^\d+$/.test(o.price))) return `Nhóm "${g.name}": tên và giá thêm (số) của tùy chọn không hợp lệ`;
      const min = Number(g.min), max = Number(g.max);
      if (!/^\d+$/.test(g.min) || !/^\d+$/.test(g.max) || max < 1) return `Nhóm "${g.name}": số chọn tối thiểu/tối đa không hợp lệ`;
      if (min > max) return `Nhóm "${g.name}": tối thiểu lớn hơn tối đa`;
      if (max > g.options.length) return `Nhóm "${g.name}": tối đa vượt số tùy chọn`;
    }
    return null;
  })();

  const save = async () => {
    setSaving(true);
    const body: OptionGroupInput[] = groups.map((g) => ({
      id: g.id ?? null, name: g.name.trim(), minSelect: Number(g.min), maxSelect: Number(g.max),
      options: g.options.map((o) => ({ id: o.id ?? null, name: o.name.trim(), priceDelta: Number(o.price), available: o.available })),
    }));
    try {
      const m = await api.setOptions(item.id, body);
      onSaved(m);
      toast.show(`Đã lưu tùy chọn của "${m.name}"`, 'success');
      onClose();
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };

  return (
    <Sheet visible onClose={onClose} title={`Tùy chọn · ${item.name}`} width={640}
      footer={<View style={{ gap: 8 }}>
        {problem ? <Txt size={13} color={colors.danger}>{problem}</Txt> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Lưu tùy chọn" onPress={save} loading={saving} disabled={!!problem} style={{ flex: 1 }} />
          <Button title="Đóng" variant="secondary" onPress={onClose} />
        </View>
      </View>}>
      <Txt size={13} color={colors.muted}>
        Ví dụ: nhóm “Size” chọn đúng 1 (tối thiểu 1, tối đa 1); nhóm “Topping” không bắt buộc, tối đa 3. Tùy chọn đã có trong đơn hàng không xóa được – hãy tắt “Còn”.
      </Txt>
      {groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <View style={styles.groupHead}>
            <TextInput value={g.name} onChangeText={(v) => setGroup(g.key, { name: v })} placeholder="Tên nhóm (Size, Topping…)" placeholderTextColor={colors.faint}
              style={[styles.input, { flex: 1, fontFamily: fonts.bold }]} maxLength={60} accessibilityLabel="Tên nhóm" />
            <Pressable accessibilityRole="button" accessibilityLabel={`Xóa nhóm ${g.name}`} onPress={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))} style={styles.icon}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
          <View style={styles.minmax}>
            <Txt size={13} color={colors.textSoft}>Chọn tối thiểu</Txt>
            <TextInput value={g.min} onChangeText={(v) => setGroup(g.key, { min: v.replace(/\D/g, '') })} keyboardType="numeric" style={[styles.input, styles.small]} accessibilityLabel="Chọn tối thiểu" />
            <Txt size={13} color={colors.textSoft}>tối đa</Txt>
            <TextInput value={g.max} onChangeText={(v) => setGroup(g.key, { max: v.replace(/\D/g, '') })} keyboardType="numeric" style={[styles.input, styles.small]} accessibilityLabel="Chọn tối đa" />
            <Txt size={12} color={Number(g.min) > 0 ? colors.primaryText : colors.muted}>{Number(g.min) > 0 ? 'Bắt buộc' : 'Không bắt buộc'}</Txt>
          </View>
          {g.options.map((o, i) => (
            <View key={i} style={styles.option}>
              <TextInput value={o.name} onChangeText={(v) => setOption(g.key, i, { name: v })} placeholder="Tên tùy chọn" placeholderTextColor={colors.faint}
                style={[styles.input, { flex: 1 }]} maxLength={60} accessibilityLabel="Tên tùy chọn" />
              <Txt size={13} color={colors.muted}>+</Txt>
              <TextInput value={o.price} onChangeText={(v) => setOption(g.key, i, { price: v.replace(/\D/g, '') })} keyboardType="numeric"
                style={[styles.input, { width: 90 }]} accessibilityLabel="Giá thêm" />
              <Txt size={13} color={colors.muted}>đ</Txt>
              <Toggle value={o.available} onChange={(v) => setOption(g.key, i, { available: v })} label={`Còn ${o.name}`} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${o.name}`} style={styles.icon}
                onPress={() => setGroups((gs) => gs.map((x) => (x.key === g.key ? { ...x, options: x.options.filter((_, j) => j !== i) } : x)))}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setGroup(g.key, { options: [...g.options, { name: '', price: '0', available: true }] })} style={styles.add}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Txt weight="semibold" size={13} color={colors.primary}>Thêm tùy chọn</Txt>
          </Pressable>
        </View>
      ))}
      <Button title="Thêm nhóm tùy chọn" icon="add" variant="soft"
        onPress={() => setGroups((gs) => [...gs, { key: key(), name: '', min: '0', max: '1', options: [{ name: '', price: '0', available: true }] }])} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 12, gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  minmax: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 42, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  small: { width: 54, textAlign: 'center' },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
});

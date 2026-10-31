import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';

interface Props extends TextInputProps { label?: string }

export function Field({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff', color: colors.text },
});

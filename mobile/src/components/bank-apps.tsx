import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { BankApp } from '@/lib/api';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Txt } from './txt';

/** Grid of banking apps; each opens the app (VietQR deeplink) with account, amount and content already filled in. */
export function BankAppGrid({ apps }: { apps: BankApp[] }) {
  const toast = useToast();
  const open = async (a: BankApp) => {
    try { await Linking.openURL(a.url); } catch { toast.show(`Không mở được ${a.name}. Hãy mở app thủ công và quét mã QR.`, 'error'); }
  };
  return (
    <View style={styles.grid}>
      {apps.map((a) => (
        <View key={a.appId} style={styles.cell}>
          <Pressable onPress={() => void open(a)} accessibilityRole="link" accessibilityLabel={`Mở ${a.name} để thanh toán`}
            style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Logo app={a} />
            <Txt size={longestWord(shortName(a.name)) > 10 ? 10 : 11} weight="semibold" color={colors.textSoft} numberOfLines={2} style={styles.name}>{shortName(a.name)}</Txt>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Logo({ app }: { app: BankApp }) {
  const [failed, setFailed] = useState(false);
  if (failed || !app.logoUrl) {
    return (
      <View style={[styles.logo, styles.fallback]}>
        <Txt weight="extrabold" size={15} color={colors.primaryText}>{bankInitials(app.name)}</Txt>
      </View>
    );
  }
  return <Image source={{ uri: app.logoUrl }} style={styles.logo} contentFit="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
}

/** Drops generic app suffixes so names fit a narrow tile: "Techcombank Mobile" → "Techcombank" (full name stays in the a11y label). */
function shortName(name: string): string {
  const short = name.replace(/\s+(Mobile|SmartBanking|Digibank|Plus)$/i, '');
  return short || name;
}

const longestWord = (s: string) => Math.max(...s.split(/\s+/).map((w) => w.length));

/** "VCB Digibank" → "VD", "CAKE" → "CA". */
function bankInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '25%', padding: 3 },
  tile: {
    alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 2,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { textAlign: 'center', lineHeight: 14, minHeight: 28 },
});

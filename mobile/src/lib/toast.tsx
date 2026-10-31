import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/txt';
import { colors, radius, shadowStrong } from './theme';

type Tone = 'success' | 'error' | 'info';
interface ToastValue { show: (message: string, tone?: Tone) => void }

const Ctx = createContext<ToastValue | null>(null);

/** Small message bar at the bottom of the screen (errors from the API, confirmations). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 4500 : 2600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const icon = toast?.tone === 'success' ? 'checkmark-circle' : toast?.tone === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = toast?.tone === 'success' ? '#4ADE80' : toast?.tone === 'error' ? '#FCA5A5' : '#FDBA74';

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 12 }]}>
          <View style={[styles.toast, shadowStrong]} accessibilityRole="alert">
            <Ionicons name={icon} size={20} color={iconColor} />
            <Txt weight="medium" style={styles.text}>{toast.message}</Txt>
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast(): ToastValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast outside ToastProvider');
  return v;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  toast: {
    maxWidth: 460, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.text,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg,
  },
  text: { color: colors.white, fontSize: 14, flexShrink: 1 },
});

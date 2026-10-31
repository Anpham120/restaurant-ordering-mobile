import { Platform } from 'react-native';

export const colors = {
  primary: '#C2410C',
  primaryPressed: '#9A3412',
  primarySoft: '#FFF1E8',
  primaryText: '#9A3412',
  text: '#1C1917',
  textSoft: '#44403C',
  muted: '#6B625C',
  faint: '#A8A29E',
  border: '#ECE6E1',
  divider: '#F1ECE8',
  bg: '#F7F4F2',
  input: '#F4EFEC',
  card: '#FFFFFF',
  white: '#FFFFFF',
  success: '#15803D',
  successSoft: '#ECFDF3',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningText: '#92400E',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  neutralSoft: '#F1ECE8',
  neutralText: '#57534E',
  sidebar: '#1C1917',
  sidebarText: '#E7E5E4',
  star: '#E8A317',
  kitchenBg: '#171412',
  kitchenCard: '#292524',
  kitchenText: '#F5F5F4',
  kitchenMuted: '#A8A29E',
  kitchenLine: '#44403C',
  kitchenAccent: '#FDBA74',
  noteBg: '#FCD34D',
} as const;

export const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extrabold: 'BeVietnamPro_800ExtraBold',
} as const;

export type Weight = keyof typeof fonts;

export const radius = { sm: 8, md: 10, lg: 14, xl: 16, pill: 999 } as const;

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(28,25,23,0.06)' },
  default: { shadowColor: '#1C1917', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});

export const shadowStrong = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(28,25,23,0.25)' },
  default: { shadowColor: '#1C1917', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});

import { Text, type TextProps } from 'react-native';

import { colors, fonts, type Weight } from '@/lib/theme';

interface Props extends TextProps { weight?: Weight; size?: number; color?: string }

/** Text in Be Vietnam Pro; `weight` picks the font file (custom fonts ignore fontWeight). */
export function Txt({ weight = 'regular', size = 14, color = colors.text, style, ...rest }: Props) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

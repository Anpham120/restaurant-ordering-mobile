import { Platform, ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * Keyboard handling for forms. On Android (edge-to-edge) and iOS the on-screen keyboard is drawn over the app, so a field near
 * the bottom would be hidden behind it. These wrappers scroll the focused field above the keyboard (KeyboardScroll) or lift
 * the whole content (KeyboardAvoid). On the web there is no on-screen keyboard: plain ScrollView / View.
 */
export function KeyboardScroll({ bottomOffset = 56, ...props }: ScrollViewProps & { bottomOffset?: number }) {
  if (Platform.OS === 'web') return <ScrollView keyboardShouldPersistTaps="handled" {...props} />;
  return <KeyboardAwareScrollView bottomOffset={bottomOffset} keyboardShouldPersistTaps="handled" {...props} />;
}

export function KeyboardAvoid(props: ViewProps) {
  if (Platform.OS === 'web') return <View {...props} />;
  return <KeyboardAvoidingView behavior="padding" {...props} />;
}

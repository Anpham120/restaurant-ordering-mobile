import { Alert, Platform } from 'react-native';

/** Cross-platform yes/no dialog (Alert buttons do not work on web). */
export function confirmAction(message: string, ok = 'Đồng ý'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Xác nhận', message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

import { Alert, Platform } from 'react-native';

/** Cross-platform yes/no dialog (Alert buttons do not work on web). */
export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Xác nhận', message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Đồng ý', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
  } else {
    Alert.alert('Thông báo', message);
  }
}

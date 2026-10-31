import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL:
 * 1. EXPO_PUBLIC_API_URL when set at build time;
 * 2. on web served from a real domain, the same origin (nginx proxies /api);
 * 3. in development, the machine running Metro on port 8080.
 */
export function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') return origin;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8080`;
}

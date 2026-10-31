import Constants from 'expo-constants';

/** Backend base URL: env override, else the dev machine running Metro (port 8080), else localhost. */
export function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8080`;
  return 'http://localhost:8080';
}

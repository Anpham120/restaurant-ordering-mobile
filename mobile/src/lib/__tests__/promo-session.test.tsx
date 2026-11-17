import { beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';

import { api, setUnauthorizedHandler, type User } from '../api';
import { useHiddenPromos } from '../hidden-promos';
import { SessionProvider, useSession } from '../session';
import { dismissWelcome, lastDismissedWelcome } from '../welcome';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../api', () => ({
  api: { login: jest.fn(), register: jest.fn(), me: jest.fn() },
  setAuthToken: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
  setMustChangePasswordHandler: jest.fn(),
}));

const LEGACY_KEY = 'atlas.promo.hidden.v1';
const user: User = {
  id: 1, fullName: 'Customer A', phone: '0900000001', email: null,
  role: 'CUSTOMER', active: true, createdAt: '2026-11-17T00:00:00',
  mustChangePassword: false, marketingOptIn: true,
};
const auth = { token: 'test-token', expiresAt: '2026-11-18T00:00:00', user };
const registration = { fullName: 'Customer B', phone: '0900000002', password: 'test-password' };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.mocked(api.login).mockResolvedValue(auth);
  jest.mocked(api.register).mockResolvedValue({ ...auth, user: { ...user, id: 2 } });
  jest.mocked(api.me).mockResolvedValue(user);
});

async function mountSession() {
  const view = await renderHook(() => ({ session: useSession(), promos: useHiddenPromos() }), {
    wrapper: SessionProvider,
  });
  await waitFor(() => expect(view.result.current.session.ready && view.result.current.promos.ready).toBe(true));
  return view;
}

it('ignores and removes the old device-wide preference', async () => {
  await AsyncStorage.setItem(LEGACY_KEY, '[101]');
  const { result } = await mountSession();

  expect(result.current.promos.hidden.has(101)).toBe(false);
  expect(await AsyncStorage.getItem(LEGACY_KEY)).toBeNull();
});

it('does not persist muted IDs or restore them after a fresh app run', async () => {
  const first = await mountSession();
  await act(() => first.result.current.promos.hide(101));
  expect(first.result.current.promos.hidden.has(101)).toBe(true);
  expect(await AsyncStorage.getItem(LEGACY_KEY)).toBeNull();

  await first.unmount();
  const second = await mountSession();
  expect(second.result.current.promos.hidden.has(101)).toBe(false);
});

it('shows the campaign again after logging out and logging in with the same account', async () => {
  const { result } = await mountSession();
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  const firstWelcome = result.current.session.welcomeSeq;
  await act(() => result.current.promos.hide(101));
  expect(result.current.promos.hidden.has(101)).toBe(true);

  await act(() => result.current.session.logout());
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });

  expect(result.current.session.welcomeSeq).toBeGreaterThan(firstWelcome);
  expect(result.current.promos.hidden.has(101)).toBe(false);
});

it('starts registration with no campaigns muted by the previous account', async () => {
  const { result } = await mountSession();
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  await act(() => result.current.promos.hide(101));
  await act(() => result.current.session.logout());
  await act(async () => { await result.current.session.register(registration); });

  expect(result.current.session.user?.id).toBe(2);
  expect(result.current.promos.hidden.has(101)).toBe(false);
});

it.each(['login', 'register'] as const)('clears guest choices after successful %s', async (method) => {
  const { result } = await mountSession();
  await act(() => result.current.promos.hide(101));
  await act(async () => {
    if (method === 'login') await result.current.session.login(user.phone, 'test-password');
    else await result.current.session.register(registration);
  });

  expect(result.current.promos.hidden.has(101)).toBe(false);
});

it.each(['login', 'register'] as const)('preserves choices when %s fails', async (method) => {
  const { result } = await mountSession();
  await act(() => result.current.promos.hide(101));
  const welcome = result.current.session.welcomeSeq;
  jest.mocked(api[method]).mockRejectedValueOnce(new Error('Authentication failed'));

  await act(async () => {
    const request = method === 'login'
      ? result.current.session.login(user.phone, 'wrong-password')
      : result.current.session.register(registration);
    await expect(request).rejects.toThrow('Authentication failed');
  });

  expect(result.current.promos.hidden.has(101)).toBe(true);
  expect(result.current.session.welcomeSeq).toBe(welcome);
});

it.each(['logout', 'expired'] as const)('clears muted campaigns on %s', async (reason) => {
  const { result } = await mountSession();
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  await act(() => result.current.promos.hide(101));

  await act(() => {
    if (reason === 'logout') result.current.session.logout();
    else jest.mocked(setUnauthorizedHandler).mock.calls.at(-1)?.[0]?.();
  });

  expect(result.current.session.user).toBeNull();
  expect(result.current.promos.hidden.has(101)).toBe(false);
});

it('keeps session choices when profile or auth token is refreshed', async () => {
  const { result } = await mountSession();
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  await act(() => result.current.promos.hide(101));
  await act(() => result.current.session.setUser({ ...user, fullName: 'Updated name' }));
  expect(result.current.promos.hidden.has(101)).toBe(true);
  await act(() => { result.current.session.acceptAuth({ ...auth, token: 'refreshed-token' }); });
  expect(result.current.promos.hidden.has(101)).toBe(true);
});

it('preserves choices when the home consumer remounts within the same provider', async () => {
  let promos: ReturnType<typeof useHiddenPromos>;
  function HomeProbe() { promos = useHiddenPromos(); return null; }
  const view = await render(<SessionProvider><HomeProbe key="first" /></SessionProvider>);
  await waitFor(() => expect(promos.ready).toBe(true));
  await act(() => promos.hide(101));

  await view.rerender(<SessionProvider><HomeProbe key="second" /></SessionProvider>);
  expect(promos!.hidden.has(101)).toBe(true);
});

it('closing the welcome with X does not mute campaigns for the next login', async () => {
  const { result } = await mountSession();
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  dismissWelcome(result.current.session.welcomeSeq);
  expect(result.current.promos.hidden.size).toBe(0);

  await act(() => result.current.session.logout());
  await act(async () => { await result.current.session.login(user.phone, 'test-password'); });
  expect(result.current.session.welcomeSeq).toBeGreaterThan(lastDismissedWelcome());
  expect(result.current.promos.hidden.size).toBe(0);
});

it('does not block the session when removing the old preference fails', async () => {
  await AsyncStorage.setItem(LEGACY_KEY, '[101]');
  jest.mocked(AsyncStorage.removeItem).mockRejectedValueOnce(new Error('Storage unavailable'));
  const { result } = await mountSession();

  expect(result.current.promos.hidden.size).toBe(0);
});

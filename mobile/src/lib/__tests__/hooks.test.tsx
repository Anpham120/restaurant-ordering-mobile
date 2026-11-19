import { expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useLoad } from '../hooks';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

it('does not replace signed-in promotions with a late guest response', async () => {
  const guest = deferred<number[]>();
  const customer = deferred<number[]>();
  const { result, rerender } = await renderHook(
    ({ account }: { account: string }) => useLoad(() => account === 'guest' ? guest.promise : customer.promise, [account]),
    { initialProps: { account: 'guest' } },
  );
  await rerender({ account: 'customer' });
  await act(async () => customer.resolve([3]));
  expect(result.current.data).toEqual([3]);

  await act(async () => guest.resolve([2, 3]));
  expect(result.current.data).toEqual([3]);
});

it('does not display a stale request error after a new account loads successfully', async () => {
  const previous = deferred<number[]>();
  const next = deferred<number[]>();
  const { result, rerender } = await renderHook(
    ({ account }: { account: number }) => useLoad(() => account === 1 ? previous.promise : next.promise, [account]),
    { initialProps: { account: 1 } },
  );
  await rerender({ account: 2 });
  await act(async () => next.resolve([2, 3]));
  await act(async () => previous.reject(new Error('Previous account failed')));

  expect(result.current.data).toEqual([2, 3]);
  expect(result.current.error).toBeNull();
});

it('keeps the latest explicit reload when responses finish out of order', async () => {
  const first = deferred<number[]>();
  const second = deferred<number[]>();
  const load = jest.fn<() => Promise<number[]>>()
    .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const { result } = await renderHook(() => useLoad(load));
  let reloading!: Promise<void>;
  await act(() => { reloading = result.current.reload(); });
  await act(async () => { second.resolve([2, 3]); await reloading; });
  await act(async () => first.resolve([3]));

  expect(result.current.data).toEqual([2, 3]);
});

it('does not overlap slow polling requests or discard every result', async () => {
  jest.useFakeTimers();
  const first = deferred<number[]>();
  const load = jest.fn<() => Promise<number[]>>()
    .mockReturnValueOnce(first.promise).mockResolvedValue([2, 3]);
  const view = await renderHook(() => useLoad(load, [], 3000));
  try {
    await act(async () => { jest.advanceTimersByTime(9000); });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => first.resolve([3]));
    expect(view.result.current.data).toEqual([3]);
    expect(view.result.current.loading).toBe(false);
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(load).toHaveBeenCalledTimes(2);
    expect(view.result.current.data).toEqual([2, 3]);
  } finally {
    await view.unmount();
    jest.useRealTimers();
  }
});

import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import Home from '@/app/(customer)/index';
import type { Promotion } from '@/lib/api';
import { SessionProvider } from '@/lib/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/api', () => ({
  api: {}, setAuthToken: jest.fn(), setUnauthorizedHandler: jest.fn(), setMustChangePasswordHandler: jest.fn(),
}));
jest.mock('@/lib/hooks', () => ({
  useLoad: () => ({ data: mockHomeData, error: null, loading: false, reload: jest.fn() }),
}));
jest.mock('@/lib/welcome', () => ({ lastDismissedWelcome: () => 0, dismissWelcome: jest.fn() }));
jest.mock('@/lib/cart', () => ({
  useCart: () => ({ plainLine: () => undefined, setVoucherHint: jest.fn() }),
}));
jest.mock('@/lib/use-cart-change', () => ({ useCartChange: () => ({ setPlain: jest.fn() }) }));
jest.mock('@/lib/notifications', () => ({ useUnread: () => ({ count: 0, promotions: 0 }) }));
jest.mock('@/lib/toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@/components/cart-bar', () => ({ CartBar: () => null }));
jest.mock('@/components/dish', () => ({ DishCard: () => null, DishRow: () => null }));
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FoodImage: () => null,
    SearchBox: (props: object) => React.createElement(TextInput, props),
    Empty: () => null, ErrorBox: () => null, Loading: () => null, Notice: () => null,
  };
});
jest.mock('@/components/modal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Sheet: ({ visible, children, footer, onClose }: {
      visible: boolean; children: import('react').ReactNode; footer?: import('react').ReactNode; onClose: () => void;
    }) => visible ? React.createElement(React.Fragment, null,
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: 'Đóng ưu đãi', onPress: onClose }),
      children, footer) : null,
  };
});

const voucher: Promotion = {
  id: 2, title: 'Giảm 10% đơn đầu tiên', subtitle: null, imageUrl: '', targetType: 'VOUCHER',
  menuItemId: null, menuItemName: null, categoryId: null, categoryName: null,
  voucherId: 1, voucherCode: 'TEST10', startAt: null, endAt: null,
  sortOrder: 0, active: true, live: true, notified: false, announceAt: null, announcedAt: null,
};
const drinks: Promotion = {
  ...voucher, id: 3, title: 'Đồ uống mát lạnh giao tận nơi', targetType: 'CATEGORY',
  categoryId: 4, categoryName: 'Đồ uống', voucherId: null, voucherCode: null,
};
const mockHomeData = {
  store: { openNow: true, hotline: '0900000000' },
  categories: [{ id: 4, name: 'Đồ uống', imageUrl: null }],
  menu: [], popular: [], vouchers: [], address: null, promotions: [voucher, drinks],
};

beforeEach(() => { jest.clearAllMocks(); mockHomeData.promotions = [voucher, drinks]; });

async function mountHome() {
  await render(<SessionProvider><Home /></SessionProvider>);
  await screen.findByRole('button', { name: 'Đóng' });
}

function expectBothBanners(second: Promotion = drinks) {
  expect(screen.getByLabelText(/Chương trình \d+ trên 2/)).toBeTruthy();
  expect(screen.getByRole('button', { name: voucher.title })).toBeTruthy();
  expect(screen.getByRole('button', { name: second.title })).toBeTruthy();
}

it('keeps both home banners and pagination after X closes the popup', async () => {
  await mountHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }));
  expectBothBanners();
});

it('keeps both home banners and pagination after opening the advertised category', async () => {
  await mountHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thực đơn' }));
  expectBothBanners();
});

it('keeps both home banners and pagination while viewing or dismissing a voucher', async () => {
  await mountHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Lấy mã ưu đãi' }));
  expect(screen.getByRole('button', { name: 'Sao chép mã' })).toBeTruthy();
  expectBothBanners();
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng ưu đãi' }));
  expect(screen.queryByRole('button', { name: 'Sao chép mã' })).toBeNull();
  expectBothBanners();
});

it('keeps both home banners and pagination after opening an advertised dish', async () => {
  const item: Promotion = { ...drinks, id: 4, title: 'Món mới', targetType: 'MENU_ITEM', menuItemId: 11, categoryId: null };
  mockHomeData.promotions = [voucher, item];
  await mountHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem món' }));
  expect(router.push).toHaveBeenCalledWith('/item/11');
  expectBothBanners(item);
});

it('only removes a muted campaign from the popup, retaining both home banners', async () => {
  await mountHome();
  await fireEvent.press(screen.getByRole('button', {
    name: `Không hiển thị lại quảng cáo ${drinks.title} trong phiên này`,
  }));
  expect(screen.queryByRole('button', { name: 'Xem thực đơn' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Lấy mã ưu đãi' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }));
  expectBothBanners();
});

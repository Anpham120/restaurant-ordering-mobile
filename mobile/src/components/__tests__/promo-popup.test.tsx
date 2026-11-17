import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Promotion } from '@/lib/api';
import { PromoPopup } from '../promo-popup';

jest.mock('@/components/ui', () => ({ FoodImage: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const campaign: Promotion = {
  id: 101, title: 'Ưu đãi hôm nay', subtitle: null, imageUrl: '', targetType: 'NONE',
  menuItemId: null, menuItemName: null, categoryId: null, categoryName: null,
  voucherId: null, voucherCode: null, startAt: null, endAt: null,
  sortOrder: 0, active: true, live: true, notified: false,
  announceAt: null, announcedAt: null,
};

it('X closes the popup without muting the campaign', async () => {
  const onClose = jest.fn();
  const onHide = jest.fn();
  await render(<PromoPopup promotions={[campaign]} visible onClose={onClose} onHide={onHide} onOpen={jest.fn()} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onHide).not.toHaveBeenCalled();
});

it('the session mute button identifies and hides only the selected campaign', async () => {
  const onHide = jest.fn();
  const onClose = jest.fn();
  const second = { ...campaign, id: 102, title: 'Ưu đãi thứ hai' };
  await render(<PromoPopup promotions={[campaign, second]} visible onClose={onClose} onHide={onHide} onOpen={jest.fn()} />);

  expect(screen.getAllByText('Không hiển thị lại trong phiên này')).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: `Không hiển thị lại quảng cáo ${second.title} trong phiên này` }));

  expect(onHide).toHaveBeenCalledTimes(1);
  expect(onHide).toHaveBeenCalledWith(second);
  expect(onClose).not.toHaveBeenCalled();
});

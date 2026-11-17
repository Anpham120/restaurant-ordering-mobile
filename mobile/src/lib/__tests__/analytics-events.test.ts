import { describe, expect, it } from '@jest/globals';

import type { CartLine, MenuItem, Order } from '../api';
import { createTracker, measured, purchaseParams, screenName, type AnalyticsBackend } from '../analytics-events';

function fakeBackend() {
  const calls: unknown[][] = [];
  const backend: AnalyticsBackend = {
    enable: (on) => calls.push(['enable', on]),
    setUser: (id, props) => calls.push(['setUser', id, props]),
    screen: (name) => calls.push(['screen', name]),
    event: (name, params) => calls.push(['event', name, params]),
  };
  return { calls, backend };
}

const line: CartLine = {
  lineId: 1, menuItemId: 7, name: 'Phở bò', imageUrl: null, basePrice: 50000, options: [], unitPrice: 55000,
  quantity: 2, note: null, lineTotal: 110000, orderable: true, problem: null,
};

describe('analytics events', () => {
  it('measures guests and customers only', () => {
    expect(measured(null)).toBe(true);
    expect(measured('CUSTOMER')).toBe(true);
    for (const r of ['STAFF', 'KITCHEN', 'MANAGER', 'SHIPPER'] as const) expect(measured(r)).toBe(false);
  });

  it('groups screens with ids', () => {
    expect(screenName('/order/123')).toBe('/order/[id]');
    expect(screenName('/pay/9/qr')).toBe('/pay/[id]/qr');
    expect(screenName('/')).toBe('/');
    expect(screenName('/cart')).toBe('/cart');
  });

  it('holds the first screen until the user is known, then sends it', () => {
    const { calls, backend } = fakeBackend();
    const t = createTracker(backend);
    t.screen('/item/5');
    expect(calls).toEqual([]);
    t.identify({ id: 42, role: 'CUSTOMER' });
    expect(calls).toEqual([['enable', true], ['setUser', '42', { role: 'customer' }], ['screen', '/item/[id]']]);
  });

  it('sends nothing for a staff account and clears the user id', () => {
    const { calls, backend } = fakeBackend();
    const t = createTracker(backend);
    t.screen('/store/orders');
    t.identify({ id: 3, role: 'STAFF' });
    t.login();
    t.screen('/store/kitchen');
    expect(calls).toEqual([['enable', false], ['setUser', null, { role: null }]]);
  });

  it('keeps a guest anonymous', () => {
    const { calls, backend } = fakeBackend();
    createTracker(backend).identify(null);
    expect(calls).toEqual([['enable', true], ['setUser', null, { role: 'guest' }]]);
  });

  it('describes the ordering funnel in VND', () => {
    const { calls, backend } = fakeBackend();
    const t = createTracker(backend);
    t.identify({ id: 1, role: 'CUSTOMER' });
    calls.length = 0;
    t.viewItem({ id: 7, name: 'Phở bò', price: 50000, categoryName: 'Món nước' } as MenuItem);
    t.addToCart(line, 1);
    expect(calls).toEqual([
      ['event', 'view_item', { currency: 'VND', value: 50000, items: [{ item_id: '7', item_name: 'Phở bò', item_category: 'Món nước', price: 50000 }] }],
      ['event', 'add_to_cart', { currency: 'VND', value: 55000, items: [{ item_id: '7', item_name: 'Phở bò', price: 55000, quantity: 1 }] }],
    ]);
  });

  it('builds a purchase from the placed order', () => {
    const order = {
      code: 'ATL123', total: 125000, deliveryFee: 15000, voucherCode: 'WELCOME10', payment: { method: 'BANK_TRANSFER' },
      items: [{ menuItemId: 7, name: 'Phở bò', unitPrice: 55000, quantity: 2 }],
    } as unknown as Order;
    expect(purchaseParams(order)).toEqual({
      transaction_id: 'ATL123', currency: 'VND', value: 125000, shipping: 15000, coupon: 'WELCOME10', payment_type: 'BANK_TRANSFER',
      items: [{ item_id: '7', item_name: 'Phở bò', price: 55000, quantity: 2 }],
    });
  });

  it('never lets an analytics error reach the app', () => {
    const t = createTracker({ enable: () => { throw new Error('x'); }, setUser: () => undefined, screen: () => { throw new Error('y'); }, event: () => { throw new Error('z'); } });
    expect(() => { t.identify(null); t.screen('/'); t.login(); }).not.toThrow();
  });
});

import { router } from 'expo-router';
import { useCallback } from 'react';

import { errorMessage, type MenuItem } from './api';
import { useCart } from './cart';
import { useSession } from './session';
import { useToast } from './toast';

/** True when the dish has a group the customer must choose from (size…), so it cannot be added with one tap. */
export function needsChoice(item: Pick<MenuItem, 'optionGroups'>): boolean {
  return item.optionGroups.some((g) => g.minSelect > 0);
}

/** Cart actions for menu screens; guests are sent to sign in first. */
export function useCartChange() {
  const { user } = useSession();
  const { add, updateLine, plainLine } = useCart();
  const toast = useToast();

  const guard = useCallback(() => {
    if (user) return true;
    toast.show('Vui lòng đăng nhập để đặt món');
    router.push('/login');
    return false;
  }, [user, toast]);

  /** Sets the quantity of the plain line (no options, no note) of a dish; dishes with required options open their page. */
  const setPlain = useCallback(async (item: MenuItem, qty: number) => {
    if (!guard()) return false;
    if (needsChoice(item)) { router.push(`/item/${item.id}`); return false; }
    try {
      const line = plainLine(item.id);
      if (line) await updateLine(line.lineId, qty, null);
      else if (qty > 0) { await add(item.id, qty, null, []); toast.show('Đã thêm vào giỏ hàng', 'success'); }
      return true;
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      return false;
    }
  }, [guard, plainLine, updateLine, add, toast]);

  /** Adds a configured dish (from the item page). */
  const addConfigured = useCallback(async (menuItemId: number, qty: number, note: string | null, optionIds: number[]) => {
    if (!guard()) return false;
    try {
      await add(menuItemId, qty, note, optionIds);
      toast.show('Đã thêm vào giỏ hàng', 'success');
      return true;
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      return false;
    }
  }, [guard, add, toast]);

  /** Changes one cart line (cart screen). */
  const setLine = useCallback(async (lineId: number, qty: number, note?: string | null) => {
    try { await updateLine(lineId, qty, note); return true; } catch (e) { toast.show(errorMessage(e), 'error'); return false; }
  }, [updateLine, toast]);

  return { setPlain, addConfigured, setLine };
}

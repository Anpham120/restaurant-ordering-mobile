import { router } from 'expo-router';
import { useCallback } from 'react';

import { errorMessage } from './api';
import { useCart } from './cart';
import { useSession } from './session';
import { useToast } from './toast';

/** Changes the quantity of a dish in the cart; asks guests to sign in first. */
export function useCartChange() {
  const { user } = useSession();
  const { setQuantity, quantityOf } = useCart();
  const toast = useToast();
  return useCallback(async (menuItemId: number, qty: number, note?: string | null) => {
    if (!user) {
      toast.show('Vui lòng đăng nhập để đặt món');
      router.push('/login');
      return false;
    }
    try {
      const before = quantityOf(menuItemId);
      await setQuantity(menuItemId, qty, note);
      if (before === 0 && qty > 0) toast.show('Đã thêm vào giỏ hàng', 'success');
      return true;
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      return false;
    }
  }, [user, setQuantity, quantityOf, toast]);
}

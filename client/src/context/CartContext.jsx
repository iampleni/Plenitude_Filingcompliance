import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    // Admins do not shop, and guests have no cart.
    if (!user || user.role === 'admin') {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      setCart(await api('/cart'));
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    const c = await api('/cart/items', {
      method: 'POST',
      body: { product_id: productId, quantity },
    });
    setCart(c);
    return c;
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    const c = await api(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    });
    setCart(c);
    return c;
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const c = await api(`/cart/items/${itemId}`, { method: 'DELETE' });
    setCart(c);
    return c;
  }, []);

  const clear = useCallback(async () => {
    const c = await api('/cart', { method: 'DELETE' });
    setCart(c);
    return c;
  }, []);

  const count = cart?.item_count || 0;

  return (
    <CartContext.Provider
      value={{ cart, loading, count, refresh, addItem, updateItem, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

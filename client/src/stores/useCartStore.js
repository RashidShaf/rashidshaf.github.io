import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const isLoggedIn = () => {
  try {
    const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return !!authState?.state?.accessToken;
  } catch {
    return false;
  }
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      paymentMethod: 'COD',

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      fetchCart: async () => {
        if (!isLoggedIn()) return;
        try {
          const res = await api.get('/cart');
          const serverItems = (res.data || []).map((item) => ({
            bookId: item.book.id,
            book: item.book,
            quantity: item.quantity,
            serverId: item.id,
          }));
          set({ items: serverItems });
        } catch {}
      },

      mergeCartToServer: async () => {
        if (!isLoggedIn()) return;
        const { items } = get();
        if (items.length === 0) { await get().fetchCart(); return; }
        // Fetch server cart first to avoid double-incrementing
        try {
          const serverRes = await api.get('/cart');
          const serverItems = serverRes.data || [];
          const serverMap = {};
          serverItems.forEach((si) => { serverMap[si.book.id] = si; });

          for (const item of items) {
            if (!item.bookId) continue;
            const existing = serverMap[item.bookId];
            if (existing) {
              // Already on server — update to the max of local vs server quantity
              const targetQty = Math.max(item.quantity, existing.quantity);
              if (targetQty !== existing.quantity) {
                await api.put(`/cart/${existing.id}`, { quantity: targetQty }).catch(() => {});
              }
            } else {
              // Not on server — add it
              await api.post('/cart', { bookId: item.bookId, quantity: item.quantity }).catch(() => {});
            }
          }
        } catch {}
        // Fetch canonical state from server
        await get().fetchCart();
      },

      addItem: (book, quantity = 1) => {
        const { items } = get();
        const existing = items.find((i) => i.bookId === book.id);
        if (existing) {
          set({ items: items.map((i) => i.bookId === book.id ? { ...i, quantity: i.quantity + quantity } : i) });
        } else {
          set({ items: [...items, { bookId: book.id, book, quantity }] });
        }

        // Sync to server in background
        if (isLoggedIn()) {
          api.post('/cart', { bookId: book.id, quantity }).then((res) => {
            // Update serverId from response
            const data = res.data;
            set({
              items: get().items.map((i) =>
                i.bookId === book.id ? { ...i, serverId: data.id, quantity: data.quantity, book: data.book || i.book } : i
              ),
            });
          }).catch(() => {});
        }

        return existing ? 'updated' : 'added';
      },

      removeItem: (bookId) => {
        const item = get().items.find((i) => i.bookId === bookId);
        set({ items: get().items.filter((i) => i.bookId !== bookId) });

        if (isLoggedIn() && item?.serverId) {
          api.delete(`/cart/${item.serverId}`).catch(() => {});
        }
      },

      updateQuantity: (bookId, quantity) => {
        if (quantity <= 0) return get().removeItem(bookId);
        const item = get().items.find((i) => i.bookId === bookId);
        set({ items: get().items.map((i) => i.bookId === bookId ? { ...i, quantity } : i) });

        if (isLoggedIn() && item?.serverId) {
          api.put(`/cart/${item.serverId}`, { quantity }).catch(() => {});
        }
      },

      clearCart: () => {
        set({ items: [] });
        if (isLoggedIn()) {
          api.delete('/cart').catch(() => {});
        }
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + (parseFloat(item.book.price) * item.quantity), 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

export default useCartStore;

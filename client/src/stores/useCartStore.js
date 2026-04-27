import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'react-toastify';
import api from '../utils/api';

const isLoggedIn = () => {
  try {
    const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return !!authState?.state?.accessToken;
  } catch {
    return false;
  }
};

// Composite key for matching cart rows. variantKey === '' for non-variant items
// mirrors the deterministic NOT NULL column the server uses for its unique index.
const keyOf = (bookId, variantId) => `${bookId}__${variantId || ''}`;

const shapeServerItem = (item) => ({
  bookId: item.book.id,
  variantId: item.variantId || null,
  variantKey: keyOf(item.book.id, item.variantId),
  book: item.book,
  variant: item.variant || null,
  quantity: item.quantity,
  serverId: item.id,
});

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
          const serverItems = (res.data || []).map(shapeServerItem);
          // E7: detect rows that the server dropped (variant cascade-deleted by
          // admin) and surface a toast so the customer isn't surprised.
          const before = get().items;
          if (before.length > 0) {
            const serverKeys = new Set(serverItems.map((i) => keyOf(i.bookId, i.variantId)));
            const dropped = before.filter((i) => i.serverId && !serverKeys.has(keyOf(i.bookId, i.variantId)));
            if (dropped.length > 0) {
              try {
                toast.info(
                  dropped.length === 1
                    ? 'An item in your cart is no longer available and has been removed.'
                    : `${dropped.length} items in your cart are no longer available and have been removed.`,
                );
              } catch {}
            }
          }
          set({ items: serverItems });
        } catch {}
      },

      mergeCartToServer: async () => {
        if (!isLoggedIn()) return;
        const { items } = get();
        if (items.length === 0) { await get().fetchCart(); return; }
        try {
          const serverRes = await api.get('/cart');
          const serverItems = serverRes.data || [];
          const serverMap = {};
          serverItems.forEach((si) => {
            serverMap[keyOf(si.book.id, si.variantId)] = si;
          });

          for (const item of items) {
            if (!item.bookId) continue;
            const k = keyOf(item.bookId, item.variantId);
            const existing = serverMap[k];
            if (existing) {
              const targetQty = Math.max(item.quantity, existing.quantity);
              if (targetQty !== existing.quantity) {
                await api.put(`/cart/${existing.id}`, { quantity: targetQty }).catch(() => {});
              }
            } else {
              await api.post('/cart', {
                bookId: item.bookId,
                variantId: item.variantId || null,
                quantity: item.quantity,
              }).catch(() => {});
            }
          }
        } catch {}
        await get().fetchCart();
      },

      addItem: (book, quantity = 1, variantId = null) => {
        const { items } = get();
        const variant = variantId && Array.isArray(book.variants)
          ? book.variants.find((v) => v.id === variantId) || null
          : null;
        const existing = items.find((i) => i.bookId === book.id && (i.variantId || null) === (variantId || null));
        if (existing) {
          set({
            items: items.map((i) =>
              i.bookId === book.id && (i.variantId || null) === (variantId || null)
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          });
        } else {
          set({
            items: [...items, {
              bookId: book.id,
              variantId: variantId || null,
              variantKey: keyOf(book.id, variantId),
              book,
              variant,
              quantity,
            }],
          });
        }

        if (isLoggedIn()) {
          api.post('/cart', {
            bookId: book.id,
            variantId: variantId || null,
            quantity,
          }).then((res) => {
            const data = res.data;
            set({
              items: get().items.map((i) =>
                i.bookId === book.id && (i.variantId || null) === (variantId || null)
                  ? {
                      ...i,
                      serverId: data.id,
                      quantity: data.quantity,
                      book: data.book || i.book,
                      variant: data.variant || i.variant,
                    }
                  : i,
              ),
            });
          }).catch(() => {});
        }

        return existing ? 'updated' : 'added';
      },

      removeItem: (bookId, variantId = null) => {
        const item = get().items.find(
          (i) => i.bookId === bookId && (i.variantId || null) === (variantId || null),
        );
        set({
          items: get().items.filter(
            (i) => !(i.bookId === bookId && (i.variantId || null) === (variantId || null)),
          ),
        });

        if (isLoggedIn() && item?.serverId) {
          api.delete(`/cart/${item.serverId}`).catch(() => {});
        }
      },

      updateQuantity: (bookId, variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(bookId, variantId);
        const item = get().items.find(
          (i) => i.bookId === bookId && (i.variantId || null) === (variantId || null),
        );
        set({
          items: get().items.map((i) =>
            i.bookId === bookId && (i.variantId || null) === (variantId || null)
              ? { ...i, quantity }
              : i,
          ),
        });

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
        return get().items.reduce((total, item) => {
          const unit = parseFloat(item.variant?.price ?? item.book.price);
          return total + unit * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    },
  ),
);

export default useCartStore;

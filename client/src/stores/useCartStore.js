import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (book, quantity = 1) => {
        const { items } = get();
        const existing = items.find(i => i.bookId === book.id);
        if (existing) {
          set({ items: items.map(i => i.bookId === book.id ? { ...i, quantity: i.quantity + quantity } : i) });
        } else {
          set({ items: [...items, { bookId: book.id, book, quantity }] });
        }
      },

      removeItem: (bookId) => {
        set({ items: get().items.filter(i => i.bookId !== bookId) });
      },

      updateQuantity: (bookId, quantity) => {
        if (quantity <= 0) return get().removeItem(bookId);
        set({ items: get().items.map(i => i.bookId === bookId ? { ...i, quantity } : i) });
      },

      clearCart: () => set({ items: [] }),

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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (bookId) => {
        const { items } = get();
        if (!items.includes(bookId)) {
          set({ items: [...items, bookId] });
        }
      },

      removeItem: (bookId) => {
        set({ items: get().items.filter((id) => id !== bookId) });
      },

      toggleItem: (bookId) => {
        const { items } = get();
        if (items.includes(bookId)) {
          set({ items: items.filter((id) => id !== bookId) });
        } else {
          set({ items: [...items, bookId] });
        }
      },

      isInWishlist: (bookId) => get().items.includes(bookId),

      getCount: () => get().items.length,
    }),
    { name: 'wishlist-storage' }
  )
);

export default useWishlistStore;

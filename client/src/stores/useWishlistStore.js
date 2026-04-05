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

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      books: [],

      fetchWishlist: async () => {
        if (!isLoggedIn()) return;
        try {
          const res = await api.get('/wishlist');
          const serverItems = res.data || [];
          set({
            items: serverItems.map((item) => item.bookId || item.book?.id),
            books: serverItems.map((item) => item.book).filter(Boolean),
          });
        } catch {}
      },

      mergeWishlistToServer: async () => {
        if (!isLoggedIn()) return;
        const { items } = get();
        // POST each local bookId to server (server is idempotent)
        for (const bookId of items) {
          try {
            await api.post('/wishlist', { bookId });
          } catch {}
        }
        // Fetch canonical state from server
        await get().fetchWishlist();
      },

      addItem: (bookId) => {
        const { items } = get();
        if (!items.includes(bookId)) {
          set({ items: [...items, bookId] });
        }
        if (isLoggedIn()) {
          api.post('/wishlist', { bookId }).catch(() => {});
        }
      },

      removeItem: (bookId) => {
        set({
          items: get().items.filter((id) => id !== bookId),
          books: get().books.filter((b) => b.id !== bookId),
        });
        if (isLoggedIn()) {
          api.delete(`/wishlist/${bookId}`).catch(() => {});
        }
      },

      toggleItem: (bookId) => {
        const { items } = get();
        if (items.includes(bookId)) {
          get().removeItem(bookId);
        } else {
          get().addItem(bookId);
        }
      },

      isInWishlist: (bookId) => get().items.includes(bookId),

      getCount: () => get().items.length,
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export default useWishlistStore;

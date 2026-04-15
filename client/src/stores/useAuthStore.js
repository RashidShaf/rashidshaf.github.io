import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';
import useCartStore from './useCartStore';
import useWishlistStore from './useWishlistStore';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', data);
          set({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, isLoading: false });
          return res.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          set({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, isLoading: false });
          return res.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          await api.post('/auth/logout', { refreshToken });
        } catch (e) {
          // ignore
        }
        set({ user: null, accessToken: null, refreshToken: null });
        // Clear other user-specific stores to prevent data leaking to next user
        useCartStore.setState({ items: [], paymentMethod: 'COD' });
        useWishlistStore.setState({ items: [], books: [] });
        localStorage.removeItem('cart-storage');
        localStorage.removeItem('wishlist-storage');
      },

      fetchUser: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data });
        } catch (error) {
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },

      updateUser: (userData) => set({ user: userData }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;

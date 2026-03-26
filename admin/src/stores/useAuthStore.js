import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.user.role !== 'ADMIN') {
            set({ isLoading: false });
            throw new Error('Access denied. Admin privileges required.');
          }
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
        } catch (e) {}
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;

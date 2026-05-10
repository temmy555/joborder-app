// src/store/uiStore.js
// Zustand store untuk UI state (dark mode, modal, dll)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDarkMode = create(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => set({ dark: !get().dark }),
      setDark: (v) => set({ dark: v }),
    }),
    { name: 'joborder-ui' } // disimpan ke localStorage
  )
);

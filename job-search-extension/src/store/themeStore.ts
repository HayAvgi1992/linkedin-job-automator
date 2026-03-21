import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    document.documentElement.setAttribute('data-theme', next);
    chrome.storage.local.set({ theme: next });
  },

  hydrate: () =>
    new Promise<void>((resolve) => {
      chrome.storage.local.get(['theme'], (result) => {
        const theme: Theme = result.theme === 'light' ? 'light' : 'dark';
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
        resolve();
      });
    }),
}));

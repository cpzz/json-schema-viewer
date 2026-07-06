import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => {
  // Load theme from localStorage, default to 'light'
  // Also check system preference if not saved
  const savedTheme = (typeof localStorage !== 'undefined' 
    ? localStorage.getItem('theme') 
    : null) as Theme | null;
  
  let initialTheme: Theme = 'light';
  if (savedTheme) {
    initialTheme = savedTheme;
  } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    initialTheme = 'dark';
  }

  // Apply initial theme
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: initialTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    },
    toggleTheme: () => {
      const { theme } = get();
      const newTheme = theme === 'light' ? 'dark' : 'light';
      get().setTheme(newTheme);
    },
  };
});

export function useTheme() {
  return useThemeStore();
}

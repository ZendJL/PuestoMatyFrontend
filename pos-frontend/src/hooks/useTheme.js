import { useEffect, useState } from 'react';

const THEME_KEY = 'bsTheme'; // 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(THEME_KEY) || 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}

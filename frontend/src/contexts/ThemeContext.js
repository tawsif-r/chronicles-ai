import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext({
    theme: 'dark',
    toggle: () => { },
});
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark');
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    return (_jsx(ThemeContext.Provider, { value: { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }, children: children }));
}
export const useTheme = () => useContext(ThemeContext);

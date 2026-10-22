import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'librodeclases-dark-mode';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
	// Sin preferencia guardada, sigue el tema del sistema operativo.
	const [dark, setDark] = useState(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved !== null) return saved === 'true';
		} catch { /* almacenamiento no disponible */ }
		return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
	});

	useEffect(() => {
		document.body.classList.toggle('dark', dark);
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111827' : '#f7f8fc');
		try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch { /* almacenamiento no disponible */ }
	}, [dark]);

	return <ThemeContext.Provider value={{ dark, toggleDark: () => setDark(value => !value) }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

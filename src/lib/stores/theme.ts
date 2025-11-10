/**
 * Theme store for dark/light mode
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

// Load theme from localStorage or default to light
const getInitialTheme = (): Theme => {
	if (!browser) return 'light';
	const stored = localStorage.getItem('theme');
	return (stored as Theme) || 'light';
};

export const theme = writable<Theme>(getInitialTheme());

// Subscribe to theme changes and update localStorage + document
theme.subscribe((value) => {
	if (browser) {
		localStorage.setItem('theme', value);
		document.documentElement.setAttribute('data-theme', value);
	}
});

export const themeActions = {
	toggle() {
		theme.update(current => current === 'light' ? 'dark' : 'light');
	},
	setLight() {
		theme.set('light');
	},
	setDark() {
		theme.set('dark');
	}
};

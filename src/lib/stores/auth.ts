/**
 * Authentication store
 */

import { writable } from 'svelte/store';
import { auth as authAPI, getAuthToken } from '$lib/api/client';

interface User {
	id: string;
	email: string;
	tier: string;
	created_at: string;
}

interface AuthState {
	user: User | null;
	loading: boolean;
	error: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		loading: true,
		error: null
	});

	return {
		subscribe,

		async init() {
			const token = getAuthToken();
			if (!token) {
				set({ user: null, loading: false, error: null });
				return;
			}

			try {
				const data = await authAPI.getMe();
				set({ user: data.user, loading: false, error: null });
			} catch (error: any) {
				set({ user: null, loading: false, error: error.message });
				authAPI.logout();
			}
		},

		async login(email: string, password: string) {
			update(state => ({ ...state, loading: true, error: null }));
			try {
				const data = await authAPI.login(email, password);
				set({ user: data.user, loading: false, error: null });
			} catch (error: any) {
				set({ user: null, loading: false, error: error.message });
				throw error;
			}
		},

		async register(email: string, password: string) {
			update(state => ({ ...state, loading: true, error: null }));
			try {
				const data = await authAPI.register(email, password);
				set({ user: data.user, loading: false, error: null });
			} catch (error: any) {
				set({ user: null, loading: false, error: error.message });
				throw error;
			}
		},

		logout() {
			authAPI.logout();
			set({ user: null, loading: false, error: null });
		}
	};
}

export const authStore = createAuthStore();

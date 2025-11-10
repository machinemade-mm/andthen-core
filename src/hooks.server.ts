/**
 * SvelteKit server hooks
 * For core version: Auto-creates and uses a default local user (no authentication needed!)
 */

import type { Handle } from '@sveltejs/kit';
import { generateToken, type JWTPayload } from '$lib/auth/jwt';
import { query } from '$lib/db/connection';

// Extend the App.Locals interface to include user
declare global {
	namespace App {
		interface Locals {
			user: JWTPayload | null;
		}
	}
}

// Cache the local user to avoid database queries on every request
let localUser: JWTPayload | null = null;

/**
 * Get or create the default local user
 */
async function getOrCreateLocalUser(): Promise<JWTPayload> {
	if (localUser) {
		return localUser;
	}

	try {
		// Check if default user exists
		const result = await query<{ id: string; email: string }>('SELECT id, email FROM users WHERE email = ?', ['local@andthen.core']);

		if (result.rows.length > 0) {
			// User exists
			const user = result.rows[0];
			localUser = {
				userId: user.id,
				email: user.email
			};
		} else {
			// Create default local user
			const insertResult = await query<{ id: string; email: string }>(
				'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email',
				['local@andthen.core', 'local-user-no-password']
			);

			const user = insertResult.rows[0];
			localUser = {
				userId: user.id,
				email: user.email
			};

			console.log('✅ Created default local user');
		}

		return localUser;
	} catch (error) {
		console.error('Error getting/creating local user:', error);
		throw error;
	}
}

/**
 * Handle hook - runs on every request
 * Automatically logs in as local user (no authentication needed!)
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Get or create local user
	const user = await getOrCreateLocalUser();
	event.locals.user = user;

	// Set auth token cookie so API calls work
	const token = generateToken(user);

	const response = await resolve(event);

	// Set auth cookie
	response.headers.append(
		'Set-Cookie',
		`auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
	);

	return response;
};

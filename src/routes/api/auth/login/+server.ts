/**
 * User login endpoint
 * POST /api/auth/login
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPassword } from '$lib/auth/password';
import { generateToken } from '$lib/auth/jwt';
import { users } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, password } = await request.json();

		// Validate input
		if (!email || !password) {
			return json(
				{ error: 'Email and password are required' },
				{ status: 400 }
			);
		}

		// Find user by email
		const user = await users.findUserByEmail(email.toLowerCase());
		if (!user) {
			return json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		// Verify password
		const isValid = await verifyPassword(password, user.password_hash);
		if (!isValid) {
			return json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		// Generate JWT token
		const token = generateToken({
			userId: user.id,
			email: user.email,
			tier: user.tier
		});

		// Return user data and token
		return json({
			user: {
				id: user.id,
				email: user.email,
				tier: user.tier,
				created_at: user.created_at
			},
			token
		});
	} catch (error) {
		console.error('Login error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

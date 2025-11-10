/**
 * User registration endpoint
 * POST /api/auth/register
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hashPassword, validateEmail, validatePassword } from '$lib/auth/password';
import { generateToken } from '$lib/auth/jwt';
import { users, projects } from '$lib/db';

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

		// Validate email
		const emailError = validateEmail(email);
		if (emailError) {
			return json({ error: emailError }, { status: 400 });
		}

		// Validate password
		const passwordError = validatePassword(password);
		if (passwordError) {
			return json({ error: passwordError }, { status: 400 });
		}

		// Check if user already exists
		const existingUser = await users.findUserByEmail(email.toLowerCase());
		if (existingUser) {
			return json(
				{ error: 'User with this email already exists' },
				{ status: 409 }
			);
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create user (default tier: free)
		const user = await users.createUser(email.toLowerCase(), passwordHash, 'free');

		// Create default project for new user
		await projects.createProject(user.id, 'My First Project', 0);

		// Generate JWT token
		const token = generateToken({
			userId: user.id,
			email: user.email,
			tier: user.tier
		});

		// Return user data and token
		return json(
			{
				user: {
					id: user.id,
					email: user.email,
					tier: user.tier,
					created_at: user.created_at
				},
				token
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Registration error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

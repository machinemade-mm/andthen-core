/**
 * Get current user endpoint
 * GET /api/auth/me
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		return json(
			{ error: 'Unauthorized' },
			{ status: 401 }
		);
	}

	try {
		// Get fresh user data from database
		const user = await users.findUserById(locals.user.userId);

		if (!user) {
			return json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}

		// Get user statistics
		const stats = await users.getUserStats(user.id);

		return json({
			user: {
				id: user.id,
				email: user.email,
				tier: user.tier,
				created_at: user.created_at
			},
			stats
		});
	} catch (error) {
		console.error('Get user error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

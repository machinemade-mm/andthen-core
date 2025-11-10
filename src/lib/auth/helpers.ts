/**
 * Authentication helper functions
 */

import { error } from '@sveltejs/kit';
import type { JWTPayload } from './jwt';

/**
 * Require authentication
 * Throws 401 error if user is not authenticated
 */
export function requireAuth(user: JWTPayload | null): asserts user is JWTPayload {
	if (!user) {
		throw error(401, 'Unauthorized - Please log in');
	}
}

/**
 * Check if user has required tier
 */
export function requireTier(
	user: JWTPayload | null,
	requiredTier: 'free' | 'standard' | 'ultimate'
): void {
	requireAuth(user);

	const tierHierarchy = { free: 0, standard: 1, ultimate: 2 };

	if (tierHierarchy[user.tier] < tierHierarchy[requiredTier]) {
		throw error(403, `This feature requires ${requiredTier} tier or higher`);
	}
}

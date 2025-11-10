/**
 * User database operations
 */

import { query } from './connection';
import type { User, UserDTO, UserTier } from './types';
import { userToDTO } from './types';

/**
 * Create a new user
 */
export async function createUser(
	email: string,
	passwordHash: string,
	tier: UserTier = 'free'
): Promise<User> {
	await query(
		`INSERT INTO users (email, password_hash, tier)
		 VALUES ($1, $2, $3)`,
		[email, passwordHash, tier]
	);

	// Get the newly created user by email (which is unique)
	const result = await query<User>(
		`SELECT * FROM users WHERE email = $1`,
		[email]
	);

	return result.rows[0];
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
	const result = await query<User>(
		`SELECT * FROM users WHERE email = $1`,
		[email]
	);

	return result.rows[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
	const result = await query<User>(
		`SELECT * FROM users WHERE id = $1`,
		[id]
	);

	return result.rows[0] || null;
}

/**
 * Update user tier
 */
export async function updateUserTier(userId: string, tier: UserTier): Promise<User> {
	await query(
		`UPDATE users SET tier = $1 WHERE id = $2`,
		[tier, userId]
	);

	const result = await query<User>(
		`SELECT * FROM users WHERE id = $1`,
		[userId]
	);

	return result.rows[0];
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
	projectCount: number;
	taskCount: number;
	completedTaskCount: number;
}> {
	const result = await query(
		`SELECT
			(SELECT COUNT(*) FROM projects WHERE user_id = $1) as project_count,
			(SELECT COUNT(*) FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.user_id = $1) as task_count,
			(SELECT COUNT(*) FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.user_id = $1 AND t.is_completed = true) as completed_task_count`,
		[userId]
	);

	const stats = result.rows[0];
	return {
		projectCount: parseInt(stats.project_count),
		taskCount: parseInt(stats.task_count),
		completedTaskCount: parseInt(stats.completed_task_count)
	};
}

/**
 * Delete a user and all associated data
 */
export async function deleteUser(userId: string): Promise<void> {
	await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

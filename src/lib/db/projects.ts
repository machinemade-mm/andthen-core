/**
 * Project database operations
 */

import { query, getClient } from './connection';
import type { Project, ProjectType } from './types';

/**
 * Get all projects for a user, ordered by position
 */
export async function getProjectsByUserId(userId: string): Promise<Project[]> {
	const result = await query<Project>(
		`SELECT * FROM projects WHERE user_id = $1 ORDER BY position ASC`,
		[userId]
	);

	return result.rows;
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
	const result = await query<Project>(
		`SELECT * FROM projects WHERE id = $1`,
		[projectId]
	);

	return result.rows[0] || null;
}

/**
 * Create a new project or goal
 */
export async function createProject(
	userId: string,
	name: string,
	position?: number,
	type: ProjectType = 'project',
	goalDescription?: string
): Promise<Project> {
	// If no position provided, add at the end
	if (position === undefined) {
		const maxPosResult = await query(
			`SELECT COALESCE(MAX(position), -1) + 1 as next_position
			 FROM projects WHERE user_id = $1`,
			[userId]
		);
		position = maxPosResult.rows[0].next_position;
	}

	// SQLite: Insert without RETURNING, then SELECT the row
	await query(
		`INSERT INTO projects (user_id, name, position, type, goal_description)
		 VALUES ($1, $2, $3, $4, $5)`,
		[userId, name, position, type, goalDescription || null]
	);

	// Get the newly created project by user_id and position (which is unique)
	const result = await query<Project>(
		`SELECT * FROM projects WHERE user_id = $1 AND position = $2`,
		[userId, position]
	);

	return result.rows[0];
}

/**
 * Update project name
 */
export async function updateProjectName(
	projectId: string,
	name: string
): Promise<Project> {
	await query(
		`UPDATE projects SET name = $1 WHERE id = $2`,
		[name, projectId]
	);

	const result = await query<Project>(
		`SELECT * FROM projects WHERE id = $1`,
		[projectId]
	);

	return result.rows[0];
}

/**
 * Update goal description
 */
export async function updateGoalDescription(
	projectId: string,
	goalDescription: string
): Promise<Project> {
	await query(
		`UPDATE projects SET goal_description = $1 WHERE id = $2`,
		[goalDescription, projectId]
	);

	const result = await query<Project>(
		`SELECT * FROM projects WHERE id = $1`,
		[projectId]
	);

	return result.rows[0];
}

/**
 * Reorder projects (update positions)
 */
export async function reorderProjects(
	userId: string,
	projectIdsInOrder: string[]
): Promise<void> {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		for (let i = 0; i < projectIdsInOrder.length; i++) {
			await client.query(
				`UPDATE projects SET position = $1 WHERE id = $2 AND user_id = $3`,
				[i, projectIdsInOrder[i], userId]
			);
		}

		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Delete a project (cascades to tasks)
 */
export async function deleteProject(projectId: string): Promise<void> {
	await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
}

/**
 * Count projects for a user
 */
export async function countUserProjects(userId: string): Promise<number> {
	const result = await query(
		`SELECT COUNT(*) as count FROM projects WHERE user_id = $1`,
		[userId]
	);

	return parseInt(result.rows[0].count);
}

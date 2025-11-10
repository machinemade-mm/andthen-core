/**
 * Task database operations
 */

import { query, getClient } from './connection';
import type { Task } from './types';

/**
 * Get all tasks for a project, ordered by position
 */
export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
	const result = await query<Task>(
		`SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC`,
		[projectId]
	);

	return result.rows;
}

/**
 * Get all tasks for a user across all projects
 */
export async function getTasksByUserId(userId: string): Promise<Task[]> {
	const result = await query<Task>(
		`SELECT t.* FROM tasks t
		 JOIN projects p ON t.project_id = p.id
		 WHERE p.user_id = $1
		 ORDER BY p.position ASC, t.position ASC`,
		[userId]
	);

	return result.rows;
}

/**
 * Get a single task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
	const result = await query<Task>(
		`SELECT * FROM tasks WHERE id = $1`,
		[taskId]
	);

	return result.rows[0] || null;
}

/**
 * Create a new task
 */
export async function createTask(
	projectId: string,
	content: string,
	position?: number
): Promise<Task> {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		// If no position provided, add at the end
		if (position === undefined) {
			const maxPosResult = await client.query(
				`SELECT COALESCE(MAX(position), -1) + 1 as next_position
				 FROM tasks WHERE project_id = $1`,
				[projectId]
			);
			position = maxPosResult.rows[0].next_position;
		} else {
			// Shift all tasks at or after this position down by 1
			// Use two-step process with negative positions to avoid UNIQUE constraint violation
			console.log(`Shifting tasks at position >= ${position} for project ${projectId}`);

			// STEP 1: Move to negative temp positions (no conflicts possible)
			await client.query(
				`UPDATE tasks
				 SET position = -position - 1000
				 WHERE project_id = $1 AND position >= $2`,
				[projectId, position]
			);
			console.log('Step 1: Moved tasks to negative positions');

			// STEP 2: Move back to positive positions with +1 offset
			await client.query(
				`UPDATE tasks
				 SET position = -position - 999
				 WHERE project_id = $1 AND position < 0`,
				[projectId]
			);
			console.log('Step 2: Moved tasks back to positive positions with +1 offset');
		}

		// Insert the new task
		console.log(`Inserting task at position ${position}`);
		await client.query(
			`INSERT INTO tasks (project_id, content, position)
			 VALUES ($1, $2, $3)`,
			[projectId, content, position]
		);
		console.log('Task inserted successfully');

		// Get the newly created task by project_id and position (which is unique)
		const result = await client.query<Task>(
			`SELECT * FROM tasks WHERE project_id = $1 AND position = $2`,
			[projectId, position]
		);

		await client.query('COMMIT');
		console.log('Transaction committed');
		return result.rows[0];
	} catch (error) {
		console.error('Error in createTask:', error);
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Update task content
 */
export async function updateTaskContent(
	taskId: string,
	content: string
): Promise<Task> {
	await query(
		`UPDATE tasks SET content = $1 WHERE id = $2`,
		[content, taskId]
	);

	const result = await query<Task>(
		`SELECT * FROM tasks WHERE id = $1`,
		[taskId]
	);

	return result.rows[0];
}

/**
 * Update task with partial data (flexible updater)
 */
export async function updateTask(
	taskId: string,
	data: Partial<Pick<Task, 'content' | 'is_completed' | 'how_explanation'>>
): Promise<Task> {
	const updates: string[] = [];
	const values: any[] = [];
	let paramCount = 1;

	if (data.content !== undefined) {
		updates.push(`content = $${paramCount++}`);
		values.push(data.content);
	}

	if (data.is_completed !== undefined) {
		updates.push(`is_completed = $${paramCount++}`);
		values.push(data.is_completed);
	}

	if (data.how_explanation !== undefined) {
		updates.push(`how_explanation = $${paramCount++}`);
		values.push(data.how_explanation);
	}

	if (updates.length === 0) {
		throw new Error('No valid fields to update');
	}

	values.push(taskId);

	await query(
		`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount}`,
		values
	);

	const result = await query<Task>(
		`SELECT * FROM tasks WHERE id = $1`,
		[taskId]
	);

	return result.rows[0];
}

/**
 * Toggle task completion status
 */
export async function toggleTaskCompletion(taskId: string): Promise<Task> {
	await query(
		`UPDATE tasks SET is_completed = NOT is_completed WHERE id = $1`,
		[taskId]
	);

	const result = await query<Task>(
		`SELECT * FROM tasks WHERE id = $1`,
		[taskId]
	);

	return result.rows[0];
}

/**
 * Set task completion status
 */
export async function setTaskCompletion(
	taskId: string,
	isCompleted: boolean
): Promise<Task> {
	await query(
		`UPDATE tasks SET is_completed = $1 WHERE id = $2`,
		[isCompleted, taskId]
	);

	const result = await query<Task>(
		`SELECT * FROM tasks WHERE id = $1`,
		[taskId]
	);

	return result.rows[0];
}

/**
 * Reorder tasks within a project (update positions)
 */
export async function reorderTasks(
	projectId: string,
	taskIdsInOrder: string[]
): Promise<void> {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		for (let i = 0; i < taskIdsInOrder.length; i++) {
			await client.query(
				`UPDATE tasks SET position = $1 WHERE id = $2 AND project_id = $3`,
				[i, taskIdsInOrder[i], projectId]
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
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
	await query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
}

/**
 * Count tasks for a project
 */
export async function countProjectTasks(projectId: string): Promise<number> {
	const result = await query(
		`SELECT COUNT(*) as count FROM tasks WHERE project_id = $1`,
		[projectId]
	);

	return parseInt(result.rows[0].count);
}

/**
 * Count total tasks for a user
 */
export async function countUserTasks(userId: string): Promise<number> {
	const result = await query(
		`SELECT COUNT(*) as count FROM tasks t
		 JOIN projects p ON t.project_id = p.id
		 WHERE p.user_id = $1`,
		[userId]
	);

	return parseInt(result.rows[0].count);
}

/**
 * Get task history for a project (for AI suggestions)
 * Returns task content in order, including completed tasks
 */
export async function getProjectTaskHistory(
	projectId: string,
	limit: number = 50
): Promise<string[]> {
	const result = await query(
		`SELECT content FROM tasks
		 WHERE project_id = $1
		 ORDER BY position ASC
		 LIMIT $2`,
		[projectId, limit]
	);

	return result.rows.map(row => row.content);
}

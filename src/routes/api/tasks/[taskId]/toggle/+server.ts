/**
 * Toggle Task Completion API
 * POST /api/tasks/[taskId]/toggle - Toggle task completion status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { projects, tasks } from '$lib/db';

/**
 * Helper to verify task belongs to user (through project)
 */
async function verifyTaskOwnership(taskId: string, userId: string) {
	const task = await tasks.getTaskById(taskId);

	if (!task) {
		return { error: 'Task not found', status: 404 };
	}

	// Check if the task's project belongs to the user
	const project = await projects.getProjectById(task.project_id);

	if (!project || project.user_id !== userId) {
		return { error: 'Forbidden', status: 403 };
	}

	return { task, project };
}

/**
 * POST toggle task completion
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyTaskOwnership(params.taskId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		const updatedTask = await tasks.toggleTaskCompletion(params.taskId);

		return json({ task: updatedTask });
	} catch (error) {
		console.error('Toggle task error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

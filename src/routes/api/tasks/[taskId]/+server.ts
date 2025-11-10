/**
 * Individual Task API
 * GET /api/tasks/[taskId] - Get a specific task
 * PATCH /api/tasks/[taskId] - Update a task
 * DELETE /api/tasks/[taskId] - Delete a task
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
 * GET a specific task
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyTaskOwnership(params.taskId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		return json({ task: result.task });
	} catch (error) {
		console.error('Get task error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH update a task
 * Can update: content, is_completed
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyTaskOwnership(params.taskId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		const body = await request.json();
		let updatedTask = result.task;

		// Update content if provided
		if ('content' in body) {
			if (!body.content || typeof body.content !== 'string') {
				return json(
					{ error: 'Task content must be a non-empty string' },
					{ status: 400 }
				);
			}

			if (body.content.length > 5000) {
				return json(
					{ error: 'Task content must be less than 5000 characters' },
					{ status: 400 }
				);
			}

			updatedTask = await tasks.updateTaskContent(params.taskId, body.content);
		}

		// Update completion status if provided
		if ('is_completed' in body) {
			if (typeof body.is_completed !== 'boolean') {
				return json(
					{ error: 'is_completed must be a boolean' },
					{ status: 400 }
				);
			}

			updatedTask = await tasks.setTaskCompletion(params.taskId, body.is_completed);
		}

		return json({ task: updatedTask });
	} catch (error) {
		console.error('Update task error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE a task
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyTaskOwnership(params.taskId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		await tasks.deleteTask(params.taskId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete task error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

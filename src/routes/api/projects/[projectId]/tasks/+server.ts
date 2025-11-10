/**
 * Tasks for a Project API
 * GET /api/projects/[projectId]/tasks - Get all tasks for a project
 * POST /api/projects/[projectId]/tasks - Create a new task in a project
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { projects, tasks } from '$lib/db';

/**
 * Helper to verify project belongs to user
 */
async function verifyProjectOwnership(projectId: string, userId: string) {
	const project = await projects.getProjectById(projectId);

	if (!project) {
		return { error: 'Project not found', status: 404 };
	}

	if (project.user_id !== userId) {
		return { error: 'Forbidden', status: 403 };
	}

	return { project };
}

/**
 * GET all tasks for a project
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyProjectOwnership(params.projectId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		const projectTasks = await tasks.getTasksByProjectId(params.projectId);

		return json({ tasks: projectTasks });
	} catch (error) {
		console.error('Get tasks error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * POST create a new task in a project
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyProjectOwnership(params.projectId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		const { content, position } = await request.json();

		// Validate content
		if (!content || typeof content !== 'string') {
			return json(
				{ error: 'Task content is required' },
				{ status: 400 }
			);
		}

		if (content.length > 5000) {
			return json(
				{ error: 'Task content must be less than 5000 characters' },
				{ status: 400 }
			);
		}

		// Core version: No tier limits - unlimited tasks!

		// Create task
		const task = await tasks.createTask(params.projectId, content, position);

		return json({ task }, { status: 201 });
	} catch (error: any) {
		// Check if it's a tier limit error (403) or other SvelteKit error
		if (error?.status) {
			return json({ error: error.body?.message || 'Forbidden' }, { status: error.status });
		}

		console.error('Create task error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

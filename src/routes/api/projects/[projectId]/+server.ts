/**
 * Individual Project API
 * GET /api/projects/[projectId] - Get a specific project
 * PATCH /api/projects/[projectId] - Update a project
 * DELETE /api/projects/[projectId] - Delete a project
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { projects } from '$lib/db';

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
 * GET a specific project
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyProjectOwnership(params.projectId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		return json({ project: result.project });
	} catch (error) {
		console.error('Get project error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH update a project (name only for now)
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyProjectOwnership(params.projectId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		const { name, goalDescription } = await request.json();

		// Validate name
		if (!name || typeof name !== 'string') {
			return json(
				{ error: 'Project name is required' },
				{ status: 400 }
			);
		}

		if (name.length > 255) {
			return json(
				{ error: 'Project name must be less than 255 characters' },
				{ status: 400 }
			);
		}

		// Update project name
		let updatedProject = await projects.updateProjectName(params.projectId, name);

		// Update goal description if provided and project is a goal
		if (goalDescription !== undefined && result.project.type === 'goal') {
			updatedProject = await projects.updateGoalDescription(params.projectId, goalDescription);
		}

		return json({ project: updatedProject });
	} catch (error) {
		console.error('Update project error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE a project (cascades to tasks)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAuth(locals.user);

	try {
		const result = await verifyProjectOwnership(params.projectId, locals.user.userId);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		await projects.deleteProject(params.projectId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete project error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

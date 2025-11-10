/**
 * Projects API
 * GET /api/projects - Get all projects for current user
 * POST /api/projects - Create a new project
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { projects } from '$lib/db';

/**
 * GET all projects for authenticated user
 */
export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals.user);

	try {
		const userProjects = await projects.getProjectsByUserId(locals.user.userId);

		return json({ projects: userProjects });
	} catch (error) {
		console.error('Get projects error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * POST create a new project or goal
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	requireAuth(locals.user);

	try {
		const { name, position, type = 'project', goalDescription } = await request.json();

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

		// Validate type
		if (type !== 'project' && type !== 'goal') {
			return json(
				{ error: 'Type must be "project" or "goal"' },
				{ status: 400 }
			);
		}

		// For goals, require goalDescription
		if (type === 'goal' && (!goalDescription || typeof goalDescription !== 'string')) {
			return json(
				{ error: 'Goal description is required for goal type' },
				{ status: 400 }
			);
		}

		// Core version: No tier limits - unlimited projects and goals!

		// Create project/goal
		const project = await projects.createProject(
			locals.user.userId,
			name,
			position,
			type,
			goalDescription
		);

		return json({ project }, { status: 201 });
	} catch (error: any) {
		// Check if it's a tier limit error (403) or other SvelteKit error
		if (error?.status) {
			return json({ error: error.body?.message || 'Forbidden' }, { status: error.status });
		}

		console.error('Create project error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

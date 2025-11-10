/**
 * API client for frontend
 * Handles all HTTP requests to the backend
 */

let authToken: string | null = null;

/**
 * Set the authentication token
 */
export function setAuthToken(token: string | null) {
	authToken = token;
	if (token) {
		localStorage.setItem('auth_token', token);
	} else {
		localStorage.removeItem('auth_token');
	}
}

/**
 * Get the authentication token
 */
export function getAuthToken(): string | null {
	if (!authToken && typeof localStorage !== 'undefined') {
		authToken = localStorage.getItem('auth_token');
	}
	return authToken;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T = any>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const token = getAuthToken();

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> || {})
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(endpoint, {
		...options,
		headers
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

// Auth API
export const auth = {
	async register(email: string, password: string) {
		const data = await apiRequest<{ user: any; token: string }>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});
		setAuthToken(data.token);
		return data;
	},

	async login(email: string, password: string) {
		const data = await apiRequest<{ user: any; token: string }>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});
		setAuthToken(data.token);
		return data;
	},

	async getMe() {
		return apiRequest('/api/auth/me');
	},

	logout() {
		setAuthToken(null);
	}
};

// Projects API
export const projectsAPI = {
	async getAll() {
		return apiRequest<{ projects: any[] }>('/api/projects');
	},

	async create(name: string, position?: number, type?: 'project' | 'goal', goalDescription?: string) {
		return apiRequest<{ project: any }>('/api/projects', {
			method: 'POST',
			body: JSON.stringify({ name, position, type, goalDescription })
		});
	},

	async update(projectId: string, name: string, goalDescription?: string) {
		const body: any = { name };
		if (goalDescription !== undefined) {
			body.goalDescription = goalDescription;
		}
		return apiRequest<{ project: any }>(`/api/projects/${projectId}`, {
			method: 'PATCH',
			body: JSON.stringify(body)
		});
	},

	async delete(projectId: string) {
		return apiRequest(`/api/projects/${projectId}`, {
			method: 'DELETE'
		});
	}
};

// Tasks API
export const tasksAPI = {
	async getByProject(projectId: string) {
		return apiRequest<{ tasks: any[] }>(`/api/projects/${projectId}/tasks`);
	},

	async create(projectId: string, content: string, position?: number) {
		return apiRequest<{ task: any }>(`/api/projects/${projectId}/tasks`, {
			method: 'POST',
			body: JSON.stringify({ content, position })
		});
	},

	async update(taskId: string, data: { content?: string; is_completed?: boolean }) {
		return apiRequest<{ task: any }>(`/api/tasks/${taskId}`, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
	},

	async toggle(taskId: string) {
		return apiRequest<{ task: any }>(`/api/tasks/${taskId}/toggle`, {
			method: 'POST'
		});
	},

	async delete(taskId: string) {
		return apiRequest(`/api/tasks/${taskId}`, {
			method: 'DELETE'
		});
	},

	async generateHow(taskId: string) {
		return apiRequest<{ task: any; explanation: string }>(`/api/tasks/${taskId}/how`, {
			method: 'POST'
		});
	}
};

// Limits API
export const limitsAPI = {
	async get() {
		return apiRequest('/api/limits');
	}
};

// AI API
export const aiAPI = {
	async getSuggestions(projectId: string) {
		return apiRequest<{ suggestions: string[]; remainingCalls: number | 'unlimited' }>(
			'/api/ai/suggestions',
			{
				method: 'POST',
				body: JSON.stringify({ projectId })
			}
		);
	}
};

// Goals API (Premium Feature)
export const goalsAPI = {
	async generate(goalDescription: string, projectId: string) {
		return apiRequest<{ steps: string[]; totalSteps: number }>(
			'/api/goals/generate',
			{
				method: 'POST',
				body: JSON.stringify({ goalDescription, projectId })
			}
		);
	},

	async continue(goalDescription: string, projectId: string, completedSteps: string[], pendingSteps: string[]) {
		return apiRequest<{ steps: string[]; totalSteps: number }>(
			'/api/goals/continue',
			{
				method: 'POST',
				body: JSON.stringify({ goalDescription, projectId, completedSteps, pendingSteps })
			}
		);
	},

	async next(goalDescription: string, projectId: string, completedSteps: string[], pendingSteps: string[]) {
		return apiRequest<{ step: string }>(
			'/api/goals/next',
			{
				method: 'POST',
				body: JSON.stringify({ goalDescription, projectId, completedSteps, pendingSteps })
			}
		);
	},

	async checkLimits() {
		return apiRequest<{
			currentGoalCount: number;
			maxGoals: number | 'unlimited';
			canCreateGoal: boolean;
			requiresUpgrade: boolean;
		}>('/api/goals/check-limits');
	}
};

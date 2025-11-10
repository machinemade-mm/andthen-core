/**
 * Grid state management
 * Manages projects, tasks, and navigation state
 */

import { writable, derived, get } from 'svelte/store';
import { projectsAPI, tasksAPI, goalsAPI } from '$lib/api/client';
import { debounce } from '$lib/utils/debounce';

// Types
interface Task {
	id: string;
	project_id: string;
	content: string;
	is_completed: boolean;
	position: number;
	how_explanation: string | null;
}

interface Project {
	id: string;
	name: string;
	type: 'project' | 'goal';
	position: number;
	goal_description: string | null;
	goal_step_count: number;
	tasks: Task[];
}

interface NavigationState {
	columnIndex: number;
	taskIndex: number;
	topBarIndex: number; // -1 = not in top bar, 0+ = which button is focused
}

interface EditState {
	isEditing: boolean;
	taskId: string | null;
	draftContent: string;
	newTaskProjectId: string | null; // For creating new tasks
	newTaskPosition: number | null; // Position for new task (null = end of list)
	insertAfterTaskId: string | null; // ID of task to insert after (null = end of list)
}

// Create stores
export const projects = writable<Project[]>([]);
export const navigationState = writable<NavigationState>({ columnIndex: 0, taskIndex: 0, topBarIndex: -1 });
export const editState = writable<EditState>({
	isEditing: false,
	taskId: null,
	draftContent: '',
	newTaskProjectId: null,
	newTaskPosition: null,
	insertAfterTaskId: null
});
export const loading = writable(false);
export const error = writable<string | null>(null);
export const showProjectTypeMenu = writable(false);

// Derived store for current project
export const currentProject = derived(
	[projects, navigationState],
	([$projects, $nav]) => $projects[$nav.columnIndex] || null
);

// Derived store for current task
export const currentTask = derived(
	[currentProject, navigationState],
	([$currentProject, $nav]) => $currentProject?.tasks[$nav.taskIndex] || null
);

// Grid actions
export const gridActions = {
	/**
	 * Load all projects and their tasks
	 */
	async loadData() {
		loading.set(true);
		error.set(null);
		try {
			const { projects: projectsList } = await projectsAPI.getAll();

			// Load tasks for each project
			const projectsWithTasks = await Promise.all(
				projectsList.map(async (project) => {
					const { tasks } = await tasksAPI.getByProject(project.id);
					return { ...project, tasks };
				})
			);

			projects.set(projectsWithTasks);

			// Auto-select first project for keyboard-first navigation
			if (projectsWithTasks.length > 0) {
				const firstProject = projectsWithTasks[0];
				const initialTaskIndex = firstProject.tasks.length === 0 ? -1 : 0;
				navigationState.set({ columnIndex: 0, taskIndex: initialTaskIndex, topBarIndex: -1 });
			}

			loading.set(false);
		} catch (err: any) {
			error.set(err.message);
			loading.set(false);
		}
	},

	/**
	 * Create a new project (default type)
	 */
	async createProject(name: string) {
		try {
			const { project } = await projectsAPI.create(name);
			projects.update(p => [...p, { ...project, tasks: [] }]);
			return project;
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Create a new project or goal with type
	 */
	async createProjectWithType(type: 'project' | 'goal', name: string, goalDescription?: string) {
		try {
			const { project } = await projectsAPI.create(name, undefined, type, goalDescription);
			projects.update(p => [...p, { ...project, tasks: [] }]);
			return project;
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},


	/**
	 * Update project name and optionally goal description
	 */
	async updateProject(projectId: string, name: string, goalDescription?: string) {
		try {
			const { project } = await projectsAPI.update(projectId, name, goalDescription);
			const updates: any = { name };
			if (goalDescription !== undefined) {
				updates.goal_description = goalDescription;
			}
			projects.update(p => p.map(proj => proj.id === projectId ? { ...proj, ...updates } : proj));
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Delete a project
	 */
	async deleteProject(projectId: string) {
		try {
			await projectsAPI.delete(projectId);
			projects.update(p => p.filter(proj => proj.id !== projectId));
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Create a new task
	 */
	async createTask(projectId: string, content: string, position?: number) {
		try {
			const { task } = await tasksAPI.create(projectId, content, position);

			// If position was specified (insert operation), reload all tasks for this project
			// to sync the shifted positions from the database
			if (position !== undefined) {
				const { tasks } = await tasksAPI.getByProject(projectId);
				projects.update(p => p.map(proj => {
					if (proj.id === projectId) {
						return { ...proj, tasks };
					}
					return proj;
				}));
			} else {
				// No position specified (append to end), just add optimistically
				projects.update(p => p.map(proj => {
					if (proj.id === projectId) {
						return { ...proj, tasks: [...proj.tasks, task].sort((a, b) => a.position - b.position) };
					}
					return proj;
				}));
			}

			return task;
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Update a task
	 */
	async updateTask(taskId: string, data: { content?: string; is_completed?: boolean }) {
		try {
			const { task } = await tasksAPI.update(taskId, data);
			projects.update(p => p.map(proj => ({
				...proj,
				tasks: proj.tasks.map(t => t.id === taskId ? task : t)
			})));
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Toggle task completion
	 */
	async toggleTask(taskId: string, userTier?: 'free' | 'standard' | 'ultimate') {
		try {
			const { task } = await tasksAPI.toggle(taskId);
			projects.update(p => p.map(proj => ({
				...proj,
				tasks: proj.tasks.map(t => t.id === taskId ? task : t)
			})));
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	},

	/**
	 * Delete a task
	 */
	async deleteTask(taskId: string) {
		try {
			await tasksAPI.delete(taskId);
			projects.update(p => p.map(proj => ({
				...proj,
				tasks: proj.tasks.filter(t => t.id !== taskId)
			})));
		} catch (err: any) {
			error.set(err.message);
			throw err;
		}
	}
};

// Navigation actions
export const navigationActions = {
	/**
	 * Move to next column (or show menu to create new project/goal if at end)
	 */
	async moveRight() {
		const state = get(navigationState);
		const $projects = get(projects);

		if (state.columnIndex < $projects.length - 1) {
			// Move to next existing project
			const nextProject = $projects[state.columnIndex + 1];
			// If current task index is valid for next project, keep it; otherwise go to last task
			let newTaskIndex = state.taskIndex;
			if (nextProject.tasks.length === 0) {
				newTaskIndex = -1; // Select project title when no tasks
			} else if (state.taskIndex >= nextProject.tasks.length) {
				newTaskIndex = nextProject.tasks.length - 1;
			}
			navigationState.set({ columnIndex: state.columnIndex + 1, taskIndex: newTaskIndex, topBarIndex: -1 });
		} else {
			// At last project, show project type menu
			showProjectTypeMenu.set(true);
			return { showingMenu: true };
		}
	},

	/**
	 * Move to previous column
	 */
	moveLeft() {
		navigationState.update(state => {
			if (state.columnIndex > 0) {
				const $projects = get(projects);
				const prevProject = $projects[state.columnIndex - 1];
				// If current task index is valid for previous project, keep it; otherwise go to last task
				let newTaskIndex = state.taskIndex;
				if (prevProject.tasks.length === 0) {
					newTaskIndex = -1; // Select project title when no tasks
				} else if (state.taskIndex >= prevProject.tasks.length) {
					newTaskIndex = prevProject.tasks.length - 1;
				}
				return { columnIndex: state.columnIndex - 1, taskIndex: newTaskIndex, topBarIndex: -1 };
			}
			return state;
		});
	},

	/**
	 * Move to next task (or from project title to first task)
	 */
	moveDown() {
		navigationState.update(state => {
			const $projects = get(projects);
			const currentProject = $projects[state.columnIndex];

			// If in top bar, move to project title
			if (state.topBarIndex >= 0) {
				return { ...state, taskIndex: -1, topBarIndex: -1 };
			}

			if (state.taskIndex === -1) {
				// On project title, move to first task or new task input
				return { ...state, taskIndex: 0 };
			} else if (currentProject && state.taskIndex < currentProject.tasks.length - 1) {
				// Move to next task
				return { ...state, taskIndex: state.taskIndex + 1 };
			}
			return state;
		});
	},

	/**
	 * Move to previous task (or to project title from first task, or to top bar from project title)
	 */
	moveUp() {
		navigationState.update(state => {
			if (state.taskIndex === -1) {
				// On project title, move to top bar (first button)
				return { ...state, topBarIndex: 0 };
			} else if (state.taskIndex === 0) {
				// On first task, move to project title
				return { ...state, taskIndex: -1 };
			} else if (state.taskIndex > 0) {
				return { ...state, taskIndex: state.taskIndex - 1 };
			}
			return state;
		});
	},

	/**
	 * Move to previous top bar button
	 */
	moveTopBarLeft() {
		navigationState.update(state => {
			if (state.topBarIndex > 0) {
				return { ...state, topBarIndex: state.topBarIndex - 1 };
			}
			return state;
		});
	},

	/**
	 * Move to next top bar button
	 */
	moveTopBarRight() {
		navigationState.update(state => {
			// topBarIndex: 0 = Settings, 1 = Dark Mode, 2 = Logout
			if (state.topBarIndex >= 0 && state.topBarIndex < 2) {
				return { ...state, topBarIndex: state.topBarIndex + 1 };
			}
			return state;
		});
	},

	/**
	 * Set navigation position
	 */
	setPosition(columnIndex: number, taskIndex: number, topBarIndex: number = -1) {
		navigationState.set({ columnIndex, taskIndex, topBarIndex });
	}
};

// Debounced auto-save function
const debouncedSave = debounce(async (taskId: string, content: string) => {
	if (content.trim()) {
		await gridActions.updateTask(taskId, { content });
	}
}, 500); // Save 500ms after user stops typing

// Edit actions
export const editActions = {
	/**
	 * Start editing a task
	 */
	startEdit(taskId: string, currentContent: string) {
		editState.set({
			isEditing: true,
			taskId,
			draftContent: currentContent,
			newTaskProjectId: null,
			newTaskPosition: null,
			insertAfterTaskId: null
		});
	},

	/**
	 * Start creating a new task
	 * @param projectId - Project to add task to
	 * @param position - Position to insert task (null = end of list)
	 * @param insertAfterTaskId - ID of task to insert after (null = end of list)
	 */
	startNewTask(projectId: string, position: number | null = null, insertAfterTaskId: string | null = null) {
		editState.set({
			isEditing: true,
			taskId: null,
			draftContent: '',
			newTaskProjectId: projectId,
			newTaskPosition: position,
			insertAfterTaskId
		});
	},

	/**
	 * Update draft content with auto-save
	 */
	updateDraft(content: string, onLogout?: () => void) {
		editState.update(state => {
			if (state.taskId) {
				// Trigger debounced auto-save for existing tasks
				debouncedSave(state.taskId, content);
			}

			return { ...state, draftContent: content };
		});
	},

	/**
	 * Save edit immediately and exit edit mode
	 */
	async saveEdit() {
		const state = get(editState);

		if (state.newTaskProjectId && state.draftContent.trim()) {
			// Creating new task - calculate position dynamically from insertAfterTaskId
			let position: number | undefined = undefined;

			if (state.insertAfterTaskId) {
				// Find the task we want to insert after
				const $projects = get(projects);
				const project = $projects.find(p => p.id === state.newTaskProjectId);
				if (project) {
					// Sort tasks by position to get correct order
					const sortedTasks = [...project.tasks].sort((a, b) => a.position - b.position);
					const afterTaskIndex = sortedTasks.findIndex(t => t.id === state.insertAfterTaskId);

					if (afterTaskIndex !== -1) {
						// Check if there's a task after the insert point
						if (afterTaskIndex + 1 < sortedTasks.length) {
							// Use the NEXT task's position - DB will shift it down
							position = sortedTasks[afterTaskIndex + 1].position;
						} else {
							// Inserting at the end - use afterTask.position + 1
							position = sortedTasks[afterTaskIndex].position + 1;
						}
					}
				}
			}
			// If no insertAfterTaskId, position remains undefined and task goes to end

			const task = await gridActions.createTask(
				state.newTaskProjectId,
				state.draftContent.trim(),
				position
			);

			// Find the newly created task's position
			const $projects = get(projects);
			const projectIndex = $projects.findIndex(p => p.id === state.newTaskProjectId);
			if (projectIndex !== -1) {
				const project = $projects[projectIndex];
				const taskIndex = project.tasks.findIndex(t => t.id === task.id);
				if (taskIndex !== -1) {
					// Navigate to the newly created task
					navigationState.set({ columnIndex: projectIndex, taskIndex, topBarIndex: -1 });
				}
			}

			editState.set({
				isEditing: false,
				taskId: null,
				draftContent: '',
				newTaskProjectId: null,
				newTaskPosition: null,
				insertAfterTaskId: null
			});
			return task;
		} else if (state.taskId && state.draftContent.trim()) {
			// Updating existing task with content
			await gridActions.updateTask(state.taskId, { content: state.draftContent });
			editState.set({
				isEditing: false,
				taskId: null,
				draftContent: '',
				newTaskProjectId: null,
				newTaskPosition: null,
				insertAfterTaskId: null
			});
		} else if (state.taskId && !state.draftContent.trim()) {
			// Editing existing task with empty content - DELETE the task
			await gridActions.deleteTask(state.taskId);
			editState.set({
				isEditing: false,
				taskId: null,
				draftContent: '',
				newTaskProjectId: null,
				newTaskPosition: null,
				insertAfterTaskId: null
			});
		} else {
			// Empty content for new task, just cancel
			editState.set({
				isEditing: false,
				taskId: null,
				draftContent: '',
				newTaskProjectId: null,
				newTaskPosition: null,
				insertAfterTaskId: null
			});
		}
	},

	/**
	 * Cancel edit
	 */
	cancelEdit() {
		editState.set({
			isEditing: false,
			taskId: null,
			draftContent: '',
			newTaskProjectId: null,
			newTaskPosition: null,
			insertAfterTaskId: null
		});
	}
};

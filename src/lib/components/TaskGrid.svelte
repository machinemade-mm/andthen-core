<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectColumn from './ProjectColumn.svelte';
	import ColumnVisualizer from './ColumnVisualizer.svelte';
	import ProjectTypeMenu from './ProjectTypeMenu.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import {
		projects,
		navigationState,
		editState,
		gridActions,
		navigationActions,
		editActions,
		currentProject,
		showProjectTypeMenu
	} from '$lib/stores/grid';
	import { authStore } from '$lib/stores/auth';
	import { theme, themeActions } from '$lib/stores/theme';

	export let handleLogout: () => void;

	let gridContainer: HTMLDivElement;
	let showSettings = false;

	onMount(() => {
		// Load data
		gridActions.loadData();

		// Set up keyboard navigation
		const handleKeyDown = async (e: KeyboardEvent) => {
			// Don't handle if user is typing in an input/textarea
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
				// Allow keyboard shortcuts only in specific cases
				if (target.classList.contains('task-input') || target.classList.contains('project-name-input') || target.classList.contains('new-task-input')) {
					// These inputs handle their own Enter/Esc, but allow arrow keys for navigation with auto-save
					if (e.key.startsWith('Arrow')) {
						// If a command menu is open, let the menu handle arrow keys (don't intercept)
						if ($editState.showCommandMenu) {
							return;
						}

						// Check if we're in edit mode
						const isEditing = $editState.isEditing;
						if (isEditing) {
							// Handle special cases for new task navigation
							if ($editState.newTaskProjectId) {
								// CRITICAL: Verify this new task input belongs to the CURRENT column
								// This prevents cross-column interference
								const project = $currentProject;
								if (!project || $editState.newTaskProjectId !== project.id) {
									// This input belongs to a different column - don't handle navigation
									return;
								}

								// New task with no content, pressing up - go to last task
								if (!$editState.draftContent.trim() && e.key === 'ArrowUp') {
									e.preventDefault();
									if (project && project.tasks.length > 0) {
										editActions.cancelEdit();
										navigationActions.setPosition($navigationState.columnIndex, project.tasks.length - 1);
									} else {
										editActions.cancelEdit();
										navigationActions.moveUp();
									}
									return;
								}
								// New task, pressing left/right - navigate to adjacent project
								if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
									e.preventDefault();
									editActions.cancelEdit();
									if (e.key === 'ArrowLeft') {
										navigationActions.moveLeft();
										scrollToColumn($navigationState.columnIndex);
									} else {
										await navigationActions.moveRight();
										scrollToColumn($navigationState.columnIndex);
									}
									return;
								}
							}

							// For all other cases when editing, let arrow keys work naturally for text cursor movement
							// Don't intercept - user wants to move within the text
							return;
						}
					} else {
						// For non-arrow keys, let the input handle it
						return;
					}
				}
			}

			const isEditing = $editState.isEditing;
			const inTopBar = $navigationState.topBarIndex >= 0;

		// When settings modal is open, block all navigation
		if (showSettings) {
			if (e.key === 'Escape') {
				e.preventDefault();
				showSettings = false;
				return;
			}
			// Block all arrow keys and navigation when settings is open
			if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				return;
			}
		}

			// When project type menu is open, prevent all navigation except closing
			if ($showProjectTypeMenu) {
				if (e.key === 'ArrowLeft' || e.key === 'Escape') {
					e.preventDefault();
					showProjectTypeMenu.set(false);
					return;
				}
				// Block all other arrow keys and navigation when menu is open
				if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					return;
				}
			}

			// Top bar navigation
			if (inTopBar && !isEditing) {
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					navigationActions.moveTopBarLeft();
					return;
				} else if (e.key === 'ArrowRight') {
					e.preventDefault();
					navigationActions.moveTopBarRight();
					return;
				} else if (e.key === 'ArrowDown') {
					e.preventDefault();
					navigationActions.moveDown(); // Exits top bar
					return;
				} else if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					// Activate the focused button
					const topBarButtons = document.querySelectorAll('.top-bar-btn');
					const focusedButton = topBarButtons[$navigationState.topBarIndex] as HTMLButtonElement;
					if (focusedButton) {
						focusedButton.click();
					}
					return;
				}
			}

			// Navigation keys
			if (e.key === 'ArrowRight' && !isEditing) {
				e.preventDefault();
				await navigationActions.moveRight();
				scrollToColumn($navigationState.columnIndex);
			} else if (e.key === 'ArrowLeft' && !isEditing) {
				e.preventDefault();
				navigationActions.moveLeft();
				scrollToColumn($navigationState.columnIndex);
			} else if (e.key === 'ArrowDown' && !isEditing) {
				e.preventDefault();
				const project = $currentProject;
				if (project && (project.tasks.length === 0 || $navigationState.taskIndex === project.tasks.length - 1)) {
					// At end of column or empty project, start creating new task
					editActions.startNewTask(project.id);
				} else {
					navigationActions.moveDown();
				}
			} else if (e.key === 'ArrowUp' && !isEditing) {
				e.preventDefault();
				navigationActions.moveUp();
			}
			// Action keys
			else if (e.key === ' ' && !isEditing) {
				e.preventDefault();
				const project = $currentProject;
				if (project && project.tasks.length > 0) {
					const currentTask = project.tasks[$navigationState.taskIndex];
					if (currentTask) {
						const userTier = $authStore.user?.tier as 'free' | 'standard' | 'ultimate' | undefined;
						await gridActions.toggleTask(currentTask.id, userTier);
					}
				}
			} else if (e.key === 'Enter' && !isEditing) {
				e.preventDefault();

				// If no projects exist, create the first project and edit its name
				if ($projects.length === 0) {
					await gridActions.createProject('Name your project');
					// Navigate to the new project
					navigationState.set({ columnIndex: $projects.length, taskIndex: -1, topBarIndex: -1 });
					// Trigger project name edit
					setTimeout(() => {
						const newProjectColumn = gridContainer.querySelector('.project-column:last-child .project-name') as HTMLElement;
						if (newProjectColumn) {
							newProjectColumn.click();
						}
					}, 100);
					return;
				}

				const project = $currentProject;

				if ($navigationState.taskIndex === -1) {
					// On project title, trigger edit mode
					const projectColumn = gridContainer.querySelector(`.project-column:nth-child(${$navigationState.columnIndex + 1}) .project-name`) as HTMLElement;
					if (projectColumn) {
						projectColumn.click();
					}
				} else if (project && project.tasks.length > 0) {
					const currentTask = project.tasks[$navigationState.taskIndex];
					if (currentTask) {
						editActions.startEdit(currentTask.id, currentTask.content);
					}
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				if (isEditing) {
					editActions.cancelEdit();
				}
			} else if (e.key === 'Backspace' && !isEditing) {
				e.preventDefault();
				const project = $currentProject;
				if (project) {
					// If on project title, delete the project/goal
					if ($navigationState.taskIndex === -1) {
						if (confirm(`Delete "${project.name}" and all its tasks?`)) {
							await gridActions.deleteProject(project.id);
							// Move to previous project or first project
							if ($navigationState.columnIndex > 0) {
								navigationActions.setPosition($navigationState.columnIndex - 1, 0);
							} else if ($projects.length > 1) {
								navigationActions.setPosition(0, 0);
							}
						}
					}
					// If on a task, delete the task
					else if (project.tasks.length > 0 && $navigationState.taskIndex >= 0) {
						const currentTask = project.tasks[$navigationState.taskIndex];
						if (currentTask) {
							// Delete the task
							await gridActions.deleteTask(currentTask.id);
							// Adjust navigation after deletion
							const newTaskCount = project.tasks.length - 1;
							if (newTaskCount === 0) {
								// No tasks left, stay at index 0 (will show add task button)
								navigationActions.setPosition($navigationState.columnIndex, 0);
							} else if ($navigationState.taskIndex >= newTaskCount) {
								// We were at the last task, move to the new last task
								navigationActions.setPosition($navigationState.columnIndex, newTaskCount - 1);
							}
							// Otherwise stay at current index (next task takes this position)
						}
					}
				}
			} else if (e.key === '.' && !isEditing) {
				e.preventDefault();
				const project = $currentProject;
				if (project) {
					// Insert new task after current task
					if ($navigationState.taskIndex >= 0 && project.tasks.length > 0) {
						const currentTask = project.tasks[$navigationState.taskIndex];
						const insertAfterTaskId = currentTask ? currentTask.id : null;
						// Pass null for position - let saveEdit() calculate it from insertAfterTaskId
						editActions.startNewTask(project.id, null, insertAfterTaskId);
					} else {
						// No task selected or empty project, add at end
						editActions.startNewTask(project.id);
					}
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	function scrollToColumn(index: number) {
		if (!gridContainer) return;

		const columns = gridContainer.querySelectorAll('.project-column');
		const column = columns[index];
		if (column) {
			column.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
		}
	}

	// Auto-scroll to focused column (only when column actually changes)
	let lastColumnIndex = -1;
	$: if ($navigationState.columnIndex >= 0 && $navigationState.columnIndex !== lastColumnIndex) {
		lastColumnIndex = $navigationState.columnIndex;
		setTimeout(() => scrollToColumn($navigationState.columnIndex), 50);
	}

	// Auto-scroll focused task into view with space below
	let lastScrollPosition = { columnIndex: -1, taskIndex: -1, wasEditing: false, wasNewTask: false };
	$: if ($navigationState.taskIndex >= 0 && gridContainer) {
		const positionChanged = lastScrollPosition.columnIndex !== $navigationState.columnIndex ||
		                        lastScrollPosition.taskIndex !== $navigationState.taskIndex;
		const editStateChanged = lastScrollPosition.wasEditing !== $editState.isEditing;

		// Scroll if position changed OR if we just exited edit mode (e.g., canceled new task)
		if (positionChanged || editStateChanged) {
			// Detect if we just canceled new task creation
			const wasEditingNewTask = lastScrollPosition.wasNewTask && !$editState.isEditing;

			lastScrollPosition = {
				columnIndex: $navigationState.columnIndex,
				taskIndex: $navigationState.taskIndex,
				wasEditing: $editState.isEditing,
				wasNewTask: $editState.newTaskProjectId !== null
			};

			setTimeout(() => {
				const columns = gridContainer.querySelectorAll('.project-column');
				const column = columns[$navigationState.columnIndex];
				if (column) {
					const tasks = column.querySelectorAll('.task-item');
					const focusedTask = tasks[$navigationState.taskIndex];
					if (focusedTask) {
						// Calculate how much of the element is visible
						const rect = focusedTask.getBoundingClientRect();
						const containerRect = gridContainer.getBoundingClientRect();

						const visibleTop = Math.max(rect.top, containerRect.top);
						const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
						const visibleHeight = Math.max(0, visibleBottom - visibleTop);
						const totalHeight = rect.bottom - rect.top;
						const visiblePercentage = visibleHeight / totalHeight;

						// If we just canceled new task creation, restore task to bottom position
						if (wasEditingNewTask) {
							focusedTask.scrollIntoView({ behavior: 'smooth', block: 'end' });
						}
						// Only scroll if less than 80% visible
						// Always align at bottom for consistent, predictable behavior
						else if (visiblePercentage < 0.8) {
							focusedTask.scrollIntoView({ behavior: 'smooth', block: 'end' });
						}
					}
				}
			}, 50);
		}
	}

	// Handle project type selection
	async function handleProjectTypeSelect(event: CustomEvent<'project' | 'goal'>) {
		const type = event.detail;
		showProjectTypeMenu.set(false);

		if (type === 'project') {
			// Create a simple project
			const newProject = await gridActions.createProjectWithType('project', 'New Project');
			// Navigate to the new project
			navigationState.set({ columnIndex: $projects.length, taskIndex: -1, topBarIndex: -1 });
			// Trigger project name edit
			setTimeout(() => {
				const newProjectColumn = gridContainer.querySelector('.project-column:last-child .project-name') as HTMLElement;
				if (newProjectColumn) {
					newProjectColumn.click();
				}
			}, 100);
		} else {
			// Create a goal with default name, user will edit it inline
			const newGoal = await gridActions.createProjectWithType('goal', 'New Goal', 'New Goal');
			// Navigate to the new goal
			navigationState.set({ columnIndex: $projects.length, taskIndex: -1, topBarIndex: -1 });
			// Trigger goal name edit
			setTimeout(() => {
				const newGoalColumn = gridContainer.querySelector('.project-column:last-child .project-name') as HTMLElement;
				if (newGoalColumn) {
					newGoalColumn.click();
				}
			}, 100);
		}
	}
</script>

<div class="task-grid-wrapper">
	<div class="grid-header">
		<div class="app-logo" class:goal={$currentProject?.type === 'goal'}>
			<span class="logo-full">and then?</span>
			<span class="logo-short">& then?</span>
		</div>
		<div class="header-right">
			<div class="keyboard-hints">
				<span class="hint">←→ columns</span>
				<span class="hint">↑↓ tasks</span>
				<span class="hint">Space toggle</span>
				<span class="hint">Enter edit</span>
				<span class="hint">. insert</span>
				<span class="hint">⌫ delete</span>
			</div>
			<ColumnVisualizer />
			<div class="top-bar-actions">
				<button
					class="top-bar-btn"
					class:focused={$navigationState.topBarIndex === 0}
					on:click={() => showSettings = true}
					type="button"
					tabindex="-1"
				>
					⚙️ Settings
				</button>
				<button
					class="top-bar-btn"
					class:focused={$navigationState.topBarIndex === 1}
					on:click={() => themeActions.toggle()}
					type="button"
					tabindex="-1"
				>
					{$theme === 'dark' ? '☀️' : '🌙'} {$theme === 'dark' ? 'Light' : 'Dark'}
				</button>
				<a
					href="https://andthenwhat.app"
					target="_blank"
					rel="noopener noreferrer"
					class="upgrade-btn"
					title="Get AI suggestions, cloud sync, and team features"
				>
					⭐ Upgrade to Pro
				</a>
			</div>
		</div>
	</div>

	<div class="grid-container" bind:this={gridContainer}>
		{#each $projects as project, columnIndex (project.id)}
			<ProjectColumn {project} {columnIndex} {handleLogout} />
		{/each}

		{#if $projects.length === 0}
			<div class="empty-grid">
			<h1 class="welcome-title">and then?</h1>
			<p class="welcome-subtitle">your keyboard-first task manager</p>
				<button
					class="create-project-btn"
					on:click={async () => {
						await gridActions.createProject('Name your project');
						// Navigate to the new project
						navigationState.set({ columnIndex: $projects.length, taskIndex: -1, topBarIndex: -1 });
						// Trigger project name edit
						setTimeout(() => {
							const newProjectColumn = gridContainer.querySelector('.project-column:last-child .project-name') as HTMLElement;
							if (newProjectColumn) {
								newProjectColumn.click();
							}
						}, 100);
					}}
				>
				+ Create Your First Project
				</button>
			</div>
		{/if}
	</div>
</div>

<ProjectTypeMenu
	visible={$showProjectTypeMenu}
	on:select={handleProjectTypeSelect}
	on:close={() => showProjectTypeMenu.set(false)}
/>

<SettingsModal
	visible={showSettings}
	on:close={() => showSettings = false}
/>

<style>
	.task-grid-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-background);
	}

	.grid-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg) var(--spacing-xl);
		background: var(--color-surface);
		border-bottom: 3px solid var(--color-border);
	}

	.app-logo {
		font-family: 'Cooper Black', cursive;
		font-size: 1.5rem;
		color: var(--color-primary);
		font-weight: 900;
		font-style: italic;
		transition: color 0.3s ease;
		user-select: none;
		line-height: 1;
		display: flex;
		align-items: center;
	}

	.app-logo.goal {
		color: var(--color-goal-primary);
	}

	.app-logo .logo-short {
		display: none;
	}

	.app-logo .logo-full {
		display: inline;
	}

	/* Show short logo on smaller screens */
	@media (max-width: 1200px) {
		.app-logo .logo-full {
			display: none;
		}

		.app-logo .logo-short {
			display: inline;
		}
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
	}

	.keyboard-hints {
		display: flex;
		gap: var(--spacing-md);
	}

	.hint {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.upgrade-btn {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-primary);
		border: 2px solid var(--color-primary-dark);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--color-surface);
		font-family: var(--font-mono);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		box-shadow: 0 2px 4px rgba(184, 90, 92, 0.3);
	}

	.upgrade-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(184, 90, 92, 0.4);
		background: var(--color-primary-dark);
	}

	.top-bar-actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.top-bar-btn {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--color-text);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	.top-bar-btn:hover:not(.focused) {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: var(--color-surface);
	}

	.top-bar-btn.focused {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-surface);
		box-shadow: 0 0 0 4px rgba(184, 90, 92, 0.3);
	}

	.grid-container {
		flex: 1;
		display: flex;
		gap: var(--spacing-lg);
		padding: var(--spacing-xl);
		overflow-x: auto;
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	.empty-grid {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--spacing-xl);
	}

	.welcome-title {
		font-family: 'Cooper Black', cursive;
		font-size: 4rem;
		font-weight: 900;
		font-style: italic;
		color: var(--color-primary);
		margin: 0 0 var(--spacing-sm) 0;
		line-height: 1;
	}

	.welcome-subtitle {
		font-size: 1.2rem;
		color: var(--color-text-muted);
		margin-bottom: var(--spacing-xl);
		font-weight: 400;
	}

	.create-project-btn {
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--color-primary);
		color: var(--color-surface);
		border: none;
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-project-btn:hover {
		background: var(--color-primary-dark);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(184, 90, 92, 0.3);
	}

	/* Responsive design for smaller screens */
	@media (max-width: 1440px) {
		.app-logo {
			height: 40px;
		}

		.hint {
			font-size: 0.65rem;
			padding: 2px var(--spacing-xs);
		}

		.top-bar-btn {
			font-size: 0.65rem;
			padding: 2px var(--spacing-xs);
		}
	}
</style>

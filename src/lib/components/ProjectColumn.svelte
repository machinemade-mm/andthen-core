<script lang="ts">
	import { get } from 'svelte/store';
	import TaskItem from './TaskItem.svelte';
	import { navigationState, projects, gridActions, editActions, editState } from '$lib/stores/grid';
	import { authStore } from '$lib/stores/auth';
	import { theme, themeActions } from '$lib/stores/theme';

	export let project: {
		id: string;
		name: string;
		type: 'project' | 'goal';
		position: number;
		goal_description: string | null;
		goal_step_count: number;
		tasks: any[];
	};
	export let columnIndex: number;
	export let handleLogout: () => void;

	$: isGoal = project.type === 'goal';

	$: isActiveColumn = $navigationState.columnIndex === columnIndex;
	$: isProjectTitleFocused = isActiveColumn && $navigationState.taskIndex === -1 && $navigationState.topBarIndex === -1;

	let isEditingName = false;
	let nameInput = project.name;

	// Keep nameInput in sync with project.name
	$: nameInput = isEditingName ? nameInput : (project.name || '');

	function handleNameEdit() {
		isEditingName = true;
	}

	async function saveName(keepFocus: boolean = false) {
		// Exit edit mode immediately to prevent double-triggering
		isEditingName = false;

		// Safety check: ensure nameInput and project exist
		if (!nameInput || !project) {
			nameInput = project?.name || '';
			return;
		}

		const trimmedName = nameInput.trim();
		if (trimmedName && trimmedName !== project.name) {
			// Update name and goal_description for goals
			if (isGoal) {
				await gridActions.updateProject(project.id, trimmedName, trimmedName);
			} else {
				await gridActions.updateProject(project.id, trimmedName);
			}
		} else {
			nameInput = project.name || '';
		}

		// Only keep focus if explicitly requested (e.g., when pressing Enter)
		if (keepFocus) {
			navigationState.set({ columnIndex, taskIndex: -1, topBarIndex: -1 });
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveName(true); // Keep focus on title after Enter
		} else if (e.key === 'Escape') {
			nameInput = project.name;
			isEditingName = false;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			// Cancel edit mode on left/right navigation, but don't force focus
			saveName(false);
		}
	}

	// Auto-focus and move cursor to end when entering edit mode
	function focusAndMoveCursorToEnd(node: HTMLInputElement) {
		node.focus();
		// Move cursor to end
		const length = node.value.length;
		node.setSelectionRange(length, length);
	}

	async function handleAddTask() {
		editActions.startNewTask(project.id);
	}

	// Auto-focus action for new task input
	function focusOnMount(node: HTMLTextAreaElement) {
		node.focus();
		// Don't scroll - new task is already at bottom where user is
		// Scrolling with 'center' was causing yo-yo bug when pressing UP to return
	}

</script>

<div class="project-column" class:active={isActiveColumn} class:goal={isGoal}>
	<div class="project-header" class:goal={isGoal}>
		{#if isEditingName}
			<input
				class="project-name-input"
				bind:value={nameInput}
				on:keydown={handleKeydown}
				use:focusAndMoveCursorToEnd
			/>
		{:else}
			<button class="project-name" class:focused={isProjectTitleFocused} on:click={handleNameEdit} type="button" tabindex="-1">
				{project.name}
			</button>
		{/if}
		<div class="task-count">{project.tasks.length}</div>
	</div>

	<div class="tasks-container">
		{#each project.tasks as task, taskIndex (task.id)}
			<TaskItem
				{task}
				{columnIndex}
				{taskIndex}
				isFocused={isActiveColumn && $navigationState.taskIndex === taskIndex}
				{isGoal}
			/>

			<!-- Show new task input after this task if inserting after this specific task -->
			{#if $editState.newTaskProjectId === project.id && $editState.insertAfterTaskId === task.id}
				<div class="new-task-input-container">
					<textarea
						class="new-task-input"
						bind:value={$editState.draftContent}
						on:input={(e) => editActions.updateDraft(e.currentTarget.value, handleLogout)}
						on:keydown={async (e) => {
							// Normal task input handling
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								// Await saveEdit and handle errors
								try {
									await editActions.saveEdit();
								} catch (error) {
									console.error('Failed to save task:', error);
									alert('Failed to save task: ' + (error instanceof Error ? error.message : 'Unknown error'));
								}
							} else if (e.key === 'Escape') {
								e.preventDefault();
								editActions.cancelEdit();
							}
						}}
						placeholder="Type task and press Enter..."
						rows="2"
						use:focusOnMount
					></textarea>
				</div>
			{/if}
		{/each}

		<!-- Show new task input at end if adding to end (not inserting after a specific task) -->
		{#if $editState.newTaskProjectId === project.id && $editState.insertAfterTaskId === null}
			<div class="new-task-input-container">
				<textarea
					class="new-task-input"
					bind:value={$editState.draftContent}
					on:input={(e) => editActions.updateDraft(e.currentTarget.value, handleLogout)}
					on:keydown={async (e) => {
						// Normal task input handling
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							// Await saveEdit and handle errors
							try {
								await editActions.saveEdit();
							} catch (error) {
								console.error('Failed to save task:', error);
								alert('Failed to save task: ' + (error instanceof Error ? error.message : 'Unknown error'));
							}
						} else if (e.key === 'Escape') {
							e.preventDefault();
							editActions.cancelEdit();
						}
					}}
					placeholder="Type task and press Enter..."
					rows="2"
					use:focusOnMount
				></textarea>
			</div>
		{/if}

		{#if project.tasks.length === 0}
			<div class="empty-state tutorial">
				<div class="tutorial-step">
					<span class="tutorial-icon">👋</span>
					<p class="tutorial-title">Welcome!</p>
					<p class="tutorial-text">Press <kbd>↓</kbd> or click "+ Add Task" below to create your first task</p>
				</div>
				<div class="tutorial-step">
					<span class="tutorial-icon">⌨️</span>
					<p class="tutorial-text">Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate tasks</p>
					<p class="tutorial-text">Press <kbd>Space</kbd> to mark complete</p>
					<p class="tutorial-text">Press <kbd>Enter</kbd> to edit</p>
				</div>
			</div>
		{/if}

		<button class="add-task-btn" on:click={handleAddTask} tabindex="-1">
			+ Add Task
		</button>
	</div>
</div>

<style>
	.project-column {
		flex-shrink: 0;
		width: 300px;
		min-height: 200px;
		display: flex;
		flex-direction: column;
		background: transparent;
		padding: var(--spacing-md);
		transition: all 0.2s ease;
	}

	.project-column.active {
		/* No visual change for active column since there's no border */
	}

	.project-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-lg);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--border-radius);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.project-header.goal {
		background: var(--color-goal-primary);
	}

	.project-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-background);
		margin: 0;
		cursor: pointer;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: 4px;
		transition: all 0.2s ease;
		background: none;
		border: none;
		text-align: left;
		font-family: inherit;
	}

	.project-name:hover:not(.focused) {
		background: rgba(250, 247, 242, 0.1);
	}

	.project-name.focused {
		background: var(--color-background);
		color: var(--color-primary);
		outline: 2px solid var(--color-background);
		box-shadow: 0 0 0 4px rgba(250, 247, 242, 0.3);
	}

	.project-header.goal .project-name.focused {
		color: var(--color-goal-primary);
	}

	.project-name-input {
		font-size: 1.25rem;
		font-weight: 700;
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 2px solid var(--color-background);
		border-radius: 4px;
		background: var(--color-background);
		color: var(--color-primary);
		font-family: inherit;
		width: 100%;
	}

	.project-name-input:focus {
		outline: none;
	}

	.project-header.goal .project-name-input {
		color: var(--color-goal-primary);
	}

	.task-count {
		background: var(--color-background);
		color: var(--color-primary);
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.project-header.goal .task-count {
		color: var(--color-goal-primary);
	}

	.tasks-container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding-bottom: 50vh; /* Half viewport height for generated tasks */
	}

	.empty-state {
		text-align: center;
		padding: 0;
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.empty-state p {
		margin: var(--spacing-xs) 0;
	}


	.tutorial {
		text-align: left;
		padding: var(--spacing-lg);
	}

	.tutorial-step {
		margin-bottom: var(--spacing-lg);
		padding: var(--spacing-md);
		background: var(--color-background);
		border-radius: var(--border-radius);
		border: 2px dashed var(--color-border);
	}

	.tutorial-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: var(--spacing-sm);
	}

	.tutorial-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.tutorial-text {
		font-size: 0.875rem;
		color: var(--color-text);
		margin: var(--spacing-xs) 0;
		line-height: 1.5;
	}

	kbd {
		display: inline-block;
		padding: 2px 6px;
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary);
		box-shadow: 0 2px 0 var(--color-border);
	}

	.add-task-btn {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-background);
		border: 2px dashed var(--color-border);
		border-radius: var(--border-radius);
		color: var(--color-text-muted);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: var(--spacing-sm);
	}

	.add-task-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: var(--color-surface);
	}

	.new-task-input-container {
		margin-bottom: var(--spacing-sm);
	}

	.new-task-input {
		width: 100%;
		padding: var(--spacing-sm);
		border: 2px solid var(--color-primary);
		border-radius: var(--border-radius);
		background: var(--color-background);
		color: var(--color-text);
		font-family: inherit;
		font-size: 0.875rem;
		resize: none;
		min-height: 60px;
	}

	.project-column.goal .new-task-input {
		border-color: var(--color-goal-primary);
	}

	.new-task-input:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(184, 90, 92, 0.1);
	}

	.project-column.goal .new-task-input:focus {
		box-shadow: 0 0 0 3px rgba(90, 124, 184, 0.1);
	}

	.new-task-input::placeholder {
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>

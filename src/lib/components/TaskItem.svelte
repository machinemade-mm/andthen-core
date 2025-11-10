<script lang="ts">
	import { editState, editActions, gridActions } from '$lib/stores/grid';
	import { authStore } from '$lib/stores/auth';

	export let task: {
		id: string;
		content: string;
		is_completed: boolean;
	};
	export let isFocused = false;
	export let columnIndex: number;
	export let taskIndex: number;
	export let isGoal = false;

	$: isEditing = $editState.isEditing && $editState.taskId === task.id;

	function handleToggle() {
		if (!isEditing) {
			const userTier = $authStore.user?.tier as 'free' | 'standard' | 'ultimate' | undefined;
			gridActions.toggleTask(task.id, userTier);
		}
	}

	function handleEdit() {
		if (!isEditing) {
			editActions.startEdit(task.id, task.content);
		}
	}

	function handleSave() {
		// Don't auto-save on blur if content starts with / (command menu)
		// But DO allow saving empty content (which will delete the task)
		const content = $editState.draftContent.trim();
		if (content.startsWith('/')) {
			return; // Stay in edit mode for command input
		}
		editActions.saveEdit();
	}

	function handleCancel() {
		editActions.cancelEdit();
	}

	// Auto-focus and move cursor to end when entering edit mode
	function focusAndMoveCursorToEnd(node: HTMLTextAreaElement) {
		node.focus();
		// Move cursor to end
		const length = node.value.length;
		node.setSelectionRange(length, length);
	}

	// Handle input to detect command menu trigger
	function handleInput() {
		const content = $editState.draftContent.trim();
		if (content === '/') {
			editState.update(state => ({
				...state,
				showCommandMenu: 'command-list',
				selectedMenuIndex: 0
			}));
		}
	}
</script>

<div
	class="task-item"
	class:focused={isFocused}
	class:completed={task.is_completed}
	class:editing={isEditing}
	class:goal={isGoal}
	data-task-id={task.id}
	data-column={columnIndex}
	data-row={taskIndex}
>
	<button
		class="checkbox"
		on:click={handleToggle}
		disabled={isEditing}
		tabindex="-1"
	>
		<div class="check-mark" class:checked={task.is_completed}>
			{#if task.is_completed}✓{/if}
		</div>
	</button>

	<div class="task-content">
		{#if isEditing}
			<textarea
				class="task-input"
				bind:value={$editState.draftContent}
				on:input={handleInput}
				on:blur={handleSave}
				on:keydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						handleSave();
					} else if (e.key === 'Escape') {
						e.preventDefault();
						handleCancel();
					}
				}}
				use:focusAndMoveCursorToEnd
			></textarea>
		{:else}
			<button class="task-text" on:click={handleEdit} type="button" tabindex="-1">
				{task.content}
			</button>
		{/if}
	</div>
</div>

<style>
	.task-item {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		margin-bottom: var(--spacing-sm);
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.task-item:hover:not(.focused):not(.editing) {
		background: rgba(0, 0, 0, 0.02);
	}

	.task-item.focused {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 4px rgba(184, 90, 92, 0.3);
		transform: translateY(-1px);
		background: var(--color-surface);
	}

	.task-item.goal.focused {
		border-color: var(--color-goal-primary);
		box-shadow: 0 0 0 4px rgba(90, 124, 184, 0.3);
	}

	.task-item.goal:hover:not(.focused):not(.editing) {
		background: rgba(0, 0, 0, 0.02);
	}

	.task-item.completed {
		opacity: 0.6;
	}

	.task-item.editing {
		border-color: var(--color-secondary);
		box-shadow: 0 0 0 3px rgba(232, 197, 168, 0.3);
	}

	.checkbox {
		flex-shrink: 0;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		margin-top: 2px;
	}

	.checkbox:disabled {
		cursor: not-allowed;
	}

	.check-mark {
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: var(--color-surface);
		transition: all 0.2s ease;
	}

	.check-mark.checked {
		background: var(--color-primary);
		transform: rotate(4deg);
	}

	.task-item.goal .check-mark {
		border-color: var(--color-goal-primary);
	}

	.task-item.goal .check-mark.checked {
		background: var(--color-goal-primary);
	}

	.task-content {
		flex: 1;
		min-width: 0;
	}

	.task-text {
		word-wrap: break-word;
		white-space: pre-wrap;
		line-height: 1.5;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		width: 100%;
		cursor: text;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
	}

	.task-item.completed .task-text {
		text-decoration: line-through;
		color: var(--color-text-muted);
	}

	.task-input {
		width: 100%;
		min-height: 60px;
		padding: var(--spacing-sm);
		border: none;
		border-radius: 4px;
		background: var(--color-background);
		font-family: inherit;
		font-size: inherit;
		line-height: 1.5;
		resize: none;
	}

	.task-input:focus {
		outline: none;
	}


</style>

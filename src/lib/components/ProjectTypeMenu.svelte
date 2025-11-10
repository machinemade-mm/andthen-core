<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let visible: boolean = false;

	const dispatch = createEventDispatcher<{
		select: 'project' | 'goal';
		close: void;
	}>();

	let selectedIndex = 0;

	function handleKeyDown(e: KeyboardEvent) {
		if (!visible) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % 3; // 3 options now: project, goal, upgrade
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + 3) % 3;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex === 0) {
				dispatch('select', 'project');
			} else if (selectedIndex === 1) {
				dispatch('select', 'goal');
			} else if (selectedIndex === 2) {
				// Open upgrade link
				window.open('https://andthenwhat.app', '_blank');
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			dispatch('close');
		}
	}

	function selectType(type: 'project' | 'goal') {
		dispatch('select', type);
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if visible}
	<div class="menu-overlay">
		<div class="menu-container">
			<h3>Create New Column</h3>
			<div class="menu-options">
				<button
					class="menu-option"
					class:selected={selectedIndex === 0}
					on:click={() => selectType('project')}
				>
					<div class="option-icon project-icon">📋</div>
					<div class="option-details">
						<div class="option-title">Project</div>
						<div class="option-description">A simple collection of tasks</div>
					</div>
				</button>
				<button
					class="menu-option"
					class:selected={selectedIndex === 1}
					on:click={() => selectType('goal')}
				>
					<div class="option-icon goal-icon">🎯</div>
					<div class="option-details">
						<div class="option-title">Goal</div>
						<div class="option-description">For long-term objectives and achievements</div>
					</div>
				</button>
			</div>

			<button
				class="upgrade-section"
				class:selected={selectedIndex === 2}
				on:click={() => window.open('https://andthenwhat.app', '_blank')}
			>
				<div class="upgrade-title">⭐ Want AI-powered planning?</div>
				<div class="upgrade-description">
					Upgrade to Pro for AI-generated action plans, smart suggestions, cloud sync, and team collaboration.
				</div>
				<div class="upgrade-link">
					Learn More →
				</div>
			</button>

			<div class="menu-hint">
				<kbd>↑</kbd><kbd>↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Cancel
			</div>
		</div>
	</div>
{/if}

<style>
	.menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.menu-container {
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 8px;
		padding: 20px;
		width: 400px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
		color: #fff;
		text-align: center;
	}

	.menu-options {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.menu-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: #1a1a1a;
		border: 2px solid #444;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
		text-align: left;
	}

	.menu-option:hover {
		background: #333;
		border-color: var(--color-primary);
	}

	.menu-option.selected {
		background: #333;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-dark);
	}

	.option-icon {
		font-size: 32px;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.project-icon {
		background: rgba(184, 90, 92, 0.2);
	}

	.goal-icon {
		background: rgba(90, 124, 184, 0.2);
	}

	.option-details {
		flex: 1;
	}

	.option-title {
		font-size: 16px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 4px;
	}

	.option-description {
		font-size: 13px;
		color: #999;
	}

	.upgrade-section {
		margin-top: 16px;
		padding: 16px;
		background: rgba(184, 90, 92, 0.1);
		border: 1px solid rgba(184, 90, 92, 0.3);
		border-radius: 6px;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.upgrade-section:hover {
		background: rgba(184, 90, 92, 0.15);
		border-color: rgba(184, 90, 92, 0.5);
	}

	.upgrade-section.selected {
		background: rgba(184, 90, 92, 0.2);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-dark);
	}

	.upgrade-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: 8px;
	}

	.upgrade-description {
		font-size: 12px;
		color: #999;
		line-height: 1.5;
		margin-bottom: 12px;
	}

	.upgrade-link {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-primary);
	}

	.menu-hint {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #444;
		text-align: center;
		font-size: 12px;
		color: #777;
		display: flex;
		gap: 16px;
		justify-content: center;
		align-items: center;
	}

	kbd {
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 3px;
		padding: 2px 6px;
		font-family: monospace;
		font-size: 11px;
		color: #aaa;
	}
</style>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let suggestions: string[] = [];
	export let loading = false;
	export let error: string | null = null;

	const dispatch = createEventDispatcher<{ select: string; close: void }>();

	function selectSuggestion(suggestion: string) {
		dispatch('select', suggestion);
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="ai-suggestions-overlay" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="dialog" aria-modal="true" tabindex="-1">
	<div class="ai-suggestions-panel" on:click|stopPropagation on:keydown|stopPropagation>
		<div class="panel-header">
			<h3>AI Task Suggestions</h3>
			<button class="close-btn" on:click={close} type="button">×</button>
		</div>

		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Generating suggestions...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<p class="error-message">{error}</p>
				<button class="retry-btn" on:click={close} type="button">Close</button>
			</div>
		{:else if suggestions.length > 0}
			<div class="suggestions-list">
				{#each suggestions as suggestion, index}
					<button
						class="suggestion-item"
						on:click={() => selectSuggestion(suggestion)}
						type="button"
					>
						<span class="suggestion-number">{index + 1}</span>
						<span class="suggestion-text">{suggestion}</span>
					</button>
				{/each}
			</div>
			<div class="panel-footer">
				<p class="hint">Click a suggestion to use it, or Esc to cancel</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.ai-suggestions-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(60, 42, 42, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(2px);
	}

	.ai-suggestions-panel {
		background: var(--color-surface);
		border: 3px solid var(--color-primary);
		border-radius: var(--border-radius);
		width: 90%;
		max-width: 500px;
		box-shadow: 0 8px 32px rgba(184, 90, 92, 0.3);
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 2px solid var(--color-border);
	}

	.panel-header h3 {
		margin: 0;
		color: var(--color-primary);
		font-size: 1.25rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: var(--color-background);
		color: var(--color-primary);
	}

	.loading-state,
	.error-state {
		padding: var(--spacing-xl);
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto var(--spacing-md);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-message {
		color: #c33;
		margin-bottom: var(--spacing-md);
	}

	.retry-btn {
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-primary);
		color: var(--color-surface);
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn:hover {
		background: var(--color-primary-dark);
	}

	.suggestions-list {
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.suggestion-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.suggestion-item:hover {
		border-color: var(--color-primary);
		transform: translateX(4px);
		box-shadow: 0 4px 12px rgba(184, 90, 92, 0.2);
	}

	.suggestion-number {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		background: var(--color-primary);
		color: var(--color-surface);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.suggestion-text {
		flex: 1;
		color: var(--color-text);
		line-height: 1.5;
	}

	.panel-footer {
		padding: var(--spacing-md) var(--spacing-lg);
		border-top: 2px solid var(--color-border);
		background: var(--color-background);
	}

	.hint {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>

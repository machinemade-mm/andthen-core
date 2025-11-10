<script lang="ts">
	import { projects, navigationActions } from '$lib/stores/grid';

	// Calculate the max task count for scaling
	$: maxTaskCount = Math.max(...$projects.map(p => p.tasks.length), 1);

	// Calculate qualitative lines (8 lines = 100%, each line = 12.5%)
	// Can show half-lines (thin) for 6.25% increments
	$: bars = $projects.map((project, index) => {
		const percentage = (project.tasks.length / maxTaskCount) * 100;
		// Calculate lines: full line = 12.5%, half line = 6.25%
		const fullLines = Math.floor(percentage / 12.5);
		const hasHalfLine = (percentage % 12.5) >= 6.25;

		return {
			projectId: project.id,
			name: project.name,
			type: project.type,
			fullLines,
			hasHalfLine,
			taskCount: project.tasks.length,
			index
		};
	});

	function handleBarClick(index: number) {
		navigationActions.setPosition(index, 0);
	}
</script>

{#if $projects.length > 0}
	<div class="column-visualizer">
		<div class="bars-container">
			{#each bars as bar (bar.projectId)}
				<button
					class="bar"
					class:goal={bar.type === 'goal'}
					on:click={() => handleBarClick(bar.index)}
					title="{bar.name}: {bar.taskCount} tasks"
					type="button"
				>
					<div class="lines">
						{#each Array(8) as _, lineIndex}
							<div
								class="line"
								class:filled={lineIndex < bar.fullLines}
								class:half={lineIndex === bar.fullLines && bar.hasHalfLine}
								class:goal={bar.type === 'goal'}
							></div>
						{/each}
					</div>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.column-visualizer {
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-sm);
	}

	.bars-container {
		display: flex;
		align-items: flex-start;
		gap: 4px;
		height: 40px;
		padding: 5px 0;
	}

	.bar {
		width: 10px;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		position: relative;
		transition: transform 0.2s ease;
		height: 100%;
	}

	.bar:hover {
		transform: translateY(-2px);
	}

	.lines {
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: space-between;
	}

	.line {
		width: 100%;
		height: 2px;
		background: var(--color-border);
		border-radius: 1px;
		transition: all 0.3s ease;
	}

	.line.filled {
		background: var(--color-primary);
		height: 3px;
	}

	.line.filled.goal {
		background: var(--color-goal-primary);
	}

	.line.half {
		background: var(--color-primary);
		height: 2px;
		opacity: 0.6;
	}

	.line.half.goal {
		background: var(--color-goal-primary);
	}

	.bar:hover .line.filled,
	.bar:hover .line.half {
		background: var(--color-primary-dark);
		box-shadow: 0 1px 4px rgba(184, 90, 92, 0.3);
	}

	.bar.goal:hover .line.filled,
	.bar.goal:hover .line.half {
		background: var(--color-goal-dark);
		box-shadow: 0 1px 4px rgba(90, 124, 184, 0.3);
	}
</style>

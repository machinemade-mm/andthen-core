<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import TaskGrid from '$lib/components/TaskGrid.svelte';

	onMount(() => {
		authStore.init();
	});

	function handleLogout() {
		// In core version, logout doesn't make sense (local only)
		// But we keep the function for compatibility
	}
</script>

{#if $authStore.loading}
	<div class="loading-container">
		<img src="/andthenwhat_logo.png" alt="and then what?" class="app-logo" />
		<p>Loading...</p>
	</div>
{:else}
	<div class="app-container">
		<TaskGrid {handleLogout} />
	</div>
{/if}

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: var(--color-background);
	}

	.loading-container .app-logo {
		height: 60px;
		width: auto;
		margin-bottom: var(--spacing-md);
	}

	.loading-container p {
		color: var(--color-text-muted);
	}

	.app-container {
		position: relative;
		height: 100vh;
	}
</style>

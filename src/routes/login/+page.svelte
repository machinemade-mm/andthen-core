<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let isLogin = true;
	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	onMount(() => {
		// Initialize auth store
		authStore.init();
	});

	// Redirect if already logged in
	$: if ($authStore.user && !$authStore.loading) {
		goto('/');
	}

	async function handleSubmit() {
		error = '';
		loading = true;

		try {
			if (isLogin) {
				await authStore.login(email, password);
			} else {
				await authStore.register(email, password);
			}
			goto('/');
		} catch (err: any) {
			error = err.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		isLogin = !isLogin;
		error = '';
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="logo">
			<h1>AndThenWhat?</h1>
			<p class="tagline">Keyboard-first task management</p>
		</div>

		<form on:submit|preventDefault={handleSubmit}>
			<h2>{isLogin ? 'Log In' : 'Sign Up'}</h2>

			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="you@example.com"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					required
					disabled={loading}
					minlength="8"
				/>
				{#if !isLogin}
					<p class="hint">At least 8 characters, with a letter and number</p>
				{/if}
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					Loading...
				{:else}
					{isLogin ? 'Log In' : 'Sign Up'}
				{/if}
			</button>

			<p class="toggle-text">
				{isLogin ? "Don't have an account?" : 'Already have an account?'}
				<button type="button" class="toggle-btn" on:click={toggleMode}>
					{isLogin ? 'Sign Up' : 'Log In'}
				</button>
			</p>
		</form>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background);
		padding: var(--spacing-lg);
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		background: var(--color-surface);
		border: 3px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-xl);
		box-shadow: 0 8px 24px rgba(184, 90, 92, 0.1);
	}

	.logo {
		text-align: center;
		margin-bottom: var(--spacing-xl);
	}

	.logo h1 {
		font-size: 2.5rem;
		color: var(--color-primary);
		margin: 0 0 var(--spacing-xs) 0;
		font-weight: 700;
	}

	.tagline {
		color: var(--color-text-muted);
		margin: 0;
		font-size: 0.875rem;
	}

	h2 {
		text-align: center;
		color: var(--color-text);
		margin-bottom: var(--spacing-lg);
	}

	.error-message {
		background: #fdd;
		border: 2px solid #c33;
		color: #c33;
		padding: var(--spacing-md);
		border-radius: var(--border-radius);
		margin-bottom: var(--spacing-md);
		text-align: center;
	}

	.form-group {
		margin-bottom: var(--spacing-lg);
	}

	label {
		display: block;
		margin-bottom: var(--spacing-xs);
		color: var(--color-text);
		font-weight: 600;
	}

	input {
		width: 100%;
		padding: var(--spacing-md);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-background);
		transition: border-color 0.2s ease;
	}

	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		margin-top: var(--spacing-xs);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.submit-btn {
		width: 100%;
		padding: var(--spacing-md);
		background: var(--color-primary);
		color: var(--color-surface);
		border: none;
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-primary-dark);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(184, 90, 92, 0.3);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.toggle-text {
		text-align: center;
		margin-top: var(--spacing-lg);
		color: var(--color-text-muted);
	}

	.toggle-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
	}

	.toggle-btn:hover {
		color: var(--color-primary-dark);
	}
</style>

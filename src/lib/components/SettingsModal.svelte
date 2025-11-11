<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { projects } from '$lib/stores/grid';
	import { get } from 'svelte/store';

	export let visible: boolean = false;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let fileInput: HTMLInputElement;
	let selectedIndex = 0;
	const totalButtons = 6; // Export, Import, Clear, Database, GitHub, Upgrade

	// Reset selection when modal opens
	$: if (visible) {
		selectedIndex = 0;
	}

	// Auto-scroll selected item into view
	$: if (visible && selectedIndex >= 0) {
		setTimeout(() => {
			const selectedElements = document.querySelectorAll('.settings-btn.selected, .info-item.selected');
			if (selectedElements.length > 0) {
				selectedElements[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}, 50);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!visible) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % totalButtons;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + totalButtons) % totalButtons;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex === 0) {
				exportData();
			} else if (selectedIndex === 1) {
				triggerImport();
			} else if (selectedIndex === 2) {
				clearAllData();
			} else if (selectedIndex === 3) {
				openDatabaseLocation();
			} else if (selectedIndex === 4) {
				window.open('https://github.com/machinemade-mm/andthen-core', '_blank');
			} else if (selectedIndex === 5) {
				window.open('https://andthenwhat.app', '_blank');
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	function close() {
		dispatch('close');
	}

	async function exportData() {
		try {
			// Get all projects with tasks
			const allProjects = get(projects);

			const exportData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				projects: allProjects
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `andthen-backup-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);

			alert('✅ Data exported successfully!');
		} catch (error) {
			alert('❌ Failed to export data: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	async function importData(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const text = await file.text();
			const importedData = JSON.parse(text);

			// Validate the data structure
			if (!importedData.version || !importedData.projects) {
				throw new Error('Invalid backup file format');
			}

			// Warn user and auto-backup current data
			const confirmed = confirm(
				'⚠️ WARNING: This will replace ALL your current data!\n\n' +
				'Before importing, your current data will be automatically backed up.\n\n' +
				'Continue with import?'
			);

			if (!confirmed) {
				if (fileInput) fileInput.value = '';
				return;
			}

			// Auto-backup current data before importing
			const currentProjects = get(projects);
			const backupData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				projects: currentProjects
			};
			const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
			const backupUrl = URL.createObjectURL(backupBlob);
			const backupLink = document.createElement('a');
			backupLink.href = backupUrl;
			backupLink.download = `andthen-backup-before-import-${new Date().toISOString().split('T')[0]}.json`;
			backupLink.click();
			URL.revokeObjectURL(backupUrl);

			// Delete all existing projects
			for (const project of currentProjects) {
				await fetch(`/api/projects/${project.id}`, {
					method: 'DELETE'
				});
			}

			// Import new projects and tasks
			for (const project of importedData.projects) {
				// Create project
				const projectResponse = await fetch('/api/projects', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: project.name,
						type: project.type || 'project',
						goalDescription: project.goal_description || null,
						position: project.position
					})
				});

				if (!projectResponse.ok) {
					throw new Error(`Failed to import project: ${project.name}`);
				}

				const { project: newProject } = await projectResponse.json();

				// Create tasks for this project
				if (project.tasks && project.tasks.length > 0) {
					for (const task of project.tasks) {
						await fetch(`/api/projects/${newProject.id}/tasks`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								content: task.content,
								position: task.position
							})
						});
					}
				}
			}

			// Reset the file input
			if (fileInput) fileInput.value = '';

			alert('✅ Data imported successfully! The page will reload.');

			// Reload the page to refresh state
			window.location.reload();
		} catch (error) {
			alert('❌ Failed to import data: ' + (error instanceof Error ? error.message : 'Unknown error'));
			if (fileInput) fileInput.value = '';
		}
	}

	function triggerImport() {
		fileInput?.click();
	}

	async function clearAllData() {
		const confirmed = confirm(
			'⚠️ WARNING: This will delete ALL your projects and tasks!\n\n' +
			'This action cannot be undone.\n\n' +
			'Are you absolutely sure?'
		);

		if (!confirmed) return;

		const doubleConfirm = confirm(
			'This is your last chance!\n\n' +
			'Type YES in your mind and click OK to permanently delete everything.'
		);

		if (!doubleConfirm) return;

		try {
			// Delete all projects (which cascades to tasks)
			const allProjects = get(projects);

			for (const project of allProjects) {
				const response = await fetch(`/api/projects/${project.id}`, {
					method: 'DELETE'
				});

				if (!response.ok) {
					throw new Error('Failed to delete project');
				}
			}

			// Reload the page to refresh state
			window.location.reload();
		} catch (error) {
			alert('❌ Failed to clear data: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	function openDatabaseLocation() {
		alert(`📁 Database location:\n\n./andthen.db\n\n(in your app's root directory)\n\nCopy this file to back up your data!`);
	}

	const appVersion = '1.0.0';
	const license = 'AGPL-3.0';
</script>

<svelte:window on:keydown={handleKeyDown} />

<input
	type="file"
	accept=".json"
	bind:this={fileInput}
	on:change={importData}
	style="display: none;"
/>

{#if visible}
	<div class="modal-overlay" on:click={close}>
		<div class="modal-container" on:click|stopPropagation>
			<div class="modal-header">
				<h2>⚙️ Settings</h2>
				<button class="close-btn" on:click={close}>×</button>
			</div>

			<div class="modal-content">
				<!-- Data Management Section -->
				<section class="settings-section">
					<h3>📦 Data Management</h3>
					<div class="settings-group">
						<button class="settings-btn" class:selected={selectedIndex === 0} on:click={exportData}>
							<span class="btn-icon">💾</span>
							<div class="btn-content">
								<div class="btn-title">Export Data</div>
								<div class="btn-description">Download all your projects and tasks as JSON</div>
							</div>
						</button>

						<button class="settings-btn" class:selected={selectedIndex === 1} on:click={triggerImport}>
							<span class="btn-icon">📥</span>
							<div class="btn-content">
								<div class="btn-title">Import Data</div>
								<div class="btn-description">Restore from a backup file</div>
							</div>
						</button>

						<button class="settings-btn danger" class:selected={selectedIndex === 2} on:click={clearAllData}>
							<span class="btn-icon">🗑️</span>
							<div class="btn-content">
								<div class="btn-title">Clear All Data</div>
								<div class="btn-description">Permanently delete all projects and tasks</div>
							</div>
						</button>
					</div>
				</section>

				<!-- About Section -->
				<section class="settings-section">
					<h3>ℹ️ About</h3>
					<div class="info-grid">
						<div class="info-item">
							<div class="info-label">Version</div>
							<div class="info-value">{appVersion}</div>
						</div>

						<div class="info-item">
							<div class="info-label">License</div>
							<div class="info-value">{license}</div>
						</div>

						<div class="info-item full-width" class:selected={selectedIndex === 3}>
							<div class="info-label">Database</div>
							<button class="info-link" on:click={openDatabaseLocation}>
								📁 View Location
							</button>
						</div>

						<div class="info-item full-width" class:selected={selectedIndex === 4}>
							<div class="info-label">Source Code</div>
							<a href="https://github.com/machinemade-mm/andthen-core" target="_blank" rel="noopener noreferrer" class="info-link">
								🔗 GitHub Repository
							</a>
						</div>

						<div class="info-item full-width" class:selected={selectedIndex === 5}>
							<div class="info-label">Upgrade</div>
							<a href="https://andthenwhat.app" target="_blank" rel="noopener noreferrer" class="info-link upgrade">
								⭐ Get AI Features & Cloud Sync
							</a>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal-container {
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 2px solid var(--color-border);
		background: var(--color-background);
	}

	h2 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--color-text);
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		font-size: 2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s;
		line-height: 1;
		padding: 0;
	}

	.close-btn:hover {
		background: var(--color-background);
		color: var(--color-text);
	}

	.modal-content {
		padding: var(--spacing-lg);
		overflow-y: auto;
	}

	.settings-section {
		margin-bottom: var(--spacing-xl);
	}

	.settings-section:last-child {
		margin-bottom: 0;
	}

	h3 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.settings-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.settings-btn {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
	}

	.settings-btn:hover {
		background: var(--color-surface);
		border-color: var(--color-primary);
	}

	.settings-btn.selected {
		background: var(--color-surface);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 4px rgba(184, 90, 92, 0.3);
	}

	.settings-btn.danger:hover {
		border-color: #dc3545;
		background: rgba(220, 53, 69, 0.1);
	}

	.settings-btn.danger.selected {
		border-color: #dc3545;
		background: rgba(220, 53, 69, 0.15);
		box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.2);
	}

	.btn-icon {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-content {
		flex: 1;
	}

	.btn-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 4px;
	}

	.btn-description {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
	}

	.info-item {
		padding: var(--spacing-md);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.info-item.full-width {
		grid-column: 1 / -1;
	}

	.info-item.selected {
		background: var(--color-surface);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 4px rgba(184, 90, 92, 0.3);
	}

	.info-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}

	.info-value {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.info-link {
		display: inline-block;
		font-size: 0.9rem;
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s;
	}

	.info-link:hover {
		color: var(--color-primary-dark);
		transform: translateX(2px);
	}

	.info-link.upgrade {
		font-weight: 600;
	}
</style>

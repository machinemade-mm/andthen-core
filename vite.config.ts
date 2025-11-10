import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		strictPort: false
	},
	preview: {
		port: 4173,
		strictPort: false
	},
	ssr: {
		noExternal: []
	},
	build: {
		rollupOptions: {
			external: ['@google-cloud/vertexai']
		}
	}
});

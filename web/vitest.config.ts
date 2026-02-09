import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts']
	}
});

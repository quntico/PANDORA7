import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'src': path.resolve(__dirname, './src')
		},
	},
	base: '/',
	build: {
		outDir: 'dist',
		sourcemap: true,
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom', 'react-router-dom'],
					ui: ['@radix-ui/react-dialog', '@radix-ui/react-slot'],
					charts: ['recharts'],
					three: ['three', '@react-three/fiber', '@react-three/drei']
				}
			}
		}
	},
	server: {
		host: true,
		proxy: {
			'/api': {
				target: 'http://localhost:3010',
				changeOrigin: true,
				secure: false,
			}
		}
	}
});


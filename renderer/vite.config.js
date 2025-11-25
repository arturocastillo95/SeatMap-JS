import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Development server configuration
    server: {
        port: 3000,
        open: '/dev.html',
        // Allow all hosts (for ngrok, localtunnel, etc.)
        host: '0.0.0.0',
        allowedHosts: ['.ngrok-free.dev', '.ngrok.io', 'localhost']
    },

    // Build configuration for library mode
    build: {
        lib: {
            entry: resolve(__dirname, 'index.js'),
            name: 'SeatMapRenderer',
            fileName: (format) => `seatmap-renderer.${format}.js`
        },
        rollupOptions: {
            // Externalize pixi.js - consumers should provide their own
            external: ['pixi.js'],
            output: {
                // Global variable name for UMD build
                globals: {
                    'pixi.js': 'PIXI'
                },
                // Preserve module structure for better tree-shaking
                preserveModules: false
            }
        },
        // Generate sourcemaps for debugging
        sourcemap: true,
        // Target modern browsers
        target: 'es2020',
        // Minify production builds
        minify: 'esbuild'
    },

    // Resolve aliases
    resolve: {
        alias: {
            '@core': resolve(__dirname, 'core'),
            '@interaction': resolve(__dirname, 'interaction'),
            '@rendering': resolve(__dirname, 'rendering'),
            '@ui': resolve(__dirname, 'ui'),
            '@inventory': resolve(__dirname, 'inventory')
        }
    }
});

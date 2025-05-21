import path from "path"
import dts from 'vite-plugin-dts'
import react from "@vitejs/plugin-react-swc"
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
        }),
        react(),
        tailwindcss(),
    ],
    optimizeDeps: {
        esbuildOptions: {
            tsconfig: './tsconfig.app.json'
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: './dist',
        chunkSizeWarningLimit: 2500,
        assetsInlineLimit: 0,
        lib: {
            entry: path.resolve(__dirname, './src/index.ts'),
            name: '@kortexa-ai/auth',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'react',
                'react/jsx-runtime',
                'react-dom',
                'firebase',
                'firebase/app',
                'firebase/auth',
            ],
            output: {
                globals: {
                    react: 'React',
                    'react/jsx-runtime': 'jsxRuntime',
                    'react-dom': 'ReactDOM',
                    firebase: 'firebase',
                    'firebase/app': 'firebase.app',
                    'firebase/auth': 'firebase.auth',
                },
            },
        },
        sourcemap: true,
        emptyOutDir: true, // Usually good practice
    },
});
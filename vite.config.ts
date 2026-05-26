import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
                    if (id.includes('@tanstack/react-query')) return 'query';
                    if (id.includes('react') || id.includes('react-router')) return 'vendor';
                    return undefined;
                }
            }
        }
    }
})

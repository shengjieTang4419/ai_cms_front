import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
    plugins: [
        vue(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
    ],
    server: {
        port: 3000,
        proxy: {
            '/api/auth': {
                target: 'http://localhost:18081',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:18080',
                changeOrigin: true,
            }
        }
    }
})

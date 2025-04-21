import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        // svgr 选项
        icon: true,
        // 保留 svg 的颜色和其他属性
        svgo: false,
      },
    }),
  ],
  // 构建时可以删除代理配置，因为生产环境不会使用它
  // 开发环境仍然可以保留这些配置
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});

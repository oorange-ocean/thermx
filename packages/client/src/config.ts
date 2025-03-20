// 根据环境设置API基础URL
const isProd = import.meta.env.PROD;
export const API_BASE_URL = isProd
  ? 'http://47.115.231.105:5001' // 生产环境，使用完整URL
  : 'http://localhost:5001'; // 开发环境，使用相对路径（通过vite代理）

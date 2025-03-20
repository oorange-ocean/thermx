module.exports = {
  apps: [
    {
      name: 'thermal-frontend',
      script: 'serve', // 使用 serve 包来托管静态文件
      env: {
        PM2_SERVE_PATH: './packages/client/dist',
        PM2_SERVE_PORT: 5000,
        PM2_SERVE_SPA: 'true',
      },
    },
    {
      name: 'thermal-backend',
      script: './packages/server/dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATA_DIR: '/home/data', // 添加数据目录环境变量
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
        DATA_DIR: './packages/server/public', // 开发环境的数据目录
      },
    },
  ],
};

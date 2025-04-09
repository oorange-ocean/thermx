module.exports = {
  apps: [
    {
      name: 'thermal-frontend',
      script: 'serve', // 使用 serve 包来托管静态文件
      env: {
        PM2_SERVE_PATH: './packages/client/dist',
        PM2_SERVE_PORT: 5000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_COMPRESS: 'true', // 启用前端静态文件压缩
      },
    },
    // {
    //   name: 'thermal-backend',
    //   script: './packages/server/dist/main.js',
    //   env: {
    //     NODE_ENV: 'production',
    //     PORT: 5001,
    //     DATA_DIR: '/home/data', // 添加数据目录环境变量
    //     COMPRESSION_LEVEL: '6', // 可选：设置压缩级别 (0-9)
    //   },
    //   env_development: {
    //     NODE_ENV: 'development',
    //     PORT: 5001,
    //     DATA_DIR: './packages/server/public', // 开发环境的数据目录
    //     COMPRESSION_LEVEL: '6', // 开发环境也启用压缩
    //   },
    // },
    {
      name: 'thermal-python-backend',
      script: './packages/python-server/venv/bin/python',
      args: './packages/python-server/main.py',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATA_DIR: '/home/data',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
        DATA_DIR: './packages/python-server/data',
      },
    },
  ],
};

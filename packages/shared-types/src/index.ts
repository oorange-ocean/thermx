// 这里定义您的共享类型
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// 导出热力系统数据类型
export * from './thermalData';

// 导出特征数据类型
export * from './features';

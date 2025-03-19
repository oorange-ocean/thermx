// 特征数据类型
export interface Ts2VecFeatures extends Record<`feature_${number}`, number> {
  稳态区间编号: number;
  Cluster: number;
}

// 为了方便使用，导出一些常用的类型
export type FeatureValue = number;
export type FeatureIndex = keyof Ts2VecFeatures;

// 辅助函数类型
export interface FeatureOperations {
  getFeatureValue: (feature: FeatureIndex) => FeatureValue;
  setFeatureValue: (feature: FeatureIndex, value: FeatureValue) => void;
}

// 特征数据的工具函数类型
export interface FeatureUtils {
  getAllFeatureNames: () => FeatureIndex[];
  getFeatureCount: () => number;
  isValidFeature: (feature: string) => feature is FeatureIndex;
}

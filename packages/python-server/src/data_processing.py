import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import skew
from scipy.signal import find_peaks, savgol_filter
from scipy.stats import variation
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from sklearn.feature_selection import mutual_info_regression
import torch
from tqdm import tqdm
import os
import sys
import matplotlib as mpl
import platform

# 根据操作系统设置中文字体
if platform.system() == 'Darwin':  # macOS
    plt.rcParams['font.family'] = ['Arial Unicode MS', 'Heiti TC', 'SimHei']
else:  # Windows 和 Linux
    plt.rcParams['font.family'] = ['SimHei', 'DejaVu Sans']

# 解决负号显示问题
plt.rcParams['axes.unicode_minus'] = False

# 设置DPI以获得更清晰的图像
plt.rcParams['figure.dpi'] = 150

# 文件路径配置
DATA_PATH = '../data/raw_data.csv'
SAVE_PATH = '../output/cleaned_results.csv'
STEADY_SAVE_PATH = '../output/steady_state_data.csv'
FEATURE_SAVE_PATH = '../output/ts2vec_features.csv'
CLUSTER_SAVE_PATH = '../output/clustering_data_ts2vec.csv'

def analyze_distribution(df, column_name, bins=50, low_value_threshold=5.0):
    """分析数据分布并推荐异常值检测方法"""
    data = df[column_name].dropna()
    if len(data) == 0:
        print(f"列 '{column_name}' 无有效数据（全为 NaN），跳过分析")
        return None

    hist, bin_edges = np.histogram(data, bins=bins, density=True)
    peaks, _ = find_peaks(hist, prominence=0.1)
    data_skew = skew(data)
    low_value_ratio = (data < low_value_threshold).sum() / len(data) * 100

    print(f"列 '{column_name}' 分布分析：")
    print(f"- 有效数据量：{len(data)}")
    print(f"- 最小值：{data.min():.2f}, 最大值：{data.max():.2f}")
    print(f"- 低值区 (<{low_value_threshold}) 比例：{low_value_ratio:.2f}%")
    print(f"- 偏度：{data_skew:.2f}, 峰值数量：{len(peaks)}")

    if len(peaks) > 1:
        method = 'multi_peak'
        print("推荐方法：多峰处理（分段检测）")
    elif low_value_ratio > 40 and abs(data_skew) > 1:
        method = 'low_value_dense'
        print("推荐方法：低值密集区处理（分段检测）")
    elif abs(data_skew) > 1:
        method = 'percentile'
        print("推荐方法：百分位法（偏态分布）")
    else:
        method = 'IQR'
        print("推荐方法：IQR（均匀或近似正态分布）")

    return method

def detect_and_clean_outliers_auto(df, column_name, low_value_threshold=5.0, iqr_multiplier=1.5, 
                                 percentile_bounds=(1, 99), high_outlier_threshold=5.0, max_outlier_ratio=5.0):
    """根据分布自动选择方法检测和清理异常值"""
    print(f"\n检查列 '{column_name}' 的数据状态：")
    print(f"- 总数据量：{len(df[column_name])}, NaN 数量：{df[column_name].isna().sum()}")

    data = df[column_name].dropna()
    if len(data) == 0:
        print(f"列 '{column_name}' 无有效数据（全为 NaN），跳过处理")
        return False, None, None, None

    method = analyze_distribution(df, column_name, low_value_threshold=low_value_threshold)
    if method is None:
        return False, None, None, None

    outliers = pd.Series(dtype=float)
    low_data = None
    high_data = None
    split_point = None

    if method == 'multi_peak':
        hist, bin_edges = np.histogram(data, bins=50, density=True)
        peaks, _ = find_peaks(hist, prominence=0.1)

        if len(peaks) > 1:
            valleys, _ = find_peaks(-hist, prominence=0.05)
            if len(valleys) > 0:
                valley_idx = valleys[np.argmin(hist[valleys])]
                split_point = bin_edges[valley_idx]
            else:
                split_point = (bin_edges[peaks[0]] + bin_edges[peaks[-1]]) / 2

            low_data = data[data <= split_point]
            high_data = data[data > split_point]
            outliers_idx = []

            for segment, label in [(low_data, '低值段'), (high_data, '高值段')]:
                if len(segment) > 0:
                    segment_skew = skew(segment)
                    adjusted_iqr_multiplier = iqr_multiplier + 0.5 * abs(segment_skew) if abs(segment_skew) > 0.5 else iqr_multiplier
                    print(f"- {label}：调整后的 IQR 倍数={adjusted_iqr_multiplier:.2f}")

                    Q1 = segment.quantile(0.25)
                    Q3 = segment.quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - adjusted_iqr_multiplier * IQR
                    upper_bound = Q3 + adjusted_iqr_multiplier * IQR
                    segment_outliers = segment[(segment < lower_bound) | (segment > upper_bound)]
                    outliers_idx.extend(segment_outliers.index)

            outliers = data.loc[outliers_idx]
            outlier_ratio = len(outliers) / len(df) * 100

            while outlier_ratio > max_outlier_ratio and adjusted_iqr_multiplier < 3.0:
                print(f"异常值占比 {outlier_ratio:.2f}% 过高，尝试放宽 IQR 倍数...")
                adjusted_iqr_multiplier += 0.5
                outliers_idx = []
                for segment, label in [(low_data, '低值段'), (high_data, '高值段')]:
                    if len(segment) > 0:
                        Q1 = segment.quantile(0.25)
                        Q3 = segment.quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - adjusted_iqr_multiplier * IQR
                        upper_bound = Q3 + adjusted_iqr_multiplier * IQR
                        segment_outliers = segment[(segment < lower_bound) | (segment > upper_bound)]
                        outliers_idx.extend(segment_outliers.index)
                outliers = data.loc[outliers_idx]
                outlier_ratio = len(outliers) / len(df) * 100

            df.loc[outliers_idx, column_name] = np.nan

    elif method == 'low_value_dense':
        low_mask = df[column_name] < low_value_threshold
        high_data = data[~low_mask.reindex(data.index, fill_value=False)]
        if len(high_data) > 0:
            Q1 = high_data.quantile(0.25)
            Q3 = high_data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - iqr_multiplier * IQR
            upper_bound = Q3 + iqr_multiplier * IQR
            outliers = high_data[(high_data < lower_bound) | (high_data > upper_bound)]
            df.loc[outliers.index, column_name] = np.nan

    elif method == 'percentile':
        lower_bound, upper_bound = np.percentile(data, percentile_bounds)
        outliers = data[(data < lower_bound) | (data > upper_bound)]
        df.loc[outliers.index, column_name] = np.nan

    else:  # IQR
        Q1 = data.quantile(0.25)
        Q3 = data.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - iqr_multiplier * IQR
        upper_bound = Q3 + iqr_multiplier * IQR
        outliers = data[(data < lower_bound) | (data > upper_bound)]
        df.loc[outliers.index, column_name] = np.nan

    outlier_count = len(outliers)
    outlier_ratio = outlier_count / len(df) * 100

    if outlier_count == 0:
        print(f"列 '{column_name}' 无异常值，跳过详细日志和绘图")
        return False, None, None, None

    print(f"检测到 {outlier_count} 个异常值，占比 {outlier_ratio:.2f}%")

    if outlier_ratio > high_outlier_threshold:
        print(f"警告：异常值占比超过 {high_outlier_threshold}%，以下为详细信息：")
        if method == 'multi_peak':
            print(f"- 分段点：{split_point:.2f}")
            for segment, label in [(low_data, '低值段'), (high_data, '高值段')]:
                if len(segment) > 0:
                    print(f"- {label}：数据量={len(segment)}, 最小值={segment.min():.2f}, 最大值={segment.max():.2f}")
        elif method == 'low_value_dense':
            print(f"- 非低值部分：数据量={len(high_data)}, 最小值={high_data.min():.2f}, 最大值={high_data.max():.2f}")
        elif method == 'percentile':
            print(f"- 百分位范围：下限={lower_bound:.2f}, 上限={upper_bound:.2f}")
        else:
            print(f"- IQR 参数：Q1={Q1:.2f}, Q3={Q3:.2f}, IQR={IQR:.2f}")

    print(f"\n列 '{column_name}' 的异常值样本：")
    sample_size = min(5, len(outliers) // 2)
    print("最小值端：", outliers.nsmallest(sample_size).to_list())
    print("最大值端：", outliers.nlargest(sample_size).to_list())
    return True, method, low_data, high_data

def detect_steady_state(df, column_name='机组负荷', window_size=30, std_threshold=5.0, min_duration=10):
    """检测稳态运行区间"""
    data = df[column_name].dropna()
    if len(data) == 0:
        print(f"列 '{column_name}' 无有效数据，跳过稳态检测")
        return []

    smoothed_data = savgol_filter(data, window_length=window_size, polyorder=2)
    rolling_std = data.rolling(window=window_size, center=True).std()
    is_steady = rolling_std < std_threshold

    steady_intervals = []
    start_idx = None

    for i in range(len(is_steady)):
        if is_steady.iloc[i] and start_idx is None:
            start_idx = i
        elif not is_steady.iloc[i] and start_idx is not None:
            end_idx = i - 1
            if (end_idx - start_idx + 1) >= min_duration:
                steady_intervals.append((start_idx, end_idx))
            start_idx = None

    if start_idx is not None and (len(data) - start_idx) >= min_duration:
        steady_intervals.append((start_idx, len(data) - 1))

    total_length = len(data)
    steady_length = sum(end - start + 1 for start, end in steady_intervals)
    coverage = steady_length / total_length * 100
    stability = [data.iloc[start:end+1].std() for start, end in steady_intervals]

    print(f"检测到 {len(steady_intervals)} 个稳态运行区间")
    print(f"稳态覆盖率: {coverage:.2f}%")
    print(f"各稳态区间标准差: {[f'{s:.2f}' for s in stability]}")

    return steady_intervals

def plot_steady_state(df, column_name='机组负荷', steady_intervals=None):
    """绘制稳态区间图"""
    data = df[column_name].dropna()
    time = pd.to_datetime(df['时间'])

    plt.figure(figsize=(15, 6))
    plt.plot(time, data, label=f'{column_name} (原始数据)', alpha=0.5)

    if steady_intervals:
        for start, end in steady_intervals:
            plt.axvspan(time.iloc[start], time.iloc[end], color='green', alpha=0.3, 
                       label='稳态区间' if start == steady_intervals[0][0] else "")

    plt.title(f'{column_name} 时间序列与稳态区间')
    plt.xlabel('时间')
    plt.ylabel(column_name)
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()

def main():
    # 创建输出目录
    os.makedirs('../output', exist_ok=True)
    
    # 1. 加载数据
    print("加载数据...")
    try:
        # 首先尝试 GBK 编码
        df = pd.read_csv(DATA_PATH, encoding='gbk')
    except:
        try:
            # 如果 GBK 失败，尝试 GB2312 编码
            df = pd.read_csv(DATA_PATH, encoding='gb2312')
        except:
            # 如果还是失败，尝试自动检测编码
            import chardet
            with open(DATA_PATH, 'rb') as file:
                raw_data = file.read()
                result = chardet.detect(raw_data)
                encoding = result['encoding']
                print(f"检测到文件编码为: {encoding}")
                df = pd.read_csv(DATA_PATH, encoding=encoding)
    
    print("数据预览：", df.head())
    print("\n数据信息：", df.info())

    # 2. 异常值检测与清理
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        print(f"\n=== 处理列 '{col}' ===")
        has_outliers, method, low_data, high_data = detect_and_clean_outliers_auto(
            df,
            col,
            low_value_threshold=5.0,
            iqr_multiplier=1.5,
            percentile_bounds=(1, 99),
            high_outlier_threshold=5.0,
            max_outlier_ratio=3.0
        )

    # 保存清理后的数据
    df.to_csv(SAVE_PATH, index=False)
    print(f"\n清理后的数据已保存至：{SAVE_PATH}")

    # 3. 稳态运行区间提取
    steady_intervals = detect_steady_state(
        df,
        column_name='机组负荷',
        window_size=30,
        std_threshold=5.0,
        min_duration=10
    )
    plot_steady_state(df, '机组负荷', steady_intervals)

    # 保存稳态区间数据
    steady_df = pd.DataFrame()
    for idx, (start, end) in enumerate(steady_intervals, 1):
        steady_segment = df.iloc[start:end+1].copy()
        steady_segment['稳态区间编号'] = idx
        steady_df = pd.concat([steady_df, steady_segment])

    steady_df.to_csv(STEADY_SAVE_PATH, index=False)
    print(f"\n稳态运行区间数据已保存至：{STEADY_SAVE_PATH}")

if __name__ == "__main__":
    main() 
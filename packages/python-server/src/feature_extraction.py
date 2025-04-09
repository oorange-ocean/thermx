import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from sklearn.feature_selection import mutual_info_regression
from sklearn.impute import SimpleImputer
from scipy.stats import variation
from tqdm import tqdm
import torch
import torch.nn as nn
import torch.nn.functional as F
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

def calculate_cv(df, cols):
    """计算变异系数"""
    cv_dict = {}
    for col in tqdm(cols, desc="计算变异系数"):
        data = df[col].dropna()
        if len(data) > 0:
            cv_dict[col] = variation(data)
    return cv_dict

def calculate_mutual_info(df, target_col, feature_cols):
    """计算互信息"""
    X = df[feature_cols].fillna(0)
    y = df[target_col].fillna(0)
    mi_scores = mutual_info_regression(X, y)
    return pd.DataFrame({'特征': feature_cols, '互信息': mi_scores}).sort_values('互信息', ascending=False)

def calculate_grey_relation(df, target_col, feature_cols):
    """计算灰色关联度"""
    X = df[feature_cols].fillna(0)
    y = df[target_col].fillna(0)
    X_norm = (X - X.min()) / (X.max() - X.min())
    y_norm = (y - y.min()) / (y.max() - y.min())
    diff = np.abs(X_norm.values - y_norm.values[:, None])
    rho = 0.5
    min_diff = diff.min()
    max_diff = diff.max()
    grey_coeff = (min_diff + rho * max_diff) / (diff + rho * max_diff)
    grey_relation = grey_coeff.mean(axis=0)
    return pd.DataFrame({'特征': feature_cols, '灰色关联度': grey_relation}).sort_values('灰色关联度', ascending=False)

def prepare_ts2vec_data(df, feature_cols, group_col='稳态区间编号', max_len=500):
    """准备 TS2Vec 数据"""
    grouped = df.groupby(group_col)
    data_list = []

    for _, group in tqdm(grouped, desc="准备 TS2Vec 数据"):
        features = group[feature_cols].values
        if len(features) > max_len:
            indices = np.linspace(0, len(features) - 1, max_len).astype(int)
            features = features[indices]
        data_list.append(features)

    padded_data = np.zeros((len(data_list), max_len, len(feature_cols)))
    for i, seq in tqdm(enumerate(data_list), total=len(data_list), desc="填充数据"):
        padded_data[i, :len(seq), :] = seq

    return padded_data

def assign_semantic_labels(df, cluster_col='Cluster_KMeans'):
    """生成语义标签"""
    cluster_stats = df.groupby(cluster_col).agg({
        '平均机组负荷': 'mean',
        '平均热耗率': 'mean'
    })
    load_mean, load_std = df['平均机组负荷'].mean(), df['平均机组负荷'].std()
    heat_mean, heat_std = df['平均热耗率'].mean(), df['平均热耗率'].std()
    labels = []
    for idx, row in cluster_stats.iterrows():
        load = row['平均机组负荷']
        heat = row['平均热耗率']
        load_label = ("高负荷" if load > load_mean + load_std else 
                      "低负荷" if load < load_mean - load_std else "中负荷")
        heat_label = ("高效" if heat < heat_mean - heat_std else 
                      "低效" if heat > heat_mean + heat_std else "中等效率")
        labels.append(f"{load_label}-{heat_label}")
    df['Semantic_Label'] = df[cluster_col].map(dict(zip(cluster_stats.index, labels)))
    return df

class TS2Vec(nn.Module):
    def __init__(self, input_dim, output_dim=64, hidden_dim=128):
        super(TS2Vec, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, output_dim),
            nn.BatchNorm1d(output_dim)
        )
        
    def forward(self, x):
        # x shape: [batch_size, seq_len, input_dim]
        batch_size, seq_len, _ = x.shape
        
        # 编码每个时间步
        encoded = self.encoder(x.reshape(-1, x.shape[-1]))
        encoded = encoded.reshape(batch_size, seq_len, -1)
        
        # 归一化特征
        encoded = F.normalize(encoded, p=2, dim=-1)
        return encoded
    
    def info_nce_loss(self, encoded, tau=0.1):
        """改进的InfoNCE损失函数"""
        batch_size, seq_len, dim = encoded.shape
        
        # 随机选择锚点时间步
        anchor_t = torch.randint(0, seq_len, (batch_size,))
        
        # 获取锚点特征
        anchor = encoded[torch.arange(batch_size), anchor_t]  # [batch_size, dim]
        
        # 为每个锚点选择多个正负样本
        pos_t = (anchor_t + torch.randint(-5, 6, (batch_size,))) % seq_len  # 临近时间步作为正样本
        pos = encoded[torch.arange(batch_size), pos_t]  # [batch_size, dim]
        
        # 计算相似度矩阵
        sim_matrix = torch.matmul(anchor, encoded.reshape(-1, dim).T)  # [batch_size, batch_size*seq_len]
        sim_matrix = sim_matrix / tau
        
        # 创建标签：正样本的位置
        pos_idx = pos_t + torch.arange(batch_size).to(encoded.device) * seq_len
        labels = torch.zeros(batch_size, batch_size*seq_len).to(encoded.device)
        labels.scatter_(1, pos_idx.unsqueeze(1), 1)
        
        # 计算对比损失
        loss = F.cross_entropy(sim_matrix, labels)
        return loss

def train_ts2vec(data, input_dim, epochs=50, batch_size=32):
    """训练TS2Vec模型"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = TS2Vec(input_dim=input_dim).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    # 转换数据为tensor
    data_tensor = torch.FloatTensor(data).to(device)
    
    # 训练循环
    model.train()
    for epoch in tqdm(range(epochs), desc="训练TS2Vec"):
        # 随机批次
        indices = torch.randperm(len(data_tensor))
        total_loss = 0
        num_batches = 0
        
        for i in range(0, len(data_tensor), batch_size):
            batch_indices = indices[i:i+batch_size]
            batch_data = data_tensor[batch_indices]
            
            optimizer.zero_grad()
            encoded = model(batch_data)
            loss = model.info_nce_loss(encoded)
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        scheduler.step()
        avg_loss = total_loss / num_batches
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}")
    
    return model

def extract_features(model, data, device):
    """使用训练好的模型提取特征"""
    model.eval()
    with torch.no_grad():
        data_tensor = torch.FloatTensor(data).to(device)
        encoded = model(data_tensor)
        # 使用平均池化获取序列特征
        features = encoded.mean(dim=1).cpu().numpy()
    return features

def main():
    # 创建输出目录
    os.makedirs('../output', exist_ok=True)
    
    # 1. 加载稳态数据
    print("加载稳态数据...")
    steady_df = pd.read_csv(STEADY_SAVE_PATH)
    print("稳态数据预览：", steady_df.head())

    # 2. 特征重要性分析
    numeric_cols = steady_df.select_dtypes(include=[np.number]).columns.drop('稳态区间编号')
    print(f"共有 {len(numeric_cols)} 个数值列")

    # 计算变异系数
    cv_dict = calculate_cv(steady_df, numeric_cols)
    cv_df = pd.DataFrame(list(cv_dict.items()), columns=['特征', '变异系数']).sort_values('变异系数', ascending=False)

    # 计算互信息
    target_col = '机组负荷'
    mi_df = calculate_mutual_info(steady_df, target_col, numeric_cols.drop(target_col))

    # 计算灰色关联度
    grey_df = calculate_grey_relation(steady_df, target_col, numeric_cols.drop(target_col))

    # 必须包含的重点变量
    must_include = ['主汽压力', '再热汽压力']

    # 选择关键特征
    top_cv = cv_df['特征'].head(4).tolist()
    top_mi = mi_df['特征'].head(4).tolist()
    top_grey = grey_df['特征'].head(4).tolist()
    feature_cols = list(set(top_cv + top_mi + top_grey + must_include))
    print(f"选择的 {len(feature_cols)} 个关键特征（含必须变量 {must_include}）：", feature_cols)

    # 3. 准备数据
    ts2vec_data = prepare_ts2vec_data(steady_df, feature_cols, max_len=500)
    print("TS2Vec 输入数据形状：", ts2vec_data.shape)

    # 4. 使用TS2Vec进行特征提取
    print("使用TS2Vec进行特征提取...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"使用设备: {device}")
    
    # 数据预处理
    print("预处理数据...")
    imputer = SimpleImputer(strategy='mean')
    ts2vec_data = imputer.fit_transform(ts2vec_data.reshape(-1, ts2vec_data.shape[-1])).reshape(ts2vec_data.shape)
    
    # 标准化数据
    scaler = StandardScaler()
    ts2vec_data = scaler.fit_transform(ts2vec_data.reshape(-1, ts2vec_data.shape[-1])).reshape(ts2vec_data.shape)
    
    # 训练TS2Vec模型
    model = train_ts2vec(ts2vec_data, input_dim=ts2vec_data.shape[-1], epochs=50, batch_size=32)
    
    # 提取特征
    features = extract_features(model, ts2vec_data, device)
    print("提取的特征形状：", features.shape)

    # 构建特征数据框
    feature_df = pd.DataFrame(features, columns=[f'feature_{i}' for i in range(features.shape[1])])
    feature_df['稳态区间编号'] = np.arange(1, len(feature_df) + 1)

    # 可视化
    plt.figure(figsize=(10, 6))
    plt.scatter(feature_df['feature_0'], feature_df['feature_1'], c=feature_df['稳态区间编号'], cmap='viridis')
    plt.title('TS2Vec 提取的特征可视化（前两个维度）')
    plt.xlabel('Feature 0')
    plt.ylabel('Feature 1')
    plt.colorbar(label='稳态区间编号')
    plt.show()

    # 5. 聚类分析
    # 计算原始数据的平均特征
    steady_grouped = steady_df.groupby('稳态区间编号').agg({
        '机组负荷': 'mean',
        '汽轮机热耗率q': 'mean'
    }).reset_index()
    steady_grouped.rename(columns={
        '机组负荷': '平均机组负荷',
        '汽轮机热耗率q': '平均热耗率'
    }, inplace=True)

    # K-Means聚类
    n_clusters = 5
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    feature_df['Cluster_KMeans'] = kmeans.fit_predict(features)

    # DBSCAN聚类
    dbscan = DBSCAN(eps=2.0, min_samples=5)
    feature_df['Cluster_DBSCAN'] = dbscan.fit_predict(features)

    # 合并结果
    clustered_df = steady_grouped.merge(
        feature_df[['稳态区间编号', 'Cluster_KMeans', 'Cluster_DBSCAN']], 
        on='稳态区间编号', 
        how='left'
    )
    clustered_df = clustered_df.dropna(subset=['Cluster_KMeans'])

    # 添加语义标签
    clustered_df = assign_semantic_labels(clustered_df)

    # 可视化K-Means结果
    plt.figure(figsize=(10, 6))
    for cluster_id in clustered_df['Cluster_KMeans'].unique():
        cluster_data = clustered_df[clustered_df['Cluster_KMeans'] == cluster_id]
        plt.scatter(cluster_data['平均机组负荷'], cluster_data['平均热耗率'], 
                    label=cluster_data['Semantic_Label'].iloc[0], s=100)
    plt.title(f'K-Means 聚类结果 (基于TS2Vec特征, 簇数: {n_clusters})')
    plt.xlabel('平均机组负荷')
    plt.ylabel('平均热耗率')
    plt.legend(title='语义标签')
    plt.grid(True)
    plt.show()

    # 可视化DBSCAN结果
    plt.figure(figsize=(10, 6))
    plt.scatter(clustered_df['平均机组负荷'], clustered_df['平均热耗率'], 
                c=clustered_df['Cluster_DBSCAN'], cmap='tab10', s=100)
    plt.title('DBSCAN 聚类结果 (基于TS2Vec特征)')
    plt.xlabel('平均机组负荷')
    plt.ylabel('平均热耗率')
    plt.colorbar(label='聚类标签 (-1 为噪声)')
    plt.grid(True)
    plt.show()

    # 保存结果
    clustered_df.to_csv(CLUSTER_SAVE_PATH, index=False)
    print(f"聚类结果已保存至：{CLUSTER_SAVE_PATH}")

    # 输出统计信息
    print("\nK-Means 每个聚类的稳态区间数量：")
    print(clustered_df['Cluster_KMeans'].value_counts())
    print("\nK-Means 每个聚类的特征统计：")
    print(clustered_df.groupby('Cluster_KMeans').agg({
        '平均机组负荷': ['mean', 'std', 'min', 'max'],
        '平均热耗率': ['mean', 'std', 'min', 'max']
    }))
    print("\nDBSCAN 每个聚类的稳态区间数量：")
    print(clustered_df['Cluster_DBSCAN'].value_counts())

if __name__ == "__main__":
    main() 
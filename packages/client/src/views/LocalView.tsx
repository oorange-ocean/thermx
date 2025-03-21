import { useEffect, useState } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import * as d3 from 'd3';
import type { DSVParsedArray } from 'd3';
import { TimeDistribution } from '../components/TimeDistribution';
import { ParameterDistribution } from '../components/ParameterDistribution';
import { LocalViewToolbar } from '../components/LocalViewToolbar';
import { API_BASE_URL } from '../config';
import { dbCache } from '../utils/indexedDBCache';

interface SteadyStateData {
  稳态区间编号: string;
  时间: string;
  主汽压力: string;
  主汽温度: string;
  再热温度: string;
  汽轮机热耗率q: string;
}

interface ClusteringRawData {
  稳态区间编号: string;
  Cluster: string;
  [key: string]: string; // 用于特征字段
}

interface ClusteringData {
  稳态区间编号: number;
  类别: number;
  时间: Date;
  主汽压力: number;
  主汽温度: number;
  再热温度: number;
  汽轮机热耗率q: number;
  [key: string]: number | Date;
}

export const LocalView = () => {
  const [data, setData] = useState<ClusteringData[]>([]);
  const [selectedParameter, setSelectedParameter] = useState('汽轮机热耗率q');
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'day'>('hour');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);

        // 检查是否有已处理的缓存数据
        const cachedData = await dbCache.get<ClusteringData[]>('localViewData');
        if (cachedData) {
          // 比较新处理的数据与缓存数据的哈希
          console.log('使用缓存的局部视图数据');
          setData(cachedData);
          setLoading(false);
          setLoadingProgress(100);
          return;
        }

        // 步骤1: 获取稳态数据元数据 - 了解总分片数
        console.log('获取稳态数据元数据');
        const metadataResponse = await fetch(`${API_BASE_URL}/steady-state-data-metadata`);
        if (!metadataResponse.ok) {
          throw new Error('无法获取数据元数据');
        }

        const metadata = await metadataResponse.json();
        const { totalChunks, totalRecords } = metadata;

        console.log(`数据总分片数: ${totalChunks}, 总记录数: ${totalRecords}`);
        setLoadingProgress(5);

        // 步骤2: 分批加载稳态数据
        let steadyStateData: any[] = [];
        const steadyStateMap = new Map();

        // 首先尝试从缓存获取原始数据
        const cachedRawData = await dbCache.getRawSteadyStateData<string>();
        if (cachedRawData) {
          console.log('使用缓存的原始稳态数据');
          const parsedData = d3.csvParse(
            cachedRawData
          ) as unknown as DSVParsedArray<SteadyStateData>;

          // 处理稳态数据，创建映射表
          steadyStateMap.clear();
          parsedData.forEach((d) => {
            steadyStateMap.set(+d.稳态区间编号, {
              时间: new Date(d.时间),
              主汽压力: +d.主汽压力,
              主汽温度: +d.主汽温度,
              再热温度: +d.再热温度,
              汽轮机热耗率q: +d.汽轮机热耗率q,
            });
          });

          setLoadingProgress(50);
        } else {
          // 分块加载稳态数据
          for (let i = 0; i < totalChunks; i++) {
            console.log(`加载稳态数据分片 ${i + 1}/${totalChunks}`);
            const chunkResponse = await fetch(`${API_BASE_URL}/steady-state-data/${i}`);
            if (!chunkResponse.ok) {
              throw new Error(`无法获取数据分片 ${i}`);
            }

            const chunkData = await chunkResponse.json();
            steadyStateData = [...steadyStateData, ...chunkData];

            // 更新进度，稳态数据加载占总进度的50%
            const progress = Math.round(5 + ((i + 1) / totalChunks) * 45);
            setLoadingProgress(progress);

            // 增量处理数据 - 处理当前已有的数据，构建部分映射
            chunkData.forEach((d: SteadyStateData) => {
              steadyStateMap.set(+d.稳态区间编号, {
                时间: new Date(d.时间),
                主汽压力: +d.主汽压力,
                主汽温度: +d.主汽温度,
                再热温度: +d.再热温度,
                汽轮机热耗率q: +d.汽轮机热耗率q,
              });
            });

            // 每加载3个分片后，让出主线程
            if (i % 3 === 2) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }

          // 将完整的数据保存到缓存中
          const rawData = d3.csvFormat(steadyStateData);
          await dbCache.saveRawSteadyStateData(rawData);
        }

        // 步骤3: 获取聚类数据元数据
        console.log('获取聚类数据元数据');
        const clusteringMetadataResponse = await fetch(`${API_BASE_URL}/clustering-data-metadata`);
        if (!clusteringMetadataResponse.ok) {
          throw new Error('无法获取聚类数据元数据');
        }

        const clusteringMetadata = await clusteringMetadataResponse.json();
        const { totalChunks: clusteringTotalChunks } = clusteringMetadata;

        console.log(`聚类数据总分片数: ${clusteringTotalChunks}`);
        setLoadingProgress(55);

        // 步骤4: 分批加载聚类数据
        let clusteringData: any[] = [];
        let processedData: ClusteringData[] = [];

        for (let i = 0; i < clusteringTotalChunks; i++) {
          console.log(`加载聚类数据分片 ${i + 1}/${clusteringTotalChunks}`);
          const chunkResponse = await fetch(`${API_BASE_URL}/clustering-data/${i}`);
          if (!chunkResponse.ok) {
            throw new Error(`无法获取聚类数据分片 ${i}`);
          }

          const chunkData = await chunkResponse.json();
          clusteringData = [...clusteringData, ...chunkData];

          // 更新进度，聚类数据加载占总进度的35%
          const progress = Math.round(55 + ((i + 1) / clusteringTotalChunks) * 35);
          setLoadingProgress(progress);

          // 增量处理数据 - 处理当前已有的数据
          const processedChunk = chunkData
            .map((d: any) => {
              const 类别 = +d.Cluster;
              const 稳态区间编号 = +d.稳态区间编号;
              if (isNaN(类别) || isNaN(稳态区间编号)) return null;

              // 获取对应的稳态数据
              const steadyState = steadyStateMap.get(稳态区间编号);
              if (!steadyState) return null;

              // 构建特征对象
              const features: { [key: string]: number } = {};
              for (let i = 0; i < 64; i++) {
                features[`feature_${i}`] = +d[`feature_${i}`];
              }

              return {
                稳态区间编号,
                类别,
                时间: steadyState.时间,
                主汽压力: steadyState.主汽压力,
                主汽温度: steadyState.主汽温度,
                再热温度: steadyState.再热温度,
                汽轮机热耗率q: steadyState.汽轮机热耗率q,
                ...features,
              };
            })
            .filter((d: any): d is ClusteringData => d !== null);

          // 合并处理后的数据
          processedData = [...processedData, ...processedChunk];

          // 如果已经有足够的数据，可以开始渲染初步结果
          if (i === 0 || processedData.length >= 100) {
            // 设置初步数据以便用户可以开始交互
            setData([...processedData]);
          }

          // 每加载2个分片后，让出主线程
          if (i % 2 === 1) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // 步骤5: 处理并保存完整数据
        setLoadingProgress(95);

        // 保存到IndexedDB缓存
        await dbCache.set('localViewData', processedData);
        setLoadingProgress(100);

        console.log('数据加载完成，总数:', processedData.length);
        setData(processedData);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 显示加载进度条
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-progress">
          <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
        </div>
        <div className="loading-text">正在加载数据 ({loadingProgress}%)...</div>
      </div>
    );
  }

  // 获取所有可用的参数列表
  const parameters = ['主汽压力', '主汽温度', '再热温度', '汽轮机热耗率q'];

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 2,
      }}
    >
      <Typography variant="h5" gutterBottom>
        工况局部视图
      </Typography>

      <LocalViewToolbar
        selectedParameter={selectedParameter}
        onParameterChange={setSelectedParameter}
        timeGranularity={timeGranularity}
        onTimeGranularityChange={setTimeGranularity}
        parameters={parameters}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 时间分布图 */}
        <Box sx={{ flex: 1 }}>
          <TimeDistribution data={data} timeGranularity={timeGranularity} />
        </Box>

        {/* 参数分布图 */}
        <Box sx={{ flex: 1 }}>
          <ParameterDistribution data={data} parameter={selectedParameter} />
        </Box>
      </Box>
    </Box>
  );
};

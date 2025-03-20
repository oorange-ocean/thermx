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

        // 分开处理聚类数据和稳态数据
        // 对于稳态数据，先检查是否有原始数据缓存
        let steadyStateResponse;
        const cachedRawData = await dbCache.getRawSteadyStateData<string>();

        if (cachedRawData) {
          console.log('使用缓存的原始稳态数据');
          steadyStateResponse = d3.csvParse(
            cachedRawData
          ) as unknown as DSVParsedArray<SteadyStateData>;
          setLoadingProgress(50); // 跳过稳态数据的下载进度
        } else {
          // 没有缓存，需要从服务器加载
          steadyStateResponse = await fetch(`${API_BASE_URL}/steady-state-data`).then(
            async (response) => {
              // 读取总长度
              const contentLength = response.headers.get('Content-Length');
              const total = contentLength ? parseInt(contentLength, 10) : 0;
              let loaded = 0;

              const reader = response.body!.getReader();
              const chunks: Uint8Array[] = [];

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                if (total) {
                  const progress = Math.round((loaded / total) * 40); // 最多占总进度的40%
                  setLoadingProgress(50 + progress);
                }
              }

              const allChunks = new Uint8Array(loaded);
              let position = 0;
              for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
              }

              const text = new TextDecoder().decode(allChunks);
              // 同时缓存原始数据供其他视图使用
              await dbCache.saveRawSteadyStateData(text);
              return d3.csvParse(text) as unknown as DSVParsedArray<SteadyStateData>;
            }
          );
        }

        // 仍然需要加载聚类数据
        const clusteringResponse = await fetch(`${API_BASE_URL}/clustering-data`).then(
          async (response) => {
            // 读取总长度
            const contentLength = response.headers.get('Content-Length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            // 创建响应流读取器
            const reader = response.body!.getReader();
            const chunks: Uint8Array[] = [];

            // 读取数据块
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              chunks.push(value);
              loaded += value.length;

              // 更新加载进度
              if (total) {
                const progress = Math.round((loaded / total) * 40); // 最多占总进度的40%
                setLoadingProgress(90 + progress);
              }
            }

            // 合并所有数据块
            const allChunks = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
              allChunks.set(chunk, position);
              position += chunk.length;
            }

            // 解码为文本并解析CSV
            const text = new TextDecoder().decode(allChunks);
            return d3.csvParse(text) as unknown as DSVParsedArray<ClusteringRawData>;
          }
        );

        // 首先处理稳态数据，创建一个映射表
        const steadyStateMap = new Map(
          steadyStateResponse.map((d) => [
            +d.稳态区间编号,
            {
              时间: new Date(d.时间),
              主汽压力: +d.主汽压力,
              主汽温度: +d.主汽温度,
              再热温度: +d.再热温度,
              汽轮机热耗率q: +d.汽轮机热耗率q,
            },
          ])
        );

        // 处理聚类数据并合并稳态信息
        const processedData = clusteringResponse
          .map((d) => {
            // 确保所有必要字段都是有效的数值
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
          .filter((d): d is ClusteringData => d !== null);

        setLoadingProgress(90);

        // 检查缓存数据是否存在，如果存在则比较哈希
        const existingCachedData = await dbCache.get<ClusteringData[]>('localViewData');
        if (existingCachedData) {
          // 比较新处理的数据与缓存数据的哈希
          const hashMatch = await dbCache.compareHash('localViewData', processedData);
          if (hashMatch) {
            // 哈希匹配，使用缓存数据
            console.log('缓存数据哈希匹配，使用缓存');
            setData(existingCachedData);
            setLoading(false);
            setLoadingProgress(100);
            return;
          } else {
            console.log('缓存数据哈希不匹配，更新缓存');
          }
        } else {
          console.log('未找到缓存数据，创建新缓存');
        }

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

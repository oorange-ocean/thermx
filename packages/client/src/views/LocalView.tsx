import { useEffect, useState } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import * as d3 from 'd3';
import type { DSVParsedArray } from 'd3';
import { TimeDistribution } from '../components/TimeDistribution';
import { ParameterDistribution } from '../components/ParameterDistribution';
import { LocalViewToolbar } from '../components/LocalViewToolbar';

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

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        if (import.meta.env.DEV) {
          // 开发环境：直接从 public 文件夹读取
          const [clusteringResponse, steadyStateResponse] = await Promise.all([
            d3.csv('/clustering_data.csv'),
            d3.csv('/steady_state_data.csv'),
          ]);
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

          console.log('数据加载完成，总数:', processedData.length);
          setData(processedData);
        } else {
          // 生产环境：通过 API 获取
          const [clusteringResponse, steadyStateResponse] = await Promise.all([
            fetch('/api/clustering-data')
              .then((res) => res.text())
              .then((text) => d3.csvParse(text) as unknown as DSVParsedArray<ClusteringRawData>),
            fetch('/api/steady-state-data')
              .then((res) => res.text())
              .then((text) => d3.csvParse(text) as unknown as DSVParsedArray<SteadyStateData>),
          ]);
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

          console.log('数据加载完成，总数:', processedData.length);
          setData(processedData);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };

    loadData();
  }, []);

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

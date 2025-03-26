import { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { GlobalView } from './GlobalView';
import { DetailView } from './DetailView';
import { TimeDistribution } from '../components/TimeDistribution';
import { ParameterDistribution } from '../components/ParameterDistribution';
import { GlobalViewToolbar } from '../components/GlobalViewToolbar';
import { API_BASE_URL } from '../config';
import { dbCache } from '../utils/indexedDBCache';
import * as d3 from 'd3';

interface ProcessedData {
  区间编号: number;
  类别: number;
  时间: Date;
  主汽压力: number;
  主汽温度: number;
  再热温度: number;
  汽轮机热耗率q: number;
  [key: string]: number | Date;
}

export const IntegratedView = () => {
  const [data, setData] = useState<ProcessedData[]>([]);
  const [selectedParameter, setSelectedParameter] = useState('汽轮机热耗率q');
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'day'>('hour');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedSteadyState, setSelectedSteadyState] = useState<number | null>(null);
  const [heatRateRange, setHeatRateRange] = useState<[number, number]>([7000, 10000]);
  const [timeScale, setTimeScale] = useState(12);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress(0);

        // 检查是否有已处理的缓存数据
        const cachedData = await dbCache.get<ProcessedData[]>('integratedViewData');
        if (cachedData) {
          console.log('使用缓存的整合视图数据');
          setData(cachedData);
          setLoading(false);
          setLoadingProgress(100);
          return;
        }

        // 获取稳态数据元数据
        const metadataResponse = await fetch(`${API_BASE_URL}/steady-state-data-metadata`);
        if (!metadataResponse.ok) {
          throw new Error('无法获取数据元数据');
        }

        const metadata = await metadataResponse.json();
        const { totalChunks } = metadata;
        setLoadingProgress(10);

        // 尝试从缓存获取原始数据
        let steadyStateData: any[] = [];
        const cachedRawData = await dbCache.getRawSteadyStateData<string>();

        if (cachedRawData) {
          console.log('使用缓存的原始稳态数据');
          steadyStateData = d3.csvParse(cachedRawData);
          setLoadingProgress(50);
        } else {
          // 分批加载数据
          for (let i = 0; i < totalChunks; i++) {
            const chunkResponse = await fetch(`${API_BASE_URL}/steady-state-data/${i}`);
            if (!chunkResponse.ok) {
              throw new Error(`无法获取数据分片 ${i}`);
            }

            const chunkData = await chunkResponse.json();
            steadyStateData = [...steadyStateData, ...chunkData];

            const progress = Math.round(10 + ((i + 1) / totalChunks) * 40);
            setLoadingProgress(progress);

            if (i % 3 === 2) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }

          // 缓存原始数据
          const rawData = d3.csvFormat(steadyStateData);
          await dbCache.saveRawSteadyStateData(rawData);
        }

        // 获取聚类数据
        const clusteringResponse = await fetch(`${API_BASE_URL}/clustering-data/0`);
        if (!clusteringResponse.ok) {
          throw new Error('无法获取聚类数据');
        }

        const clusteringData = await clusteringResponse.json();
        setLoadingProgress(70);

        // 处理数据
        const processedData = steadyStateData
          .map((d: any) => {
            const clusterInfo = clusteringData.find((c: any) => c.稳态区间编号 === d.稳态区间编号);

            if (!clusterInfo) return null;

            return {
              区间编号: +d.稳态区间编号,
              类别: +clusterInfo.Cluster,
              时间: new Date(d.时间),
              主汽压力: +d.主汽压力,
              主汽温度: +d.主汽温度,
              再热温度: +d.再热温度,
              汽轮机热耗率q: +d.汽轮机热耗率q,
            };
          })
          .filter((d): d is ProcessedData => d !== null);

        // 缓存处理后的数据
        await dbCache.set('integratedViewData', processedData);
        setLoadingProgress(100);
        setData(processedData);
      } catch (error) {
        console.error('数据加载失败:', error);
        setError(error instanceof Error ? error.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 处理稳态区间选择
  const handleSteadyStateSelect = (steadyStateId: number) => {
    setSelectedSteadyState(steadyStateId);
  };

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

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

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
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {/* 左上：甘特图 */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(50vh - 100px)',
            overflow: 'hidden',
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            稳态负荷区间
          </Typography>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <GlobalView
              isEmbedded
              onSteadyStateSelect={handleSteadyStateSelect}
              showToolbar={false}
              showTitle={false}
            />
          </Box>
        </Paper>

        {/* 右上：时间分布 */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(50vh - 100px)',
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            时间分布
          </Typography>
          <Box sx={{ flex: 1 }}>
            <TimeDistribution data={data} timeGranularity={timeGranularity} />
          </Box>
        </Paper>

        {/* 左下：稳态细节 */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(50vh - 100px)',
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            稳态细节 {selectedSteadyState ? `(区间 ${selectedSteadyState})` : ''}
          </Typography>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {selectedSteadyState ? (
              <DetailView
                steadyStateId={String(selectedSteadyState)}
                onClose={() => setSelectedSteadyState(null)}
                isEmbedded
              />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}
              >
                请在上方甘特图中选择一个稳态区间以查看详细信息
              </Typography>
            )}
          </Box>
        </Paper>

        {/* 右下：参数分布 */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(50vh - 100px)',
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            参数分布
          </Typography>
          <Box sx={{ flex: 1 }}>
            <ParameterDistribution data={data} parameter={selectedParameter} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as d3 from 'd3';
import { GlobalViewToolbar } from '../components/GlobalViewToolbar';
import { GanttChart } from '../components/GanttChart';
import { API_BASE_URL } from '../config';
import { dbCache } from '../utils/indexedDBCache';

interface GlobalViewProps {
  width?: number;
  height?: number;
  isEmbedded?: boolean;
  onSteadyStateSelect?: (steadyStateId: number) => void;
  showToolbar?: boolean;
  showTitle?: boolean;
}

// 定义数据类型
interface ProcessedData {
  区间编号: number;
  开始时间: Date;
  结束时间: Date;
  平均负荷: number;
  平均热耗率: number;
  color: string;
}

export const GlobalView: React.FC<GlobalViewProps> = ({
  width,
  height,
  isEmbedded = false,
  onSteadyStateSelect,
  showToolbar = true,
  showTitle = true,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [data, setData] = useState<ProcessedData[]>([]);
  const [heatRateRange, setHeatRateRange] = useState<[number, number]>([7000, 10000]);
  const [timeScale, setTimeScale] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 初始化尺寸
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const rect = entry.contentRect;
      const minWidth = 600;
      const minHeight = 400;
      const newWidth = Math.max(rect.width - 40, minWidth);
      const newHeight = Math.max(rect.height - 150, minHeight);

      setDimensions({
        width: newWidth,
        height: newHeight,
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress(0);

        // 检查是否有已处理的缓存数据
        const cachedData = await dbCache.get<ProcessedData[]>('globalViewData');
        if (cachedData) {
          console.log('使用缓存数据，总数:', cachedData.length);
          setData(cachedData);
          setLoading(false);
          return;
        }

        // 获取稳态数据元数据
        console.log('获取稳态数据元数据');
        const metadataResponse = await fetch(`${API_BASE_URL}/steady-state-data-metadata`);
        if (!metadataResponse.ok) {
          throw new Error('无法获取数据元数据');
        }

        const metadata = await metadataResponse.json();
        const { totalChunks, totalRecords } = metadata;
        setLoadingProgress(10);

        // 尝试从缓存获取数据
        let csvData: any[] = [];
        const cachedRawData = await dbCache.getRawSteadyStateData<string>();

        if (cachedRawData) {
          // 使用缓存
          console.log('使用缓存的原始稳态数据');
          csvData = d3.csvParse(cachedRawData);
          setLoadingProgress(90);
        } else {
          // 分批加载稳态数据
          for (let i = 0; i < totalChunks; i++) {
            console.log(`加载稳态数据分片 ${i + 1}/${totalChunks}`);
            const chunkResponse = await fetch(`${API_BASE_URL}/steady-state-data/${i}`);
            if (!chunkResponse.ok) {
              throw new Error(`无法获取数据分片 ${i}`);
            }

            const chunkData = await chunkResponse.json();
            csvData = [...csvData, ...chunkData];

            // 更新进度
            const progress = Math.round(10 + ((i + 1) / totalChunks) * 80);
            setLoadingProgress(progress);

            // 每加载3个分片后，让出主线程
            if (i % 3 === 2) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }

          // 将完整数据缓存
          const rawData = d3.csvFormat(csvData);
          await dbCache.saveRawSteadyStateData(rawData);
        }

        // 按稳态区间编号分组并处理数据
        const groupedData = d3.group(csvData, (d: any) => d.稳态区间编号);

        // 增量处理分批数据
        const processedData: ProcessedData[] = [];
        let processedCount = 0;
        const groupEntries = Array.from(groupedData.entries());
        const batchSize = 50; // 每批处理50个区间

        for (let i = 0; i < groupEntries.length; i += batchSize) {
          const batch = groupEntries.slice(i, i + batchSize);

          const batchProcessed = batch
            .map(([id, group]) => {
              if (id === 'null' || id === '0') {
                return null;
              }

              const times = group.map((d: any) => new Date(d.时间));
              const loads = group.map((d: any) => +d.机组负荷);
              const heatRates = group.map((d: any) => +d.修正后热耗率q);

              // 验证数据有效性
              if (
                times.some((t) => isNaN(t.getTime())) ||
                loads.some(isNaN) ||
                heatRates.some(isNaN)
              ) {
                console.warn(`区间 ${id} 包含无效数据`);
                return null;
              }

              return {
                区间编号: +id,
                开始时间: d3.min(times)!,
                结束时间: d3.max(times)!,
                平均负荷: d3.mean(loads)!,
                平均热耗率: d3.mean(heatRates)!,
                color: d3.interpolateRdYlGn((10000 - d3.mean(heatRates)!) / 2000),
              };
            })
            .filter((d): d is ProcessedData => d !== null);

          processedData.push(...batchProcessed);
          processedCount += batchSize;

          // 如果已经处理了足够的数据，开始显示初步结果
          if (processedData.length >= 100 || i === 0) {
            setData([...processedData]);
          }

          // 让出主线程，保持UI响应
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // 缓存处理后的数据
        await dbCache.set('globalViewData', processedData);
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

  const handleSteadyStateClick = (steadyStateId: number) => {
    if (isEmbedded && onSteadyStateSelect) {
      onSteadyStateSelect(steadyStateId);
    } else {
      navigate(`/detail/${steadyStateId}`);
    }
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
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flex: 1,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {showTitle && (
        <Typography variant="h5" gutterBottom>
          工况全局视图
        </Typography>
      )}

      {showToolbar && (
        <GlobalViewToolbar
          heatRateRange={heatRateRange}
          onHeatRateRangeChange={setHeatRateRange}
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          filteredCount={
            data.filter((d) => d.平均热耗率 >= heatRateRange[0] && d.平均热耗率 <= heatRateRange[1])
              .length
          }
          totalCount={data.length}
          heatRateExtent={d3.extent(data, (d) => d.平均热耗率) as [number, number]}
        />
      )}

      <Box
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            height: '12px',
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f0f0f0',
            borderRadius: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '6px',
            '&:hover': {
              background: '#666',
            },
          },
          padding: '4px',
          marginBottom: '8px',
        }}
      >
        <GanttChart
          data={data}
          width={dimensions.width}
          height={dimensions.height}
          timeScale={timeScale}
          heatRateRange={heatRateRange}
          onSteadyStateSelect={handleSteadyStateClick}
        />
      </Box>
    </Box>
  );
};

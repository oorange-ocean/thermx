import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as d3 from 'd3';
import { Box, Paper, Typography, Grid, CircularProgress } from '@mui/material';

interface DetailViewProps {
  onClose?: () => void;
}

interface TimeSeriesData {
  时间: Date;
  汽轮机热耗率q: number;
  主汽压力: number;
  主蒸汽母管温度: number;
  再热汽母管温度: number;
  高压缸效率: number;
  中压缸效率: number;
  锅炉效率: number;
  厂用电率: number;
  [key: string]: number | Date;
}

interface StatInfo {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export const DetailView = ({ onClose }: DetailViewProps) => {
  const { steadyStateId } = useParams<{ steadyStateId: string }>();
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [stats, setStats] = useState<{ [key: string]: StatInfo }>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date]>([
    new Date(),
    new Date(),
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeSeriesRef = useRef<SVGSVGElement>(null);

  // 关键参数列表
  const keyParameters = [
    '汽轮机热耗率q',
    '主汽压力',
    '主蒸汽母管温度',
    '再热汽母管温度',
    '高压缸效率',
    '中压缸效率',
    '锅炉效率',
    '厂用电率',
  ];

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      if (!steadyStateId) {
        setError('未找到稳态区间ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('开始加载数据，稳态区间ID:', steadyStateId);

        const response = await d3.csv('/steady_state_data.csv');
        console.log('数据加载完成，开始处理...');

        const filteredData = response
          .filter((d) => d.稳态区间编号 && +d.稳态区间编号 === +steadyStateId)
          .map((d) => {
            const requiredFields = [
              '时间',
              '汽轮机热耗率q',
              '主汽压力',
              '主蒸汽母管温度',
              '再热汽母管温度',
              '高压缸效率',
              '中压缸效率',
              '锅炉效率',
              '厂用电率',
            ];

            const missingFields = requiredFields.filter((field) => !(field in d));
            if (missingFields.length > 0) {
              console.warn('数据中缺少字段:', missingFields);
              return null;
            }

            try {
              return {
                时间: new Date(d.时间),
                汽轮机热耗率q: +d.汽轮机热耗率q,
                主汽压力: +d.主汽压力,
                主蒸汽母管温度: +d.主蒸汽母管温度,
                再热汽母管温度: +d.再热汽母管温度,
                高压缸效率: +d.高压缸效率,
                中压缸效率: +d.中压缸效率,
                锅炉效率: +d.锅炉效率,
                厂用电率: +d.厂用电率,
              };
            } catch (e) {
              console.error('数据转换错误:', e);
              return null;
            }
          })
          .filter((d): d is TimeSeriesData => d !== null);

        if (filteredData.length === 0) {
          setError(`未找到稳态区间 ${steadyStateId} 的数据`);
          setLoading(false);
          return;
        }

        console.log('找到数据点数:', filteredData.length);

        const statsData: { [key: string]: StatInfo } = {};
        keyParameters.forEach((param) => {
          const values = filteredData.map((d) => d[param] as number);
          statsData[param] = {
            mean: d3.mean(values) || 0,
            std: d3.deviation(values) || 0,
            min: d3.min(values) || 0,
            max: d3.max(values) || 0,
          };
        });

        setTimeSeriesData(filteredData);
        setStats(statsData);
        setSelectedTimeRange([
          d3.min(filteredData, (d) => d.时间) as Date,
          d3.max(filteredData, (d) => d.时间) as Date,
        ]);
      } catch (error) {
        console.error('数据加载失败:', error);
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [steadyStateId]);

  // 图表渲染
  useEffect(() => {
    if (!timeSeriesData.length || !timeSeriesRef.current) return;

    const svg = timeSeriesRef.current;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 清除旧内容
    d3.select(svg).selectAll('*').remove();

    // 创建SVG容器
    const svgG = d3
      .select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建比例尺
    const xScale = d3.scaleTime().domain(selectedTimeRange).range([0, innerWidth]);

    // 为每个参数创建一个子图
    const subPlotHeight = innerHeight / keyParameters.length;

    keyParameters.forEach((param, i) => {
      const yScale = d3
        .scaleLinear()
        .domain([
          d3.min(timeSeriesData, (d) => d[param] as number) || 0,
          d3.max(timeSeriesData, (d) => d[param] as number) || 0,
        ])
        .range([subPlotHeight - 5, 5]);

      const line = d3
        .line<TimeSeriesData>()
        .x((d) => xScale(d.时间))
        .y((d) => yScale(d[param] as number));

      // 绘制Y轴
      svgG
        .append('g')
        .attr('transform', `translate(0,${i * subPlotHeight})`)
        .call(d3.axisLeft(yScale).ticks(3));

      // 添加参数标签
      svgG
        .append('text')
        .attr('x', -40)
        .attr('y', i * subPlotHeight + subPlotHeight / 2)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .style('font-size', '12px')
        .text(param);

      // 绘制时间序列线
      svgG
        .append('path')
        .datum(timeSeriesData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr('transform', `translate(0,${i * subPlotHeight})`)
        .attr('d', line);
    });

    // 绘制X轴（底部）
    svgG.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));
  }, [timeSeriesData, selectedTimeRange, keyParameters]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 如果有错误，显示错误信息
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
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'auto',
        // 自定义滚动条样式
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
          '&:hover': {
            background: '#666',
          },
        },
        // Firefox 滚动条样式
        scrollbarWidth: 'thin',
        scrollbarColor: '#888 #f1f1f1',
      }}
    >
      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>
        稳态区间 {steadyStateId} 详细信息
      </Typography>

      {/* 时间序列图 */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mx: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          参数时间序列
        </Typography>
        <Box sx={{ width: '100%', height: '500px', position: 'relative' }}>
          <svg
            ref={timeSeriesRef}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          />
        </Box>
      </Paper>

      {/* 统计信息 */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mx: 2,
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          参数统计信息
        </Typography>
        <Grid container spacing={2}>
          {keyParameters.map((param) => (
            <Grid item xs={12} sm={6} md={4} key={param}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  borderRadius: '6px',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#1976d2' }}>
                  {param}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    均值:{' '}
                    <span style={{ color: '#333', fontWeight: 500 }}>
                      {stats[param]?.mean.toFixed(2)}
                    </span>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    标准差:{' '}
                    <span style={{ color: '#333', fontWeight: 500 }}>
                      {stats[param]?.std.toFixed(2)}
                    </span>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    最小值:{' '}
                    <span style={{ color: '#333', fontWeight: 500 }}>
                      {stats[param]?.min.toFixed(2)}
                    </span>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    最大值:{' '}
                    <span style={{ color: '#333', fontWeight: 500 }}>
                      {stats[param]?.max.toFixed(2)}
                    </span>
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

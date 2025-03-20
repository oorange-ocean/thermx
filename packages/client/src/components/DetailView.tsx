import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as d3 from 'd3';
import { Box, Paper, Typography, Grid, CircularProgress } from '@mui/material';
import React from 'react';

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
  validCount: number;
  totalCount: number;
}

// 添加辅助函数来判断数值是否有效
const isValidNumber = (value: number): boolean => {
  return value !== null && value !== undefined && !isNaN(value) && value !== 0;
};

// 格式化数值显示
const formatValue = (value: number | undefined): string => {
  if (!value || !isValidNumber(value)) {
    return '数据缺失';
  }
  return value.toFixed(2);
};

// 使用 React.memo 包装组件
export const DetailView = React.memo(({ onClose }: DetailViewProps) => {
  const { steadyStateId } = useParams<{ steadyStateId: string }>();
  // 添加一个缓存标志，防止重复加载同一数据
  const dataLoadedRef = useRef<boolean>(false);
  // 添加计数器追踪渲染次数 - 移到组件顶层
  const renderCountRef = useRef(0);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [stats, setStats] = useState<{ [key: string]: StatInfo }>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date]>([
    new Date(),
    new Date(),
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeSeriesRef = useRef<SVGSVGElement>(null);

  // 缓存关键参数数组，防止在每次渲染时重新创建
  const keyParameters = useRef([
    '汽轮机热耗率q',
    '主汽压力',
    '主蒸汽母管温度',
    '再热汽母管温度',
    '高压缸效率',
    '中压缸效率',
    '锅炉效率',
    '厂用电率',
  ]).current;

  // 数据加载
  useEffect(() => {
    // 如果数据已加载过，或没有区间ID，跳过加载
    if (dataLoadedRef.current || !steadyStateId) {
      if (!steadyStateId) {
        setError('未找到稳态区间ID');
        setLoading(false);
      }
      return;
    }

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('开始加载数据，稳态区间ID:', steadyStateId);

        const response = await fetch('/api/steady-state-data', {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`数据加载失败: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        const csvData = d3.csvParse(text);

        const filteredData = csvData
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

            // 检查必需字段是否存在
            const missingFields = requiredFields.filter((field) => !(field in d));
            if (missingFields.length > 0) {
              console.warn('数据中缺少字段:', missingFields);
              return null;
            }

            try {
              const time = new Date(d.时间);
              if (isNaN(time.getTime())) {
                console.warn('无效的时间格式:', d.时间);
                return null;
              }

              const numericData = {
                时间: time,
                汽轮机热耗率q: +d.汽轮机热耗率q,
                主汽压力: +d.主汽压力,
                主蒸汽母管温度: +d.主蒸汽母管温度,
                再热汽母管温度: +d.再热汽母管温度,
                高压缸效率: +d.高压缸效率,
                中压缸效率: +d.中压缸效率,
                锅炉效率: +d.锅炉效率,
                厂用电率: +d.厂用电率,
              };

              // 验证所有数值字段
              const hasInvalidValue = Object.entries(numericData).some(
                ([key, value]) =>
                  key !== '时间' && typeof value === 'number' && (isNaN(value) || !isFinite(value))
              );

              if (hasInvalidValue) {
                console.warn('数据点包含无效值:', d);
                return null;
              }

              return numericData;
            } catch (e) {
              console.error('数据转换错误:', e);
              return null;
            }
          })
          .filter((d): d is TimeSeriesData => d !== null);

        if (filteredData.length === 0) {
          throw new Error(`未找到稳态区间 ${steadyStateId} 的有效数据`);
        }

        console.log('找到数据点数:', filteredData.length);

        // 计算统计信息
        const statsData: { [key: string]: StatInfo } = {};
        keyParameters.forEach((param) => {
          const values = filteredData.map((d) => d[param] as number).filter(isValidNumber);

          if (values.length === 0) {
            statsData[param] = {
              mean: 0,
              std: 0,
              min: 0,
              max: 0,
              validCount: 0,
              totalCount: filteredData.length,
            };
          } else {
            statsData[param] = {
              mean: d3.mean(values) || 0,
              std: d3.deviation(values) || 0,
              min: d3.min(values) || 0,
              max: d3.max(values) || 0,
              validCount: values.length,
              totalCount: filteredData.length,
            };
          }
        });

        setTimeSeriesData(filteredData);
        setStats(statsData);
        setSelectedTimeRange([
          d3.min(filteredData, (d) => d.时间) as Date,
          d3.max(filteredData, (d) => d.时间) as Date,
        ]);

        // 标记数据已加载
        dataLoadedRef.current = true;
      } catch (error) {
        // 判断是否是取消请求导致的错误
        if ((error as any).name === 'AbortError') {
          console.log('请求被取消');
          return;
        }

        console.error('数据加载失败:', error);
        setError(error instanceof Error ? error.message : '数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 清理函数：取消未完成的请求
    return () => {
      abortController.abort();
    };
  }, [steadyStateId, keyParameters]);

  // 绘图函数
  useEffect(() => {
    if (!timeSeriesData.length || !timeSeriesRef.current) return;

    // 增加渲染计数
    renderCountRef.current += 1;
    console.log(`图表渲染第 ${renderCountRef.current} 次`);

    // 如果渲染次数过多，可能有循环问题，跳过渲染
    if (renderCountRef.current > 5) {
      console.warn('检测到过多渲染次数，跳过本次渲染');
      return;
    }

    const svg = timeSeriesRef.current;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // 如果 SVG 尺寸为零，跳过渲染
    if (width === 0 || height === 0) {
      console.log('SVG 尺寸无效，跳过渲染');
      return;
    }

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 清除旧内容
    d3.select(svg).selectAll('*').remove();

    // 创建SVG容器
    const svgG = d3
      .select<SVGSVGElement, unknown>(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建比例尺
    const xScale = d3.scaleTime().domain(selectedTimeRange).range([0, innerWidth]);

    // 为每个参数创建一个子图
    const subPlotHeight = innerHeight / keyParameters.length;

    // 创建一个容器来存储所有的提示框，而不是为每个图表创建新的提示框
    const tooltipId = 'detail-view-tooltip';
    let tooltip = d3.select<HTMLDivElement, unknown>(`#${tooltipId}`);

    // 如果提示框不存在，创建一个新的
    if (tooltip.empty()) {
      tooltip = d3
        .select<HTMLDivElement, unknown>('body')
        .append('div')
        .attr('id', tooltipId)
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '5px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('z-index', '9999');
    }

    keyParameters.forEach((param, i) => {
      // 过滤出有效的数据点
      const validData = timeSeriesData.filter((d) => isValidNumber(d[param] as number));

      if (validData.length === 0) {
        // 如果没有有效数据，显示提示文本
        svgG
          .append('text')
          .attr('x', innerWidth / 2)
          .attr('y', i * subPlotHeight + subPlotHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('alignment-baseline', 'middle')
          .style('font-size', '12px')
          .style('fill', '#666')
          .text(`${param} - 无有效数据`);
        return;
      }

      const yScale = d3
        .scaleLinear()
        .domain([
          d3.min<TimeSeriesData, number>(validData, (d) => {
            const value = d[param];
            // 这里只处理number类型的值，跳过Date类型
            return typeof value === 'number' ? value : 0;
          }) ?? 0,
          d3.max<TimeSeriesData, number>(validData, (d) => {
            const value = d[param];
            // 这里只处理number类型的值，跳过Date类型
            return typeof value === 'number' ? value : 0;
          }) ?? 0,
        ])
        .range([subPlotHeight - 5, 5]);

      // 创建一个分段的线条生成器
      const line = d3
        .line<TimeSeriesData>()
        .x((d) => xScale(d.时间))
        .y((d) => yScale(d[param] as number))
        .defined((d) => isValidNumber(d[param] as number)); // 只在有效数据点之间绘制线条

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

      // 添加背景条纹
      svgG
        .append('rect')
        .attr('x', 0)
        .attr('y', i * subPlotHeight)
        .attr('width', innerWidth)
        .attr('height', subPlotHeight)
        .attr('fill', i % 2 === 0 ? '#f8f9fa' : '#ffffff')
        .attr('opacity', 0.5);

      // 绘制时间序列线
      const path = svgG
        .append('path')
        .datum(timeSeriesData)
        .attr('fill', 'none')
        .attr('stroke', '#1976d2')
        .attr('stroke-width', 1.5)
        .attr('transform', `translate(0,${i * subPlotHeight})`)
        .attr('d', line);

      // 添加数据点
      svgG
        .selectAll(`.dot-${i}`)
        .data(validData)
        .enter()
        .append('circle')
        .attr('class', `dot-${i}`)
        .attr('cx', (d) => xScale(d.时间))
        .attr('cy', (d) => yScale(d[param] as number) + i * subPlotHeight)
        .attr('r', 2)
        .attr('fill', '#1976d2')
        .attr('opacity', 0.6);

      // 修改悬停效果代码，使用单个提示框而不是为每个图表创建新提示框
      svgG
        .selectAll(`.dot-${i}`)
        .on('mouseover', function (event: MouseEvent, d: unknown) {
          tooltip
            .style('visibility', 'visible')
            .html(
              `时间: ${d3.timeFormat('%Y-%m-%d %H:%M:%S')((d as TimeSeriesData).时间)}<br/>${param}: ${(
                (d as TimeSeriesData)[param] as number
              ).toFixed(2)}`
            )
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden');
        });
    });

    // 绘制X轴（底部）
    svgG
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => d3.timeFormat('%m-%d %H:%M')(d as Date))
      );

    // 清理函数
    return () => {
      d3.select(svg).selectAll('*').remove();
      // 重置而不是删除提示框
      d3.select('#detail-view-tooltip').style('visibility', 'hidden');
    };
  }, [timeSeriesData, selectedTimeRange, keyParameters]);

  // 渲染统计信息卡片
  const renderStatCard = (param: string) => {
    const stat = stats[param];
    const hasValidData = stat?.validCount > 0;
    const validityRatio = stat ? (stat.validCount / stat.totalCount) * 100 : 0;

    return (
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
          backgroundColor: hasValidData ? '#ffffff' : '#f5f5f5',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 500,
            color: hasValidData ? '#1976d2' : '#666',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{param}</span>
          {!hasValidData && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.75rem',
                color: '#ff9800',
                backgroundColor: 'rgba(255,152,0,0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              无有效数据
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {hasValidData ? (
            <>
              <Typography variant="body2" sx={{ color: '#666' }}>
                均值:{' '}
                <span style={{ color: '#333', fontWeight: 500 }}>{formatValue(stat?.mean)}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                标准差:{' '}
                <span style={{ color: '#333', fontWeight: 500 }}>{formatValue(stat?.std)}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                最小值:{' '}
                <span style={{ color: '#333', fontWeight: 500 }}>{formatValue(stat?.min)}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                最大值:{' '}
                <span style={{ color: '#333', fontWeight: 500 }}>{formatValue(stat?.max)}</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: validityRatio < 50 ? '#ff9800' : '#4caf50',
                  fontSize: '0.75rem',
                  mt: 1,
                }}
              >
                数据完整度: {validityRatio.toFixed(1)}%
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
              该参数在当前时间段内的数据已被过滤
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

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
              {renderStatCard(param)}
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* 添加固定的提示框元素 */}
      <div
        id="detail-view-tooltip"
        style={{
          position: 'absolute',
          display: 'none',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
});

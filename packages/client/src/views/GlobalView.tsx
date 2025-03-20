import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Slider, Tooltip, CircularProgress, Alert } from '@mui/material';
import * as d3 from 'd3';
import { StaticStateData } from 'shared-types';
import { GlobalViewToolbar } from '../components/GlobalViewToolbar';

interface GlobalViewProps {
  width?: number;
  height?: number;
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

export const GlobalView: React.FC<GlobalViewProps> = () => {
  const navigate = useNavigate();

  // 添加常量定义
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [data, setData] = useState<ProcessedData[]>([]);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [heatRateRange, setHeatRateRange] = useState<[number, number]>([7000, 10000]);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [barHeight, setBarHeight] = useState(10);
  const [yAxisRange, setYAxisRange] = useState<[number, number]>([200, 800]);
  const [timeScale, setTimeScale] = useState(12); // 默认 12px = 1小时
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化尺寸 - 使用固定的默认值
  useEffect(() => {
    // 设置默认固定尺寸，不依赖容器的实际大小
    console.log('设置默认尺寸');
    setDimensions({
      width: 800, // 使用固定的初始宽度
      height: 500, // 使用固定的初始高度
    });

    // 然后再设置 ResizeObserver 来处理后续的调整
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const rect = entry.contentRect;
      console.log('容器尺寸变化:', rect);

      const minWidth = 600;
      const minHeight = 400;
      const newWidth = Math.max(rect.width - 40, minWidth);
      const newHeight = Math.max(rect.height - 150, minHeight);

      console.log('设置新尺寸:', { width: newWidth, height: newHeight });

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
        console.log('开始加载数据...');

        const response = await fetch('/api/steady-state-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log('获取到原始数据，长度:', text.length);
        const csvData = d3.csvParse(text);
        console.log('CSV解析完成，行数:', csvData.length);

        // 按稳态区间编号分组并处理数据
        const groupedData = d3.group(csvData, (d) => d.稳态区间编号);
        console.log('数据分组完成，组数:', groupedData.size);

        const processedData = Array.from(groupedData)
          .map(([id, group]) => {
            if (id === 'null' || id === '0') {
              console.log(`跳过无效区间 ${id}`);
              return null;
            }

            const times = group.map((d) => new Date(d.时间));
            const loads = group.map((d) => +d.机组负荷);
            const heatRates = group.map((d) => +d.修正后热耗率q);

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

        if (processedData.length === 0) {
          throw new Error('没有找到有效的稳态区间数据');
        }

        // 计算热耗率的范围
        const heatRateExtent = d3.extent(processedData, (d) => d.平均热耗率) as [number, number];
        console.log('热耗率范围:', heatRateExtent);

        console.log('数据处理完成，稳态区间数:', processedData.length);
        setData(processedData);
        setHeatRateRange(heatRateExtent);
      } catch (error) {
        console.error('数据加载失败:', error);
        setError(error instanceof Error ? error.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 绘制图表
  useEffect(() => {
    console.log('开始绘制图表...', {
      数据长度: data.length,
      SVG状态: svgRef.current ? '已就绪' : '未就绪',
      容器尺寸: dimensions,
    });

    // 仅检查必要条件
    if (!data.length || !svgRef.current) {
      console.log('跳过绘制：数据为空或SVG未准备好');
      return;
    }

    if (dimensions.width === 0 || dimensions.height === 0) {
      console.log('跳过绘制：容器尺寸未就绪');
      return;
    }

    const innerWidth = dimensions.width * timeScale - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;
    console.log('图表内部尺寸:', { innerWidth, innerHeight });

    if (innerWidth <= 0 || innerHeight <= 0) {
      console.log('跳过绘制：内部尺寸无效');
      return;
    }

    const filteredData = data.filter(
      (d) => d.平均热耗率 >= heatRateRange[0] && d.平均热耗率 <= heatRateRange[1]
    );
    console.log('过滤后的数据点数:', filteredData.length);

    // 清除旧的内容
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建比例尺
    const timeExtent = d3.extent(filteredData.flatMap((d) => [d.开始时间, d.结束时间])) as [
      Date,
      Date,
    ];
    console.log('时间范围:', timeExtent);

    const xScale = d3.scaleTime().domain(timeExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([200, 800]).range([innerHeight, 0]);

    // 添加坐标轴
    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    svg.append('g').attr('class', 'y-axis').call(d3.axisLeft(yScale));

    // 绘制区间
    const rects = svg
      .selectAll('rect')
      .data(filteredData)
      .join('rect')
      .attr('x', (d) => xScale(d.开始时间))
      .attr('y', (d) => yScale(d.平均负荷))
      .attr('width', (d) => Math.max(1, xScale(d.结束时间) - xScale(d.开始时间)))
      .attr('height', 10)
      .attr('fill', (d) => d.color)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const tooltip = document.getElementById('global-view-tooltip');
        if (tooltip) {
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.pageX + 10}px`;
          tooltip.style.top = `${event.pageY - 10}px`;
          tooltip.innerHTML = `
            <div style="padding: 8px;">
              <div>稳态区间: ${d.区间编号}</div>
              <div>开始时间: ${d.开始时间.toLocaleString()}</div>
              <div>结束时间: ${d.结束时间.toLocaleString()}</div>
              <div>平均负荷: ${d.平均负荷.toFixed(2)} MW</div>
              <div>平均热耗率: ${d.平均热耗率.toFixed(2)} kJ/kWh</div>
            </div>
          `;
        }
      })
      .on('mouseout', () => {
        const tooltip = document.getElementById('global-view-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      })
      .on('click', (event, d) => {
        // 使用 event.preventDefault() 防止事件冒泡
        event.preventDefault();
        event.stopPropagation();

        // 添加延时跳转，避免可能的渲染问题
        setTimeout(() => {
          navigate(`/detail/${d.区间编号}`);
        }, 0);
      });

    console.log('绘制完成，矩形数量:', rects.size());
  }, [data, dimensions, heatRateRange, timeScale, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
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
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '600px',
        minHeight: '400px',
        position: 'relative',
        flex: 1,
        boxSizing: 'border-box',
        overflow: 'hidden', // 防止内容溢出
      }}
    >
      <Typography variant="h5" gutterBottom>
        工况全局视图
      </Typography>

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

      <Box
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'auto',
          '& svg': {
            minWidth: '100%',
            minHeight: '300px', // 确保 SVG 有最小高度
          },
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
        <svg
          ref={svgRef}
          height={dimensions.height || 500} // 提供默认高度
          style={{
            border: '1px solid #ccc',
            width: `${dimensions.width * timeScale || 800}px`, // 提供默认宽度
          }}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>{/* 图表内容 */}</g>
        </svg>
      </Box>

      <div
        id="global-view-tooltip"
        style={{
          position: 'fixed',
          display: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '14px',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

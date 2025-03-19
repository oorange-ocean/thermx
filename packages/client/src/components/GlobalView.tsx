import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Slider, Tooltip } from '@mui/material';
import * as d3 from 'd3';
import { StaticStateData } from 'shared-types';
import { GlobalViewToolbar } from './GlobalViewToolbar';

interface GlobalViewProps {
  width?: number;
  height?: number;
}

// 定义数据类型
interface ProcessedData extends StaticStateData {
  x: number; // 时间转换后的 x 坐标
  y: number; // 负荷作为 y 坐标
  color: string; // 基于热耗的颜色
}

export const GlobalView: React.FC<GlobalViewProps> = () => {
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

  // 添加 ResizeObserver 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width - 40, 0), // 减去内边距
        height: Math.max(height - 150, 0), // 减去标题和滑块的高度
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('开始加载数据...');
        const response = await d3.csv('/steady_state_data.csv');

        // 按稳态区间编号分组并处理数据
        const groupedData = d3.group(response, (d) => d.稳态区间编号);
        const processedData = Array.from(groupedData)
          .map(([id, group]) => {
            if (id === 'null' || id === '0') return null;

            const times = group.map((d) => new Date(d.时间));
            const loads = group.map((d) => +d.机组负荷);
            const heatRates = group.map((d) => +d.修正后热耗率q);

            return {
              区间编号: +id,
              开始时间: d3.min(times)!,
              结束时间: d3.max(times)!,
              平均负荷: d3.mean(loads)!,
              平均热耗率: d3.mean(heatRates)!,
              color: d3.interpolateRdYlGn((10000 - d3.mean(heatRates)!) / 2000),
            };
          })
          .filter((d) => d !== null);

        // 计算热耗率的范围
        const heatRateExtent = d3.extent(processedData, (d) => d.平均热耗率) as [number, number];

        console.log('数据处理完成，稳态区间数:', processedData.length);
        setData(processedData as any);
        // 设置初始热耗率范围
        setHeatRateRange(heatRateExtent);
      } catch (error) {
        console.error('数据加载失败:', error);
      }
    };

    loadData();
  }, []);

  // 绘制图表
  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const innerWidth = dimensions.width * timeScale - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const filteredData = data.filter(
      (d) => d.平均热耗率 >= heatRateRange[0] && d.平均热耗率 <= heatRateRange[1]
    );

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
    svg
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
      });
  }, [data, dimensions, heatRateRange, timeScale]);

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
          height={dimensions.height}
          style={{
            border: '1px solid #ccc',
            width: `${dimensions.width * timeScale}px`,
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

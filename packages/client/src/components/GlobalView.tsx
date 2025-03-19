import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Slider } from '@mui/material';
import * as d3 from 'd3';
import { StaticStateData } from 'shared-types';

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

export const GlobalView: React.FC<GlobalViewProps> = ({ width = 1200, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ProcessedData[]>([]);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [heatRateRange, setHeatRateRange] = useState<[number, number]>([8000, 10000]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('开始加载数据...');
        const response = await d3.csv('/steady_state_data.csv');
        console.log('数据加载完成，行数:', response.length);
        console.log('第一行数据:', response[0]);

        const processedData = response.map((d) => {
          const processed = {
            ...d,
            时间: new Date(d.时间),
            修正后热耗率q: +d.修正后热耗率q,
            机组负荷: +d.机组负荷,
            稳态区间编号: +d.稳态区间编号,
            x: new Date(d.时间).getTime(),
            y: +d.机组负荷,
            color: d3.interpolateRdYlGn((10000 - +d.修正后热耗率q) / 2000),
          };
          return processed;
        }) as unknown as ProcessedData[];

        console.log('数据处理完成，处理后第一行:', processedData[0]);
        setData(processedData);
      } catch (error) {
        console.error('数据加载失败:', error);
      }
    };

    loadData();
  }, []);

  // 绘制图表
  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 清除旧的内容
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建比例尺
    const timeExtent = d3.extent(data.map((d) => new Date(d.x))) as [Date, Date];

    const xScale = d3.scaleTime().domain(timeExtent).range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.y) || 0])
      .range([innerHeight, 0]);

    const colorScale = d3
      .scaleSequential()
      .domain([8000, 10000])
      .interpolator(d3.interpolateRdYlGn);

    // 添加坐标轴
    svg.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));

    svg.append('g').call(d3.axisLeft(yScale));

    // 添加标题
    svg
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .text('工况全局视图');

    // 绘制散点
    svg
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => xScale(new Date(d.x)))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 5)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.7)
      .on('mouseover', (event, d) => {
        const tooltip = d3.select('#tooltip');
        tooltip
          .style('visibility', 'visible')
          .html(
            `
            稳态区间编号: ${d.稳态区间编号}<br/>
            时间: ${d.时间.toLocaleString()}<br/>
            修正后热耗率: ${d.修正后热耗率q.toFixed(2)}<br/>
            机组负荷: ${d.机组负荷.toFixed(2)}
          `
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', () => {
        d3.select('#tooltip').style('visibility', 'hidden');
      });
  }, [data, width, height]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        工况全局视图
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>热耗率范围 (kJ/kWh)</Typography>
        <Slider
          value={heatRateRange}
          onChange={(_, newValue) => setHeatRateRange(newValue as [number, number])}
          min={8000}
          max={10000}
          step={100}
          valueLabelDisplay="auto"
        />
      </Box>

      <svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ccc' }} />

      <div
        id="tooltip"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          padding: '5px',
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

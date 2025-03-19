import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TimeDistributionProps {
  data: any[];
  timeGranularity: 'hour' | 'day';
}

export const TimeDistribution = ({ data, timeGranularity }: TimeDistributionProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // 清除旧内容
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置尺寸和边距
    const margin = { top: 20, right: 120, bottom: 40, left: 50 };
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG容器
    const svg = d3
      .select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 处理数据
    const timeGroups = d3.group(data, (d) => {
      const date = new Date(d.时间);
      return timeGranularity === 'hour' ? date.getHours() : date.getDay();
    });

    const categoryGroups = d3.group(data, (d) => d.类别);
    const categories = Array.from(categoryGroups.keys()).sort();

    // 准备堆叠数据
    const timePoints = timeGranularity === 'hour' ? d3.range(24) : d3.range(7);
    interface TimeData {
      time: number;
      [key: string]: number; // 允许动态类别键
    }
    const stackData: TimeData[] = timePoints.map((time) => {
      const timeData: TimeData = { time };
      categories.forEach((category) => {
        const count = data.filter((d) => {
          const date = new Date(d.时间);
          const timeValue = timeGranularity === 'hour' ? date.getHours() : date.getDay();
          return timeValue === time && d.类别 === category;
        }).length;
        timeData[`类别${category}`] = count;
      });
      return timeData;
    });

    // 创建堆叠生成器
    const stack = d3
      .stack()
      .keys(categories.map((c) => `类别${c}`))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(stackData);

    // 创建比例尺
    const xScale = d3
      .scaleLinear()
      .domain([0, timeGranularity === 'hour' ? 24 : 7])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(stackedData, (d) => d3.max(d, (d) => d[1])) || 0])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(categories.map(String));

    // 绘制坐标轴
    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(timeGranularity === 'hour' ? 24 : 7)
          .tickFormat((d) =>
            timeGranularity === 'hour' ? `${d}:00` : ['日', '一', '二', '三', '四', '五', '六'][+d]
          )
      );

    svg.append('g').call(d3.axisLeft(yScale));

    // 绘制堆叠柱状图
    const barGroups = svg
      .selectAll('.category')
      .data(stackedData)
      .join('g')
      .attr('class', 'category')
      .attr('fill', (d, i) => colorScale(String(categories[i])));

    barGroups
      .selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('x', (d) => xScale(d.data.time))
      .attr('y', (d) => yScale(d[1]))
      .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
      .attr('width', innerWidth / (timeGranularity === 'hour' ? 24 : 7) - 1)
      .attr('opacity', 0.7)
      .on('mouseover', (event, d) => {
        // 显示tooltip
        const category = categories[stackedData.findIndex((layer) => layer.includes(d))];
        const tooltip = d3.select('#time-distribution-tooltip');
        tooltip
          .style('display', 'block')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`).html(`
            <div>类别: ${category}</div>
            <div>时间: ${
              timeGranularity === 'hour'
                ? `${d.data.time}:00-${d.data.time + 1}:00`
                : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.data.time]
            }</div>
            <div>数量: ${d[1] - d[0]}</div>
          `);
      })
      .on('mouseout', () => {
        d3.select('#time-distribution-tooltip').style('display', 'none');
      });

    // 添加图例
    const legend = svg.append('g').attr('transform', `translate(${innerWidth + 20}, 10)`);

    categories.forEach((category, i) => {
      const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 25})`);

      legendRow
        .append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colorScale(String(category)));

      legendRow
        .append('text')
        .attr('x', 25)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(`类别 ${category}`);
    });
  }, [data, timeGranularity]);

  return (
    <>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      <div
        id="time-distribution-tooltip"
        style={{
          position: 'fixed',
          display: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

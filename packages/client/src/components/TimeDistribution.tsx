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
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const size = Math.min(width, height) - margin.left - margin.right;
    const centerX = width / 2;
    const centerY = height / 2;
    const innerRadius = size * 0.2; // 内圆半径
    const outerRadius = size * 0.4; // 基础外圆半径

    // 创建SVG容器
    const svg = d3
      .select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

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
    const maxValue = d3.max(stackedData, (d) => d3.max(d, (d) => d[1])) || 0;

    // 径向比例尺
    const radiusScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([0, size * 0.3]); // 最大从外圆再延伸30%的半径

    // 创建颜色比例尺
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(categories.map(String));

    // 计算角度
    const segmentPadding = 0.05; // 扇区之间的间隔（弧度）
    const totalSegments = timeGranularity === 'hour' ? 24 : 7;
    const segmentAngle = (Math.PI * 2 - segmentPadding * totalSegments) / totalSegments;

    // 绘制圆形时间刻度
    svg.append('circle').attr('r', innerRadius).attr('fill', '#f0f0f0').attr('stroke', '#ccc');

    // 绘制时间刻度标签
    timePoints.forEach((time) => {
      const angle = time * (segmentAngle + segmentPadding) - Math.PI / 2;
      const labelRadius = innerRadius - 10;

      svg
        .append('text')
        .attr('x', labelRadius * Math.cos(angle + segmentAngle / 2))
        .attr('y', labelRadius * Math.sin(angle + segmentAngle / 2))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .text(
          timeGranularity === 'hour' ? `${time}` : ['日', '一', '二', '三', '四', '五', '六'][time]
        );
    });

    // 绘制堆叠柱状图（现在是径向的）
    stackedData.forEach((layer, layerIndex) => {
      layer.forEach((d, i) => {
        const value = d[1] - d[0];
        if (value === 0) return;

        const time = d.data.time;
        const startAngle = time * (segmentAngle + segmentPadding) - Math.PI / 2;
        const endAngle = startAngle + segmentAngle;

        const innerR = outerRadius + d[0] === 0 ? 0 : radiusScale(d[0]);
        const outerR = outerRadius + radiusScale(d[1]);

        // 创建弧生成器
        const arc = d3
          .arc()
          .innerRadius(innerR)
          .outerRadius(outerR)
          .startAngle(startAngle)
          .endAngle(endAngle)
          .padAngle(0.01);

        svg
          .append('path')
          .attr('d', arc as any)
          .attr('fill', colorScale(String(categories[layerIndex])))
          .attr('opacity', 0.7)
          .on('mouseover', (event) => {
            // 显示tooltip
            const category = categories[layerIndex];
            const tooltip = d3.select('#time-distribution-tooltip');
            tooltip
              .style('display', 'block')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`).html(`
                <div>类别: ${category}</div>
                <div>时间: ${
                  timeGranularity === 'hour'
                    ? `${time}:00-${time + 1}:00`
                    : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][time]
                }</div>
                <div>数量: ${value}</div>
              `);
          })
          .on('mouseout', () => {
            d3.select('#time-distribution-tooltip').style('display', 'none');
          });
      });
    });

    // 添加图例
    const legend = svg
      .append('g')
      .attr('transform', `translate(${size / 2 + 20}, ${-size / 2 + 10})`);

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

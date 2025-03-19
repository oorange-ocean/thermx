import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ParameterDistributionProps {
  data: any[];
  parameter: string;
}

type DensityPoint = [number, number];

export const ParameterDistribution = ({ data, parameter }: ParameterDistributionProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // 首先过滤掉无效数据
    const validData = data.filter((d) => {
      const value = d[parameter];
      return !isNaN(value) && value !== null && value > 0;
    });

    if (validData.length === 0) {
      console.warn('No valid data after filtering');
      return;
    }

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

    // 获取所有类别（使用过滤后的数据）
    const categories = Array.from(new Set(validData.map((d) => d.类别))).sort();

    // 使用过滤后的数据创建比例尺
    const xScale = d3
      .scaleBand()
      .domain(categories.map(String))
      .range([0, innerWidth])
      .padding(0.1);

    // 计算参数的实际范围
    const parameterExtent = d3.extent(validData, (d) => d[parameter]) as [number, number];
    const padding = (parameterExtent[1] - parameterExtent[0]) * 0.05;
    const yMin = Math.floor((parameterExtent[0] - padding) / 100) * 100;
    const yMax = Math.ceil((parameterExtent[1] + padding) / 100) * 100;

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // 添加颜色比例尺
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(categories.map(String));

    // 为每个类别绘制小提琴图
    categories.forEach((category) => {
      const categoryData = validData.filter((d) => d.类别 === category).map((d) => d[parameter]);
      console.log(`Category ${category} data:`, categoryData); // 检查原始数据

      const bandwidth = Math.max(0.2, (d3.deviation(categoryData) ?? 0) / 4 || 0.2);
      const thresholds = d3.range(yMin, yMax, bandwidth);

      const kde = (kernel: any, thresholds: number[], data: number[]): DensityPoint[] => {
        return thresholds.map((x) => [x, d3.mean(data, (d) => kernel(x - d)) || 0]);
      };

      const epanechnikov = (bandwidth: number) => {
        return (x: number) =>
          Math.abs((x /= bandwidth)) <= 1 ? (0.75 * (1 - x * x)) / bandwidth : 0;
      };

      const density = kde(epanechnikov(bandwidth), thresholds, categoryData);
      const maxDensity = d3.max(density, (d) => d[1]) || 0;
      console.log(`Category ${category} density:`, density); // 检查密度估计结果

      if (maxDensity === 0) {
        console.warn(`Zero density for category ${category}`);
        return;
      }

      const xBand = xScale.bandwidth();
      const area = d3
        .area<DensityPoint>()
        .x0((d) => {
          const x = xScale(String(category))! + xBand / 2 - (d[1] * xBand) / 2 / maxDensity;
          if (isNaN(x)) console.warn('NaN in x0:', { d, xBand, maxDensity });
          return x;
        })
        .x1((d) => {
          const x = xScale(String(category))! + xBand / 2 + (d[1] * xBand) / 2 / maxDensity;
          if (isNaN(x)) console.warn('NaN in x1:', { d, xBand, maxDensity });
          return x;
        })
        .y((d) => {
          const y = yScale(d[0]);
          if (isNaN(y)) console.warn('NaN in y:', { d, yScale: yScale.domain() });
          return y;
        });

      // 绘制小提琴形状
      svg
        .append('path')
        .datum(density)
        .attr('fill', colorScale(String(category)))
        .attr('opacity', 0.7)
        .attr('d', area as any)
        .on('mouseover', (event, d) => {
          // 显示统计信息
          const stats = {
            均值: d3.mean(categoryData),
            中位数: d3.median(categoryData),
            标准差: d3.deviation(categoryData),
          };

          const tooltip = d3.select('#parameter-distribution-tooltip');
          tooltip
            .style('display', 'block')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`).html(`
              <div>类别: ${category}</div>
              <div>均值: ${stats.均值?.toFixed(2)}</div>
              <div>中位数: ${stats.中位数?.toFixed(2)}</div>
              <div>标准差: ${stats.标准差?.toFixed(2)}</div>
            `);
        })
        .on('mouseout', () => {
          d3.select('#parameter-distribution-tooltip').style('display', 'none');
        });

      // 添加中位数线
      const median = d3.median(categoryData) || 0;
      svg
        .append('line')
        .attr('x1', xScale(String(category))!)
        .attr('x2', xScale(String(category))! + xScale.bandwidth())
        .attr('y1', yScale(median))
        .attr('y2', yScale(median))
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    });

    // 添加坐标轴
    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => `类别 ${d}`));

    svg.append('g').call(d3.axisLeft(yScale));
  }, [data, parameter]);

  return (
    <>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      <div
        id="parameter-distribution-tooltip"
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

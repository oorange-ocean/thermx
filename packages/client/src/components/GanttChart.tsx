import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GanttChartProps {
  data: Array<{
    区间编号: number;
    开始时间: Date;
    结束时间: Date;
    平均负荷: number;
    平均热耗率: number;
    color: string;
  }>;
  width: number;
  height: number;
  timeScale?: number;
  heatRateRange?: [number, number];
  onSteadyStateSelect?: (steadyStateId: number) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  data,
  width,
  height,
  timeScale = 12,
  heatRateRange = [7000, 10000],
  onSteadyStateSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const innerWidth = width * timeScale - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

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

    // 绘制矩形
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
        const tooltip = document.getElementById('gantt-chart-tooltip');
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
        const tooltip = document.getElementById('gantt-chart-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      })
      .on('click', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        onSteadyStateSelect?.(d.区间编号);
      });
  }, [data, width, height, timeScale, heatRateRange, onSteadyStateSelect]);

  return (
    <>
      <svg
        ref={svgRef}
        height={height}
        style={{
          width: `${width * timeScale}px`,
          minWidth: '100%',
          minHeight: '300px',
        }}
      />
      <div
        id="gantt-chart-tooltip"
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
    </>
  );
};

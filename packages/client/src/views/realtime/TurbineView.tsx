import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { RealTimeData } from '../../types/realTimeData';
import { DataCard } from '../../components/DataCard';
import TurbineIcon from '../../assets/icons/turbine.svg';

interface TurbineViewProps {
  data: RealTimeData;
}

export const TurbineView: React.FC<TurbineViewProps> = ({ data }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              汽轮机系统示意图
            </Typography>
            <Box
              sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <img src={TurbineIcon} alt="汽轮机示意图" style={{ height: '100%', width: 'auto' }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              关键参数
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <DataCard
                  title="汽轮机热耗率"
                  value={data.汽轮机热耗率q}
                  unit="kJ/kWh"
                  color="#2e7d32"
                />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="高压缸效率" value={data.高压缸效率} unit="%" />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="中压缸效率" value={data.中压缸效率} unit="%" />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="机组负荷" value={data.机组负荷} unit="MW" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              详细参数
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="高压缸排汽压力" value={data.高压缸排汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="高压缸排汽温度" value={data.高压缸排汽温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="中压缸排汽压力" value={data.中压缸排汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="低压缸排汽压力" value={data.低压缸排汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="一段抽汽压力" value={data.一段抽汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="一段抽汽温度" value={data.一段抽汽温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="二段抽汽压力" value={data.二段抽汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="二段抽汽温度" value={data.二段抽汽温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="三段抽汽压力" value={data.三段抽汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="三段抽汽温度" value={data.三段抽汽温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="四段抽汽压力" value={data.四段抽汽压力} unit="MPa" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

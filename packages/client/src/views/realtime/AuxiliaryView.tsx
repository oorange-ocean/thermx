import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { RealTimeData } from '../../types/realTimeData';
import { DataCard } from '../../components/DataCard';
import AuxiliaryIcon from '../../assets/icons/auxiliary.svg';

interface AuxiliaryViewProps {
  data: RealTimeData;
}

export const AuxiliaryView: React.FC<AuxiliaryViewProps> = ({ data }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              辅助系统示意图
            </Typography>
            <Box
              sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <img
                src={AuxiliaryIcon}
                alt="辅助系统示意图"
                style={{ height: '100%', width: 'auto' }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              给水系统
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DataCard title="主给水流量" value={data.主给水流量} unit="t/h" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="凝结水流量" value={data.凝结水流量} unit="t/h" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="凝结水补水流量" value={data.凝结水补水流量} unit="t/h" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="给泵出口母管压力" value={data.给泵出口母管压力} unit="MPa" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              高加系统
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DataCard title="1号高加出水温度" value={data['1号高加出水温度']} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="1号高加疏水温度" value={data['1号高加疏水温度']} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="2号高加出水温度" value={data['2号高加出水温度']} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="2号高加疏水温度" value={data['2号高加疏水温度']} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="3号高加出水温度" value={data['3号高加出水温度']} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="3号高加疏水温度" value={data['3号高加疏水温度']} unit="°C" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              除氧器系统
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DataCard title="除氧器进水温度" value={data.除氧器进水温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="除氧器进汽温度" value={data.除氧器进汽温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="除氧器下水温度1" value={data.除氧器下水温度1} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="除氧器下水温度2" value={data.除氧器下水温度2} unit="°C" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              阀门状态
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DataCard title="A汽泵密封水阀位" value={data.A汽泵密封水阀位} unit="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="B汽泵密封水阀位" value={data.B汽泵密封水阀位} unit="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="GV1阀位" value={data.GV1阀位} unit="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="GV2阀位" value={data.GV2阀位} unit="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="GV3阀位" value={data.GV3阀位} unit="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DataCard title="GV4阀位" value={data.GV4阀位} unit="%" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

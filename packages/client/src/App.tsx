import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalView } from './views/GlobalView';
import { LocalView } from './views/LocalView';
import { DetailView } from './views/DetailView';
import { IntegratedView } from './views/IntegratedView';
import { SteadyStatePeriodsView } from './views/SteadyStatePeriodsView';
import { RealTimeView } from './views/RealTimeView';
import { OptimizationView } from './views/OptimizationView';
import { MainLayout } from './components/MainLayout';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            position: 'fixed', // 固定位置
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <MainLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/integrated" replace />} />
              <Route path="/integrated" element={<IntegratedView />} />
              <Route path="/global" element={<GlobalView />} />
              <Route path="/local" element={<LocalView />} />
              <Route path="/steady-state-periods" element={<SteadyStatePeriodsView />} />
              <Route path="/real-time" element={<RealTimeView />} />
              <Route path="/optimization" element={<OptimizationView />} />
              <Route
                path="/detail/:steadyStateId"
                element={<DetailView key={window.location.pathname} />}
              />
              <Route path="*" element={<Navigate to="/integrated" replace />} />
            </Routes>
          </MainLayout>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

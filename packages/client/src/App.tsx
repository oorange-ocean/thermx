import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalView } from './views/GlobalView';
import { LocalView } from './views/LocalView';
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
            overflow: 'hidden', // 防止出现滚动条
          }}
        >
          <MainLayout>
            <Routes>
              <Route path="/" element={<GlobalView />} />
              <Route path="/local" element={<LocalView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import { GlobalView } from './components/GlobalView';
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
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden', // 防止出现滚动条
        }}
      >
        <MainLayout>
          <GlobalView />
        </MainLayout>
      </Box>
    </ThemeProvider>
  );
}

export default App;

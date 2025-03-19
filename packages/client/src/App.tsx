import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
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
      <MainLayout>
        <GlobalView />
      </MainLayout>
    </ThemeProvider>
  );
}

export default App;

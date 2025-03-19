import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { GlobalView } from './components/GlobalView';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalView />
    </ThemeProvider>
  );
}

export default App;

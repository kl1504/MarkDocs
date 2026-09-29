'use client';
import { useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: { primary: { main: '#3949ab' }, secondary: { main: '#ffb300' } },
  shape: { borderRadius: 12 },
  typography: { fontFamily: 'Inter, system-ui, sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
});

export default function Providers({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

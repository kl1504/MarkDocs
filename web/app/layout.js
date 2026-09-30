import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import Providers from './providers';

export const metadata = {
  title: 'MarkDocs',
  description: 'Write docs and sell books from one Markdown workspace.',
  manifest: '/manifest.json',
};
export const viewport = { themeColor: '#3949ab' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

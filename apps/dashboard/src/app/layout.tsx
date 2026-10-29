import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'TraceGuard — Web Privacy & Security Intelligence',
  description:
    'See what a website does behind the page. TraceGuard turns browser privacy and security signals into clear, transparent website intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1 flex flex-col">{children}</main>
              <Footer />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

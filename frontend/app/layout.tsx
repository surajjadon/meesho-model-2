import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GlobalProvider } from '../providers/GlobalProvider';
import QueryProvider from "@/providers/QueryProvider";
import { Toaster } from "@/app/components/ui/sonner"
import ErrorBoundary from "@/app/components/ErrorBoundary";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inventory Manager',
  description: 'Manage your inventory with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
      {/* ======================================================= */}
      <QueryProvider>
        <GlobalProvider>
     <ErrorBoundary>
            {children}
          </ErrorBoundary>

          <Toaster/>
        </GlobalProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
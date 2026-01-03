import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GlobalProvider } from '../providers/GlobalProvider';

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
      {/* =================== THE FIX IS HERE =================== */}
      {/* Also add the prop to the body tag for extra safety */}
      <body className={inter.className} suppressHydrationWarning>
      {/* ======================================================= */}
        <GlobalProvider>
          {children}
        </GlobalProvider>
      </body>
    </html>
  );
}
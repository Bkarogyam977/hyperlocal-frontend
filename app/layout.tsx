import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'BK Arogyam – Wellness Near You',
  description: '👉 Connecting you with trusted local vendors for everyday wellness.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning> 
      <body suppressHydrationWarning={true}> {/* 👈 Ye line sabse important hai */}
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-64px)]">{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

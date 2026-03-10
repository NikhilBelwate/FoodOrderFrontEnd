import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Navbar  from '@/components/Navbar';
import Footer  from '@/components/Footer';

export const metadata = {
  title:       'FoodOrder – Fresh Delivered Fast',
  description: 'Order sandwiches, pizza and cake delivered to your door.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

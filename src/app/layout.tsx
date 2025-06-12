// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Your global CSS for Tailwind directives and any base styles

const inter = Inter({ subsets: ['latin'] });

// Metadata for your entire application
export const metadata: Metadata = {
  title: 'Car Washing and Detailing', // Custom app title
  description: 'Car Washing and Detailing Services', // Custom description
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The <html> tag is essential for the root layout.
    // Added h-full to the body to ensure it takes the full height of the HTML element,
    // which in turn helps min-h-screen work on child elements like the login page.
    <html lang="en">
      <body className={`${inter.className} h-full`}> {/* Added h-full here */}
        {children} {/* This prop will render all your pages and nested layouts */}
      </body>
    </html>
  );
}

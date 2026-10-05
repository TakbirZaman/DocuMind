import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuMind — Chat with your PDFs',
  description: 'Upload a PDF and ask questions. Powered by RAG + GPT-4o-mini.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

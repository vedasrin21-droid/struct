import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TALVYN — Premium AI Resume Score Checker & ATS Optimization',
  description:
    'Understand your resume strengths, uncover job-specific skill gaps, and get practical suggestions to improve your next application.',
  keywords: [
    'resume score checker',
    'ATS resume scan',
    'AI resume analysis',
    'job description keyword matcher',
    'resume bullet improver',
    'Talvyn',
  ],
  authors: [{ name: 'TALVYN' }],
  openGraph: {
    title: 'TALVYN — AI Resume Score Checker',
    description: 'Land more opportunities with an ATS-tested, higher-scoring resume.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#12336B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

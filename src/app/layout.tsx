import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LaunchGate } from '@/components/LaunchGate';

export const metadata: Metadata = {
  title: 'STRUCT — Premium Resume Score Checker, ATS Optimization & Assessments',
  description:
    'Understand your resume strengths, uncover job-specific skill gaps, build ATS-optimized resumes, and conduct anti-cheat technical assessments.',
  keywords: [
    'resume score checker',
    'ATS resume scan',
    'AI resume analysis',
    'job description keyword matcher',
    'resume bullet improver',
    'Struct',
    'Assessments',
    'Exam Portal',
  ],
  authors: [{ name: 'STRUCT' }],
  openGraph: {
    title: 'STRUCT — Production Ready ATS Platform & Assessments',
    description: 'Land more opportunities with an ATS-tested, higher-scoring resume and verified technical assessments.',
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
      <body>
        <LaunchGate>{children}</LaunchGate>
      </body>
    </html>
  );
}

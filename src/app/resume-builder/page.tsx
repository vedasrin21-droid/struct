import type { Metadata } from 'next';
import ResumeBuilderPageClient from './ResumeBuilderPageClient';

export const metadata: Metadata = {
  title: 'Resume Builder | STRUCT — Career Development & ATS Platform',
  description:
    'Build a clean, high-scoring ATS resume with real-time feedback, professional templates, and instant PDF download.',
};

export default function ResumeBuilderPage() {
  return <ResumeBuilderPageClient />;
}

import type { Metadata } from 'next';
import CareerToolsClient from './CareerToolsClient';

export const metadata: Metadata = {
  title: 'Career Tools Suite | STRUCT — ATS Score Checker & Resume Builder',
  description:
    'Accelerate your job search with STRUCT Career Tools. Check ATS compatibility via document upload or text paste, and craft recruiter-ready resumes.',
};

export default function CareerToolsPage() {
  return <CareerToolsClient />;
}


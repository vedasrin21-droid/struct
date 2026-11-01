import type { Metadata } from 'next';
import SignUpClient from './SignUpClient';

export const metadata: Metadata = {
  title: 'Sign Up | STRUCT — Career & ATS Platform',
  description: 'Create your STRUCT account to optimize your resume, analyze skill gaps, and access technical assessments.',
};

export default function SignUpPage() {
  return <SignUpClient />;
}

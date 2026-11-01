import type { Metadata } from 'next';
import SignInClient from './SignInClient';

export const metadata: Metadata = {
  title: 'Sign In | STRUCT — Career & ATS Platform',
  description: 'Sign in to your STRUCT account to optimize your resume, analyze skill gaps, and access technical assessments.',
};

export default function SignInPage() {
  return <SignInClient />;
}

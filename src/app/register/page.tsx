import { Metadata } from 'next';
import SignUpClient from '../sign-up/[[...sign-up]]/SignUpClient';

export const metadata: Metadata = {
  title: 'Register Candidate Account | STRUCT Assessment Platform',
  description: 'Create a free student candidate account to practice mock assessments, track performance, and prepare for campus drives.',
};

export default function RegisterPage() {
  return <SignUpClient />;
}

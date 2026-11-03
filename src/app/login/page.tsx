import { Metadata } from 'next';
import SignInClient from '../sign-in/[[...sign-in]]/SignInClient';

export const metadata: Metadata = {
  title: 'Candidate Login | STRUCT Assessment Platform',
  description: 'Log in to your STRUCT candidate account to access mock assessments, category practice, and past results.',
};

export default function LoginPage() {
  return <SignInClient />;
}

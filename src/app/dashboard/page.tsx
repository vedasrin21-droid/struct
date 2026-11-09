import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Candidate Dashboard | STRUCT Assessment Platform',
  description: 'Practice mock technical assessments, browse skill tracks, and view evaluation history.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}


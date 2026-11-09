import type { Metadata } from 'next';
import { Suspense } from 'react';
import AtsCheckerClient from './AtsCheckerClient';

export const metadata: Metadata = {
  title: 'ATS Resume Score Checker | STRUCT — Direct Upload & Text Analysis',
  description:
    'Test your resume against modern ATS scanning algorithms. Support for direct PDF/Word document upload and plain text words analysis.',
};

export default function AtsCheckerPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>Loading ATS Score Checker...</div>}>
      <AtsCheckerClient />
    </Suspense>
  );
}


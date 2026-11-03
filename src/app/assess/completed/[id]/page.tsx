'use client';

import React from 'react';
import ExamResultPage from '../../exam/[id]/result/page';

export default function ExamCompletedPage({ params }: { params: Promise<{ id: string }> }) {
  return <ExamResultPage params={params} />;
}

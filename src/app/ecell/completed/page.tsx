'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

export default function ExamCompletedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/ecell/me');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/ecell/login');
            return;
          }
          throw new Error('Failed to load profile');
        }

        const data = await res.json();
        setStudent(data.student);
        setAttempt(data.attempt);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  return (
    <div className="ecell-page-wrapper">
      {/* Top Header */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <StructLogo size={36} subtitle="Assessment Suite" />
          </Link>

          <span
            className="ecell-tag-pill"
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              borderColor: '#BBF7D0',
            }}
          >
            Submission Confirmed
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-main-content">
        <div className="ecell-card-login" style={{ maxWidth: '520px', textAlign: 'center' }}>
          {/* Success Check Badge */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto 18px',
              border: '1px solid #BBF7D0',
            }}
          >
            &#10003;
          </div>

          <span
            className="ecell-tag-pill"
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              borderColor: '#BBF7D0',
              marginBottom: '10px',
            }}
          >
            Assessment Successfully Submitted
          </span>

          <h1 className="ecell-heading-hero" style={{ marginTop: '8px' }}>
            Great job, {student?.name || 'Candidate'}.
          </h1>
          <p className="ecell-text-body">
            Your responses for ECELL Hiring Round 1 have been recorded and sealed in the secure proctoring vault.
          </p>

          {/* Details Box */}
          <div
            style={{
              backgroundColor: '#FAF9F6',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '20px 22px',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#5E6C84' }}>Candidate Name:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0A1B38' }}>{student?.name}</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#E4E2DC' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#5E6C84' }}>Registration ID:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0A1B38', fontFamily: 'monospace' }}>{student?.id}</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#E4E2DC' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#5E6C84' }}>Department:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0A1B38' }}>{attempt?.department || student?.department}</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#E4E2DC' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#5E6C84' }}>Proctoring Audit:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803D' }}>Verified & Locked</span>
            </div>
          </div>

          {/* Next Steps Card */}
          <div
            style={{
              backgroundColor: '#EEF4FC',
              border: '1px solid #DCE6F5',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '0.86rem',
              color: '#12336B',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.92rem' }}>
              Next Step: 1-Minute Feedback
            </strong>
            Before you leave, please help us improve your testing experience with a quick 60-second review. You will also get priority access to the upcoming STRUCT launch.
          </div>

          <Link
            href="/ecell/feedback"
            className="ecell-btn-primary"
            style={{ padding: '16px 24px', fontSize: '1rem' }}
          >
            Proceed to Candidate Feedback &rarr;
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. Examination submission confirmed.
      </footer>
    </div>
  );
}

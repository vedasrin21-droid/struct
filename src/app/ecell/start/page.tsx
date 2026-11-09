'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

export default function EcellStartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [department, setDepartment] = useState('');
  const [deptName, setDeptName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        if (data.attempt) {
          if (data.attempt.status === 'submitted') {
            router.push('/ecell/completed');
            return;
          } else if (data.attempt.status === 'in_progress') {
            router.push(`/ecell/exam/${data.attempt.id}`);
            return;
          }
        }

        if (!data.student.department) {
          router.push('/ecell/select-department');
          return;
        }

        setDepartment(data.student.department);
        setStudentName(data.student.name);

        const deptRes = await fetch('/api/ecell/departments');
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          const match = (deptData.departments || []).find((d: any) => d.code === data.student.department);
          if (match) setDeptName(match.name);
          else setDeptName(data.student.department);
        }
      } catch (err: any) {
        setError(err.message || 'Error initializing exam launch.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleStartExam = async () => {
    setError(null);
    setStarting(true);

    try {
      const res = await fetch('/api/ecell/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start examination session.');
      }

      router.push(`/ecell/exam/${data.attemptId}`);
    } catch (err: any) {
      setError(err.message || 'Could not initiate examination.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="ecell-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#0A1B38' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #DCE6F5',
              borderTopColor: '#0284C7',
              borderRadius: '50%',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Preparing examination...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ecell-page-wrapper">
      {/* Header */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <StructLogo size={36} subtitle="Assessment Suite" />
            </Link>
            <span style={{ height: '18px', width: '1px', backgroundColor: '#E2E8F0' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284C7' }}>
              Final Confirmation
            </span>
          </div>

          <Link href="/ecell/instructions" className="ecell-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Back to Instructions
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-main-content">
        <div className="ecell-card-login" style={{ maxWidth: '540px' }}>
          <div className="ecell-tag-pill" style={{ marginBottom: '16px' }}>
            <span className="ecell-dot-indicator"></span>
            Final Confirmation
          </div>

          <h1 className="ecell-heading-hero">Ready to begin your exam.</h1>
          <p className="ecell-text-body">
            Candidate: <strong>{studentName}</strong>. Please confirm your parameters before initiating the session.
          </p>

          {error && <div className="ecell-banner-error">{error}</div>}

          {/* Exam Summary Details */}
          <div
            style={{
              background: '#FAF9F6',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
              <span style={{ color: '#5E6C84' }}>Examination</span>
              <strong style={{ color: '#0A1B38' }}>ECELL Hiring &mdash; Round 1</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
              <span style={{ color: '#5E6C84' }}>Selected Track</span>
              <strong style={{ color: '#0284C7' }}>{deptName || department}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
              <span style={{ color: '#5E6C84' }}>Total Questions</span>
              <strong style={{ color: '#0A1B38' }}>20 MCQs</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
              <span style={{ color: '#5E6C84' }}>Time Allowed</span>
              <strong style={{ color: '#0A1B38' }}>15 Minutes</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '0.9rem' }}>
              <span style={{ color: '#5E6C84' }}>Attempts Allowed</span>
              <strong style={{ color: '#B45309' }}>1 Attempt Only</strong>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              marginBottom: '26px',
            }}
          >
            <strong>Warning:</strong> The 15-minute countdown starts immediately once you click Start Examination. Ensure you have no distractions and a stable internet connection.
          </div>

          <button
            onClick={handleStartExam}
            disabled={starting}
            className="ecell-btn-primary"
            style={{ fontSize: '1.05rem', padding: '16px 24px' }}
          >
            <span>{starting ? 'Initiating Examination...' : 'Start Examination'}</span>
            {!starting && <span>&rarr;</span>}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. All rights reserved. ECELL Official Recruitment Engine.
      </footer>
    </div>
  );
}

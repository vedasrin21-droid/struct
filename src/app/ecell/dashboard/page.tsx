'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  role: string;
}

interface ExamInfo {
  id: string;
  title: string;
  code: string;
  durationMinutes: number;
  totalQuestions: number;
  status: string;
}

interface AttemptInfo {
  id: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'closed';
  department: string;
  remainingSeconds: number;
  submittedAt: number | null;
}

export default function EcellDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string>('not_started');

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
        setExam(data.exam);
        setAttempt(data.attempt);
        setAttemptStatus(data.attemptStatus);
      } catch (err: any) {
        setError(err.message || 'Failed to load your examination dashboard.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/assess/auth/logout', { method: 'POST' });
    } finally {
      router.push('/ecell/login');
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
          <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !student || !exam) {
    return (
      <div className="ecell-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div className="ecell-card-login" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>
            Session Notice
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#5E6C84', marginBottom: '22px' }}>
            {error || 'Please log in to access your assessment.'}
          </p>
          <Link href="/ecell/login" className="ecell-btn-primary">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = attemptStatus === 'closed' || exam.status === 'closed';
  const isSubmitted = attemptStatus === 'submitted';
  const isInProgress = attemptStatus === 'in_progress';

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
              ECELL Recruitment
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0A1B38',
                background: '#FAF9F6',
                border: '1px solid #E4E2DC',
                padding: '6px 14px',
                borderRadius: '8px',
              }}
            >
              {student.name}
            </span>
            <button onClick={handleLogout} className="ecell-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-container-wide">
        {/* Welcome Section */}
        <div style={{ marginBottom: '28px' }}>
          <h1 className="ecell-heading-hero">Student Assessment Dashboard</h1>
          <p className="ecell-text-body" style={{ marginBottom: 0 }}>
            Welcome, <strong>{student.name}</strong>. Review your candidate details and examination parameters below.
          </p>
        </div>

        {/* Student Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.5px' }}>
              Candidate ID
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
              {student.id}
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.5px' }}>
              Registered Email
            </span>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0A1B38', marginTop: '4px', wordBreak: 'break-all' }}>
              {student.email}
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.5px' }}>
              Assigned Track
            </span>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: student.department ? '#12336B' : '#8993A4', marginTop: '4px' }}>
              {student.department ? student.department : 'Pending Selection'}
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E4E2DC',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.5px' }}>
              Attempt Status
            </span>
            <div style={{ marginTop: '4px' }}>
              {isSubmitted && (
                <span className="ecell-tag-pill" style={{ background: '#DCFCE7', color: '#15803D', borderColor: '#BBF7D0' }}>
                  Completed
                </span>
              )}
              {isInProgress && (
                <span className="ecell-tag-pill" style={{ background: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' }}>
                  In Progress
                </span>
              )}
              {!isSubmitted && !isInProgress && !isClosed && (
                <span className="ecell-tag-pill">
                  Ready to Start
                </span>
              )}
              {isClosed && (
                <span className="ecell-tag-pill" style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' }}>
                  Closed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Examination Main Card */}
        <div className="ecell-card-institutional">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div className="ecell-tag-pill" style={{ marginBottom: '12px' }}>
                <span className="ecell-dot-indicator"></span>
                Official Recruitment Assessment
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 6px 0' }}>
                {exam.title || 'ECELL Hiring — Round 1'}
              </h2>
              <p style={{ fontSize: '0.92rem', color: '#5E6C84', margin: 0 }}>
                20 Multiple Choice Questions &bull; 15 Minutes Duration &bull; Single Department Track &bull; One Attempt Only
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#8993A4', letterSpacing: '0.5px' }}>
                Duration
              </span>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.8rem', fontWeight: 800, color: '#0A1B38' }}>
                15:00
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: '#FAF9F6',
              border: '1px solid #E4E2DC',
              marginBottom: '26px',
              fontSize: '0.88rem',
              color: '#172B4D',
              lineHeight: 1.6,
            }}
          >
            <strong>Examination Rules:</strong> Once you begin, a continuous 15-minute timer starts server-side.
            Questions will be delivered based on your selected department.
            Your answers are autosaved in real-time. Ensure a stable internet connection.
          </div>

          {/* Dynamic Action Area */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
            {isSubmitted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#15803D' }}>
                  Assessment Submitted Successfully
                </span>
                <Link href="/ecell/feedback" className="ecell-btn-secondary">
                  Provide Feedback &rarr;
                </Link>
                <Link href="/launching-soon" className="ecell-btn-primary" style={{ width: 'auto' }}>
                  STRUCT Launch &rarr;
                </Link>
              </div>
            )}

            {isInProgress && attempt && (
              <Link href={`/ecell/exam/${attempt.id}`} className="ecell-btn-primary" style={{ width: 'auto' }}>
                Resume Examination &rarr;
              </Link>
            )}

            {!isSubmitted && !isInProgress && !isClosed && (
              <Link href="/ecell/select-department" className="ecell-btn-primary" style={{ width: 'auto' }}>
                Start Assessment &rarr;
              </Link>
            )}

            {isClosed && (
              <div style={{ color: '#B91C1C', fontWeight: 700, fontSize: '0.94rem' }}>
                Examination is currently closed by the administration.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. All rights reserved. ECELL Official Recruitment Engine.
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExamInstructionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // 1. Verify session
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(authData => {
        if (!authData.authenticated || !authData.user) {
          router.push('/assess/login');
          return;
        }
        setCandidate(authData.user);

        // 2. Fetch exam details
        return fetch(`/api/assess/candidate/exams/${examId}/status`);
      })
      .then(res => (res ? res.json() : null))
      .then(statusData => {
        if (!statusData) return;
        if (statusData.hasStarted && statusData.status === 'in_progress') {
          // Already in progress, jump directly to exam
          router.push(`/assess/exam/${examId}`);
          return;
        }
        if (statusData.status === 'submitted') {
          // Already submitted
          router.push(`/assess/completed/${examId}`);
          return;
        }

        // Fetch exam meta
        return fetch('/api/assess/candidate/exams');
      })
      .then(res => (res ? res.json() : null))
      .then(examsData => {
        if (!examsData) return;
        const found = (examsData.exams || []).find((e: any) => e.id === examId);
        if (found) {
          setExam(found);
        } else {
          // Fallback minimal exam metadata
          setExam({
            id: examId,
            title: 'Technical Recruitment Examination',
            department: 'Engineering',
            duration_minutes: 15,
            total_marks: 10,
            pass_marks: 6,
            negative_marking_enabled: true,
          });
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to initialize examination environment.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId, router]);

  const handleStartExam = async () => {
    if (!acknowledged) {
      setError('Please acknowledge that you have read the instructions before proceeding.');
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const res = await fetch(`/api/assess/candidate/exams/${examId}/start`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize examination attempt.');
      }

      router.push(`/assess/exam/${examId}`);
    } catch (err: any) {
      setError(err.message || 'Unable to start examination.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFD' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #CBD5E1', borderTopColor: '#0284C7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <span>Loading examination instructions...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFD',
        color: '#0F172A',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '36px 20px',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Top Header */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px 32px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              S
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                STRUCT ASSESS &bull; EXAMINATION PORTAL
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0A1B38' }}>
                {exam ? exam.title : 'Technical Examination'}
              </h1>
            </div>
          </div>

          {candidate && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{candidate.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{candidate.department || 'Candidate'} &bull; {candidate.email}</div>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              borderRadius: '12px',
              padding: '14px 18px',
              fontSize: '0.9rem',
              marginBottom: '24px',
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        {/* Examination Meta Specs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Duration</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
              {exam?.duration_minutes || 15} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Mins</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Marks</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
              {exam?.total_marks || 10}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Negative Marking</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: exam?.negative_marking_enabled ? '#DC2626' : '#16A34A', marginTop: '6px' }}>
              {exam?.negative_marking_enabled ? 'Active (-0.25)' : 'Disabled'}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Evaluation</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284C7', marginTop: '6px' }}>
              Server-Side
            </div>
          </div>
        </div>

        {/* Detailed Instructions Box */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '32px 36px',
            boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)',
            marginBottom: '28px',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 18px' }}>
            Candidate Examination Instructions &amp; Code of Conduct
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>1.</span>
              <span><strong>Server-Authoritative Timer:</strong> The countdown timer is strictly maintained on the server. Navigating away, closing the window, or refreshing your browser will not pause or extend your allotted time.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>2.</span>
              <span><strong>Real-time Answer Saving:</strong> Every response you select is automatically sent and committed to the database. Look for the "Saved" indicator in the top header.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>3.</span>
              <span><strong>Question Navigation &amp; Review:</strong> You can jump between questions at any time using the navigation palette, and toggle "Mark for Review" on items you wish to revisit before submitting.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>4.</span>
              <span><strong>Proctoring &amp; Focus Telemetry:</strong> Switching tabs, minimizing the browser window, or exiting fullscreen will be recorded in the examination audit log. Keep this window in full focus.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>5.</span>
              <span><strong>Submission Finality:</strong> Once you click "Submit Examination" or when the timer reaches zero, your test is permanently locked and graded server-side.</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <input
              type="checkbox"
              id="acknowledge-cb"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label
              htmlFor="acknowledge-cb"
              style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
            >
              I have read, understood, and agree to abide by all the examination guidelines above.
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/assess/login"
            style={{ fontSize: '0.9rem', color: '#64748B', textDecoration: 'none', fontWeight: 600 }}
          >
            &larr; Switch Account
          </Link>

          <button
            type="button"
            disabled={!acknowledged || starting}
            onClick={handleStartExam}
            style={{
              background: acknowledged ? 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 32px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: acknowledged && !starting ? 'pointer' : 'not-allowed',
              boxShadow: acknowledged ? '0 6px 20px rgba(2, 132, 199, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {starting ? 'Initializing Exam Environment...' : 'Start Examination Now \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}

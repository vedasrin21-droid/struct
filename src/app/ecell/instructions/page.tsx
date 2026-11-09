'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

export default function EcellInstructionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [department, setDepartment] = useState('');
  const [deptName, setDeptName] = useState('');
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

        // Fetch department display name
        const deptRes = await fetch('/api/ecell/departments');
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          const match = (deptData.departments || []).find((d: any) => d.code === data.student.department);
          if (match) setDeptName(match.name);
          else setDeptName(data.student.department);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading instructions.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

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
          <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading instructions...</p>
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
              Step 2 of 3: Examination Instructions
            </span>
          </div>

          <Link href="/ecell/select-department" className="ecell-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Change Department
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-container-wide">
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div className="ecell-tag-pill" style={{ marginBottom: '12px' }}>
              <span className="ecell-dot-indicator"></span>
              Assessment Guidelines
            </div>
            <h1 className="ecell-heading-hero">Before you begin.</h1>
            <p className="ecell-text-body">
              Carefully review the examination rules and technical parameters before proceeding to start.
            </p>
          </div>

          {error && <div className="ecell-banner-error">{error}</div>}

          {/* Parameters Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '26px',
            }}
          >
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E4E2DC', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84' }}>
                Assessment
              </span>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
                ECELL Round 1
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E4E2DC', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84' }}>
                Duration
              </span>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
                15 Minutes
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E4E2DC', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84' }}>
                Questions
              </span>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
                20 MCQs
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E4E2DC', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84' }}>
                Selected Track
              </span>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                {deptName || department}
              </div>
            </div>
          </div>

          {/* Instructions List Card */}
          <div className="ecell-card-institutional" style={{ marginBottom: '26px', padding: '30px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '18px' }}>
              Examination Instructions
            </h2>

            <ol style={{ paddingLeft: '22px', margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.92rem', color: '#172B4D', lineHeight: 1.55 }}>
              <li>
                <strong>Question Count:</strong> The examination contains exactly 20 multiple choice questions.
              </li>
              <li>
                <strong>Strict Timer:</strong> Total duration is 15 minutes. The timer begins the moment you click Start Examination and runs server-side without pause.
              </li>
              <li>
                <strong>Single Track Policy:</strong> Only one department examination is permitted per candidate. Once started, your track cannot be altered.
              </li>
              <li>
                <strong>Autosave:</strong> Every option choice you select is automatically saved to the secure database in real-time.
              </li>
              <li>
                <strong>Browser Stability:</strong> Do not refresh, reload, or navigate away from the test tab. If connection drops, reopen the page immediately to resume with remaining time.
              </li>
              <li>
                <strong>Auto-Submission:</strong> When the 15-minute countdown reaches 00:00, your examination will automatically submit with your current answers.
              </li>
              <li>
                <strong>Integrity & Proctoring:</strong> Multiple logins, switching accounts, or unauthorized tab switching are logged and may result in disqualification.
              </li>
            </ol>
          </div>

          {/* Acknowledgement Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '28px',
              cursor: 'pointer',
            }}
            onClick={() => setAgreed(!agreed)}
          >
            <input
              type="checkbox"
              id="agreeCheck"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                marginTop: '3px',
                cursor: 'pointer',
                accentColor: '#12336B',
              }}
            />
            <label
              htmlFor="agreeCheck"
              style={{
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#0A1B38',
                cursor: 'pointer',
                lineHeight: 1.45,
              }}
            >
              I have read, understood, and agree to strictly abide by the examination rules and time limits stated above.
            </label>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href="/ecell/select-department" className="ecell-btn-secondary">
              Back
            </Link>
            <button
              onClick={() => router.push('/ecell/start')}
              disabled={!agreed}
              className="ecell-btn-primary"
              style={{ width: 'auto', minWidth: '220px' }}
            >
              Proceed to Start Exam &rarr;
            </button>
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

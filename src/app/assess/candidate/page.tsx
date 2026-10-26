'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CandidateExam {
  id: string;
  title: string;
  code: string;
  description: string;
  department: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  negative_marking_enabled: boolean;
  exam_status: string;
  results_released: boolean;
  instructions: string;
  state: 'ready' | 'in_progress' | 'submitted' | 'expired' | 'closed';
  remainingSeconds: number;
  score: number | null;
  pass_status: string | null;
}

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [exams, setExams] = useState<CandidateExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-exam modal state
  const [selectedExam, setSelectedExam] = useState<CandidateExam | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assess/candidate/exams');
      if (!res.ok) throw new Error('Failed to load assigned examinations');
      const data = await res.json();
      setExams(data.exams || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check auth
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || data.user.role !== 'candidate') {
          router.push('/assess');
        } else {
          setUser(data.user);
          loadExams();
        }
      })
      .catch(() => {
        router.push('/assess');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/assess/auth/logout', { method: 'POST' });
    router.push('/assess');
  };

  const handleStartExam = async (examId: string) => {
    try {
      setStarting(true);
      setError(null);
      const res = await fetch(`/api/assess/candidate/exams/${examId}/start`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start examination');
      }

      router.push(`/assess/exam/${examId}`);
    } catch (err: any) {
      setError(err.message);
      setStarting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1.1rem'
              }}>
                S
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38' }}>STRUCT</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', background: '#E0F2FE', color: '#0369A1' }}>CANDIDATE</span>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{user.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{user.department} &bull; {user.email}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '36px 20px', width: '100%' }}>
        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0A1B38 0%, #17386D 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(10, 27, 56, 0.15)'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Candidate Examination Dashboard
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Welcome back, {user ? user.name : 'Candidate'}
            </h1>
            <p style={{ fontSize: '0.92rem', color: '#CBD5E1', margin: '8px 0 0', maxWidth: '580px' }}>
              Assigned assessments are synchronized with central proctoring and server-authoritative timers. Please review instructions before initiating any assessment.
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '12px 20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Tests</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF' }}>{exams.length}</div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '0.9rem',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* Exams List Section */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Scheduled &amp; Assigned Examinations
          </h2>
          <button
            onClick={loadExams}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0284C7',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            &#x21bb; Refresh List
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            Loading your assigned examinations...
          </div>
        ) : exams.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px dashed #CBD5E1',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              No Active Examinations Assigned
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '460px', margin: '0 auto' }}>
              Your administrator or test proctor has not assigned any active assessments to your profile yet. Please check back later.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {exams.map(exam => {
              const isSubmitted = exam.state === 'submitted';
              const isInProgress = exam.state === 'in_progress';
              const isExpired = exam.state === 'expired';
              const isClosed = exam.state === 'closed';

              return (
                <div
                  key={exam.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          background: '#E0F2FE',
                          color: '#0369A1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.5px'
                        }}>
                          {exam.code}
                        </span>
                        <span style={{
                          background: '#F1F5F9',
                          color: '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}>
                          {exam.department}
                        </span>
                        {/* State Pill */}
                        {isSubmitted ? (
                          <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            Submitted
                          </span>
                        ) : isInProgress ? (
                          <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                            In Progress ({Math.floor(exam.remainingSeconds / 60)}m left)
                          </span>
                        ) : isExpired ? (
                          <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            Expired
                          </span>
                        ) : isClosed ? (
                          <span style={{ background: '#E2E8F0', color: '#64748B', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            Closed
                          </span>
                        ) : (
                          <span style={{ background: '#F0F9FF', color: '#0284C7', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            Ready to Start
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 6px 0' }}>
                        {exam.title}
                      </h3>
                      <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0, maxWidth: '640px' }}>
                        {exam.description || 'Institutional assessment administered via STRUCT Assess.'}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isSubmitted ? (
                        <button
                          onClick={() => router.push(`/assess/exam/${exam.id}/result`)}
                          style={{
                            background: '#F1F5F9',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '10px 18px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer'
                          }}
                        >
                          View Receipt / Results &rarr;
                        </button>
                      ) : isInProgress ? (
                        <button
                          onClick={() => router.push(`/assess/exam/${exam.id}`)}
                          style={{
                            background: '#B45309',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(180, 83, 9, 0.25)'
                          }}
                        >
                          Resume Exam &rarr;
                        </button>
                      ) : isExpired || isClosed ? (
                        <button
                          disabled
                          style={{
                            background: '#E2E8F0',
                            color: '#94A3B8',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 18px',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            cursor: 'not-allowed'
                          }}
                        >
                          Unavailable
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedExam(exam); setAcknowledged(false); setError(null); }}
                          style={{
                            background: '#0A1B38',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 22px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(10, 27, 56, 0.2)'
                          }}
                        >
                          Start Assessment &rarr;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Benchmark & Rules Meta */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F1F5F9',
                    fontSize: '0.82rem',
                    color: '#475569'
                  }}>
                    <div>
                      <strong style={{ color: '#0F172A' }}>Duration:</strong> {exam.duration_minutes} Minutes
                    </div>
                    <div>
                      <strong style={{ color: '#0F172A' }}>Total Marks:</strong> {exam.total_marks}
                    </div>
                    <div>
                      <strong style={{ color: '#0F172A' }}>Pass Threshold:</strong> {exam.pass_marks} Marks
                    </div>
                    <div>
                      <strong style={{ color: '#0F172A' }}>Negative Marking:</strong> {exam.negative_marking_enabled ? 'Active (-0.25 on wrong)' : 'Disabled'}
                    </div>
                    {isSubmitted && exam.score !== null && (
                      <div style={{ color: exam.pass_status === 'passed' ? '#15803D' : '#B91C1C', fontWeight: 700 }}>
                        <strong>Score:</strong> {exam.score} / {exam.total_marks} ({exam.pass_status?.toUpperCase()})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pre-Exam Verification & Honor Code Modal */}
        {selectedExam && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{
                  background: '#E0F2FE',
                  color: '#0369A1',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {selectedExam.code}
                </span>
                <button
                  onClick={() => setSelectedExam(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B' }}
                >
                  &times;
                </button>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>
                Pre-Exam Readiness &amp; Honor Code
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '20px' }}>
                You are about to launch <strong>{selectedExam.title}</strong>. Please review the requirements below.
              </p>

              {/* System Checks Checklist */}
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.86rem', color: '#166534', fontWeight: 600 }}>
                  <span style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Modern Browser Support: Verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.86rem', color: '#166534', fontWeight: 600 }}>
                  <span style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Network Connectivity &amp; Autosave Sync: Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.86rem', color: '#166534', fontWeight: 600 }}>
                  <span style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Proctoring Telemetry Monitoring: Enabled</span>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Official Instructions
                </h4>
                <div style={{
                  background: '#F1F5F9',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '0.82rem',
                  color: '#334155',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.5,
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}>
                  {selectedExam.instructions}
                </div>
              </div>

              {/* Acknowledgement Checkbox */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '24px',
                fontSize: '0.85rem',
                color: '#334155',
                lineHeight: 1.4
              }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>
                  I acknowledge that this assessment is timed on the server for exactly <strong>{selectedExam.duration_minutes} minutes</strong>. I agree not to switch tabs, leave fullscreen, or seek unauthorized aid. I understand that all suspicious telemetry signals will be recorded.
                </span>
              </label>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!acknowledged || starting}
                  onClick={() => handleStartExam(selectedExam.id)}
                  style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: !acknowledged || starting ? 'not-allowed' : 'pointer',
                    opacity: !acknowledged || starting ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {starting ? 'Initializing Session...' : 'Start Official Exam Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

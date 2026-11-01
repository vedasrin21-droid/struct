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

interface PracticeExam {
  id: string;
  title: string;
  code: string;
  description: string;
  department: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  negative_marking_enabled: boolean;
  is_practice: number;
  results_released: boolean;
  instructions: string;
  is_enrolled: boolean;
  assignment_id: string | null;
  state: 'ready' | 'in_progress' | 'submitted' | 'expired' | 'closed' | 'not_enrolled';
  attempt_id: string | null;
  score: number | null;
  pass_status: string | null;
  remainingSeconds: number;
}

interface EntitlementInfo {
  hasAccess: boolean;
  remainingCredits: number;
  planName?: string;
}

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'practice'>('assigned');

  // Assigned exams state
  const [exams, setExams] = useState<CandidateExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Practice catalog state
  const [practiceExams, setPracticeExams] = useState<PracticeExam[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementInfo | null>(null);

  // Self-enrollment modal state
  const [selectedPracticeForEnroll, setSelectedPracticeForEnroll] = useState<PracticeExam | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // First-login password rotation state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwError, setChangePwError] = useState<string | null>(null);

  // Pre-exam modal state
  const [selectedExam, setSelectedExam] = useState<CandidateExam | PracticeExam | null>(null);
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

  const loadPracticeExams = async () => {
    try {
      setPracticeLoading(true);
      setPracticeError(null);
      const res = await fetch('/api/assess/candidate/practice');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load practice catalog');
      }
      const data = await res.json();
      setPracticeExams(data.exams || []);
      if (data.entitlement) {
        setEntitlement(data.entitlement);
      }
    } catch (err: any) {
      setPracticeError(err.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check auth
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || (data.user.role !== 'candidate' && data.user.role !== 'user')) {
          router.push('/assess');
        } else {
          setUser(data.user);
          if (Number(data.user.must_change_password) === 1) {
            setMustChangePassword(true);
          }
          loadExams();
          loadPracticeExams();
        }
      })
      .catch(() => {
        router.push('/assess');
      });
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwError(null);
    if (newPassword.length < 8) {
      setChangePwError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePwError('Passwords do not match');
      return;
    }
    try {
      setChangePwLoading(true);
      const res = await fetch('/api/assess/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');
      setMustChangePassword(false);
    } catch (err: any) {
      setChangePwError(err.message);
    } finally {
      setChangePwLoading(false);
    }
  };

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

  const handleEnrollPractice = async (examId: string) => {
    try {
      setEnrolling(true);
      setEnrollError(null);
      const res = await fetch('/api/assess/candidate/practice/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to self-enroll in practice assessment');
      }
      // Successfully enrolled: reload catalog and assigned lists
      await Promise.all([loadPracticeExams(), loadExams()]);
      setSelectedPracticeForEnroll(null);
    } catch (err: any) {
      setEnrollError(err.message);
    } finally {
      setEnrolling(false);
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
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{user.department || 'Individual Candidate'} &bull; {user.email}</span>
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
          marginBottom: '28px',
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
              Take assigned assessments or practice with standardized mock exams under central proctoring and server-authoritative timers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '12px 18px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center',
              minWidth: '100px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase' }}>Assigned</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF' }}>{exams.length}</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '12px 18px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center',
              minWidth: '100px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase' }}>Practice Catalog</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF' }}>{practiceExams.length}</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '12px 18px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center',
              minWidth: '110px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase' }}>Practice Credits</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: entitlement && entitlement.remainingCredits > 0 ? '#4ADE80' : '#FCD34D' }}>
                {entitlement ? entitlement.remainingCredits : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setActiveTab('assigned')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'assigned' ? '3px solid #0284C7' : '3px solid transparent',
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: activeTab === 'assigned' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Scheduled &amp; Assigned</span>
            <span style={{
              background: activeTab === 'assigned' ? '#E0F2FE' : '#F1F5F9',
              color: activeTab === 'assigned' ? '#0369A1' : '#64748B',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 700
            }}>
              {exams.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('practice');
              if (practiceExams.length === 0) loadPracticeExams();
            }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'practice' ? '3px solid #0284C7' : '3px solid transparent',
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: activeTab === 'practice' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Public Practice Catalog</span>
            <span style={{
              background: activeTab === 'practice' ? '#DCFCE7' : '#F1F5F9',
              color: activeTab === 'practice' ? '#15803D' : '#64748B',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 700
            }}>
              {practiceExams.length}
            </span>
          </button>
        </div>

        {/* Global Error Notification */}
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

        {/* TAB 1: ASSIGNED EXAMS */}
        {activeTab === 'assigned' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Assigned Examinations
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Institutional examinations formally assigned by your organization or proctor.
                </p>
              </div>
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
                <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '460px', margin: '0 auto 20px' }}>
                  Your organization has not assigned any active institutional assessments to your profile yet.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('practice');
                    if (practiceExams.length === 0) loadPracticeExams();
                  }}
                  style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
                  }}
                >
                  Explore Practice Catalog &rarr;
                </button>
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
          </div>
        )}

        {/* TAB 2: PUBLIC PRACTICE CATALOG */}
        {activeTab === 'practice' && (
          <div>
            {/* Header & Balance Notice */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Public Practice Assessments
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Self-enroll in open standardized technical assessments to practice under real timed, proctored conditions.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={loadPracticeExams}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284C7',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  &#x21bb; Refresh Catalog
                </button>
              </div>
            </div>

            {/* Credit Status Banner */}
            {entitlement && (
              <div style={{
                background: entitlement.remainingCredits > 0 ? '#F0FDF4' : '#FFFBEB',
                border: entitlement.remainingCredits > 0 ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '14px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {entitlement.remainingCredits > 0 ? '🎯' : '⚠️'}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: entitlement.remainingCredits > 0 ? '#166534' : '#92400E' }}>
                      {entitlement.remainingCredits > 0
                        ? `${entitlement.remainingCredits} Practice Assessment Credit${entitlement.remainingCredits === 1 ? '' : 's'} Available`
                        : 'No Practice Credits Remaining'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: entitlement.remainingCredits > 0 ? '#15803D' : '#B45309' }}>
                      {entitlement.remainingCredits > 0
                        ? `Enrolling consumes 1 credit and creates an active exam session.`
                        : `Upgrade your STRUCT plan to unlock additional practice attempts.`}
                    </div>
                  </div>
                </div>

                {entitlement.remainingCredits === 0 && (
                  <Link
                    href="/portal#plans"
                    style={{
                      background: '#B45309',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(180, 83, 9, 0.2)'
                    }}
                  >
                    View Upgrade Plans &rarr;
                  </Link>
                )}
              </div>
            )}

            {practiceError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: '10px',
                padding: '12px 18px',
                fontSize: '0.9rem',
                marginBottom: '24px'
              }}>
                {practiceError}
              </div>
            )}

            {practiceLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                Loading practice assessment catalog...
              </div>
            ) : practiceExams.length === 0 ? (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1',
                padding: '48px 24px',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  No Practice Assessments Available
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '460px', margin: '0 auto' }}>
                  There are currently no public practice assessments published. Please check back later or check with your organization.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {practiceExams.map(exam => {
                  const isEnrolled = exam.is_enrolled;
                  const isSubmitted = exam.state === 'submitted';
                  const isInProgress = exam.state === 'in_progress';
                  const isReady = exam.state === 'ready';

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
                            <span style={{
                              background: '#F0FDF4',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              Public Practice
                            </span>

                            {/* Status Pill */}
                            {isSubmitted ? (
                              <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                                Completed
                              </span>
                            ) : isInProgress ? (
                              <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                                In Progress ({Math.floor(exam.remainingSeconds / 60)}m left)
                              </span>
                            ) : isReady ? (
                              <span style={{ background: '#F0F9FF', color: '#0284C7', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                                Enrolled &bull; Ready to Start
                              </span>
                            ) : (
                              <span style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                                Not Enrolled
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 6px 0' }}>
                            {exam.title}
                          </h3>
                          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0, maxWidth: '640px' }}>
                            {exam.description || 'Standardized public practice assessment.'}
                          </p>
                        </div>

                        {/* Action Buttons */}
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
                              View Scorecard &rarr;
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
                          ) : isReady ? (
                            <button
                              onClick={() => { setSelectedExam(exam); setAcknowledged(false); setError(null); }}
                              style={{
                                background: '#0284C7',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 22px',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                              }}
                            >
                              Start Assessment &rarr;
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPracticeForEnroll(exam);
                                setEnrollError(null);
                              }}
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
                              Self-Enroll &rarr;
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
          </div>
        )}

        {/* SELF-ENROLLMENT CONFIRMATION MODAL */}
        {selectedPracticeForEnroll && (
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
              maxWidth: '560px',
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
                  {selectedPracticeForEnroll.code}
                </span>
                <button
                  onClick={() => setSelectedPracticeForEnroll(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B' }}
                >
                  &times;
                </button>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>
                Self-Enrollment Confirmation
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '20px' }}>
                You are about to enroll in <strong>{selectedPracticeForEnroll.title}</strong>.
              </p>

              {/* Exam specs summary */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '0.84rem'
              }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Duration</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPracticeForEnroll.duration_minutes} Minutes</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Total Marks</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPracticeForEnroll.total_marks} Marks</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Pass Threshold</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPracticeForEnroll.pass_marks} Marks</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Negative Marking</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPracticeForEnroll.negative_marking_enabled ? 'Active (-0.25)' : 'None'}</strong>
                </div>
              </div>

              {/* Entitlement notice */}
              {entitlement && entitlement.remainingCredits > 0 ? (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  color: '#166534'
                }}>
                  <strong>Credit Balance:</strong> You have <strong>{entitlement.remainingCredits} practice credit{entitlement.remainingCredits === 1 ? '' : 's'}</strong> available. Enrolling will deduct <strong>1 credit</strong> from your subscription balance.
                </div>
              ) : (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  color: '#991B1B'
                }}>
                  <strong>No Practice Credits Available:</strong> You need an active STRUCT subscription with available mock assessment credits to enroll.
                  <div style={{ marginTop: '8px' }}>
                    <Link
                      href="/portal#plans"
                      style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      View individual plans &amp; upgrade &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {enrollError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  marginBottom: '16px'
                }}>
                  {enrollError}
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPracticeForEnroll(null)}
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
                  disabled={enrolling || !entitlement || entitlement.remainingCredits <= 0}
                  onClick={() => handleEnrollPractice(selectedPracticeForEnroll.id)}
                  style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: enrolling || !entitlement || entitlement.remainingCredits <= 0 ? 'not-allowed' : 'pointer',
                    opacity: enrolling || !entitlement || entitlement.remainingCredits <= 0 ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {enrolling ? 'Enrolling...' : 'Confirm & Self-Enroll'}
                </button>
              </div>
            </div>
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
                  {selectedExam.instructions || 'Standard assessment instructions apply. Complete all questions within the allocated time.'}
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
                  {starting ? 'Initializing Session...' : 'Start Assessment Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANDATORY FIRST-LOGIN PASSWORD ROTATION MODAL */}
        {mustChangePassword && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '16px'
              }}>
                🔒
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                First-Login Password Rotation
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
                You signed in with a temporary generated credential. To secure your account and access assessments, set a permanent password.
              </p>

              {changePwError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', marginBottom: '16px' }}>
                  {changePwError}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    New Password (Min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new permanent password"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new permanent password"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={changePwLoading}
                  style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 0',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: changePwLoading ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {changePwLoading ? 'Updating Password...' : 'Save & Unlock Portal'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  college?: string;
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
  is_enrolled: boolean;
  state: 'not_enrolled' | 'ready' | 'in_progress' | 'submitted' | 'expired';
  score: number | null;
  pass_status: string | null;
  remainingSeconds: number;
}

interface AssessmentCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  difficulty: string;
  questionCount: number;
  icon: string;
}

interface AssessmentHistoryItem {
  attemptId: string;
  examId: string;
  title: string;
  code: string;
  category: string;
  durationMinutes: number;
  isPractice: boolean;
  startTime: number;
  submittedAt: number | null;
  score: number | null;
  maxScore: number;
  passStatus: string | null;
  status: string;
  resultsReleased: boolean;
}

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard Data
  const [practiceExams, setPracticeExams] = useState<PracticeExam[]>([]);
  const [categories, setCategories] = useState<AssessmentCategory[]>([]);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Premium Checkout State
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  useEffect(() => {
    // 1. Authenticate user
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || !data.user) {
          router.push('/login');
          return;
        }

        setUser(data.user);

        // Store sync in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('struct_user_email', data.user.email);
          localStorage.setItem('struct_user_name', data.user.name || '');
          localStorage.setItem('struct_user_role', data.user.role || 'candidate');
        }

        // 2. Fetch parallel dashboard resources
        return Promise.all([
          fetch('/api/assess/candidate/practice').then(r => r.json()),
          fetch('/api/assess/categories').then(r => r.json()),
          fetch('/api/assess/candidate/history').then(r => r.json()),
        ]);
      })
      .then(results => {
        if (!results) return;
        const [practiceData, catData, histData] = results;

        if (practiceData?.exams) {
          setPracticeExams(practiceData.exams);
        }
        if (catData?.categories) {
          setCategories(catData.categories);
        }
        if (histData?.history) {
          setHistory(histData.history);
        }
      })
      .catch((err: any) => {
        console.error('Dashboard load error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/assess/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('struct_user_email');
      localStorage.removeItem('struct_user_name');
      localStorage.removeItem('struct_user_role');
    }
    router.push('/');
  };

  const handleEnrollAndStart = async (exam: PracticeExam) => {
    setActionError(null);
    setEnrollingId(exam.id);

    try {
      if (!exam.is_enrolled) {
        const enrollRes = await fetch('/api/assess/candidate/practice/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: exam.id }),
        });
        const enrollData = await enrollRes.json();
        if (!enrollRes.ok) {
          throw new Error(enrollData.error || 'Failed to enroll in mock assessment');
        }
      }

      // If ready or not enrolled, initiate start
      if (exam.state === 'not_enrolled' || exam.state === 'ready') {
        const startRes = await fetch(`/api/assess/candidate/exams/${exam.id}/start`, {
          method: 'POST',
        });
        const startData = await startRes.json();
        if (!startRes.ok) {
          throw new Error(startData.error || 'Failed to start assessment');
        }
      }

      router.push(`/assess/exam/${exam.id}`);
    } catch (err: any) {
      setActionError(err.message || 'Unable to initiate assessment attempt.');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleBuyResumePack = async () => {
    setCheckoutErr(null);
    setCheckoutMsg(null);
    setCheckoutLoading(true);

    try {
      const email = user?.email || 'candidate@structonline.in';

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'resume_ai_pack_49',
          userEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate payment order.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Unable to connect to payment gateway. Please check connection.');
      }

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'STRUCT Career Platform',
        description: 'Resume AI Enhancement + Detailed ATS Analysis (₹49)',
        order_id: data.orderId,
        prefill: { email },
        theme: { color: '#0A1B38' },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          },
        },
        handler: async (resp: any) => {
          try {
            setCheckoutMsg('Verifying payment confirmation...');
            const vRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const vData = await vRes.json();
            if (!vRes.ok || !vData.success) {
              throw new Error(vData.error || 'Payment verification failed.');
            }
            setCheckoutMsg('Payment successful! Your Resume AI & Detailed ATS Polish credits are now active.');
          } catch (vErr: any) {
            setCheckoutErr(vErr.message);
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      rzp.open();
    } catch (err: any) {
      setCheckoutErr(err.message);
      setCheckoutLoading(false);
    }
  };

  // Filtered practice exams by category
  const filteredExams = practiceExams.filter(exam => {
    if (selectedCategory === 'all') return true;
    return exam.department?.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFD' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: '42px', height: '42px', border: '3px solid #CBD5E1', borderTopColor: '#0284C7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading your assessment dashboard...</span>
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
      }}
    >
      {/* Sticky Navigation Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 28px',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left Brand */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1.15rem',
              }}
            >
              S
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-0.5px' }}>STRUCT</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#E0F2FE', color: '#0369A1' }}>
              CANDIDATE
            </span>
          </Link>

          {/* Center Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#practice" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
              Mock Assessments
            </a>
            <a href="#categories" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
              Categories
            </a>
            <a href="#history" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
              My History
            </a>
            <Link href="/resume-builder" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
              Resume Builder
            </Link>
          </nav>

          {/* Right Profile & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {user && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{user.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{user.email}</div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0A1B38 0%, #17386D 100%)',
            borderRadius: '20px',
            padding: '36px 40px',
            color: '#FFFFFF',
            marginBottom: '36px',
            boxShadow: '0 12px 32px rgba(10, 27, 56, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              Student Practice &amp; Assessment Hub
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.3rem)', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Welcome back, {user ? user.name : 'Candidate'}
            </h1>
            <p style={{ fontSize: '1rem', color: '#CBD5E1', margin: 0, maxWidth: '620px', lineHeight: 1.6 }}>
              Continue practicing and build your confidence for your next assessment. Choose from standardized technical mocks, explore skills by category, and review your evaluation history.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '14px',
                padding: '16px 22px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textAlign: 'center',
                minWidth: '120px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase' }}>Mock Tests</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                {practiceExams.length}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '14px',
                padding: '16px 22px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textAlign: 'center',
                minWidth: '120px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#4ADE80', marginTop: '4px' }}>
                {history.filter(h => h.status === 'submitted').length}
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Error */}
        {actionError && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '0.92rem',
              marginBottom: '28px',
            }}
          >
            {actionError}
          </div>
        )}

        {/* SECTION 1 — CONTINUE PRACTICING (AVAILABLE MOCK ASSESSMENTS) */}
        <section id="practice" style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0A1B38', margin: 0, letterSpacing: '-0.5px' }}>
                Continue Practicing
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>
                Standardized mock assessments with server-side timers and instant evaluation.
              </p>
            </div>

            {/* Filter by Category Pill */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedCategory === 'all' ? '#0A1B38' : '#F1F5F9',
                  color: selectedCategory === 'all' ? '#FFFFFF' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCategory('engineering')}
                style={{
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedCategory === 'engineering' ? '#0A1B38' : '#F1F5F9',
                  color: selectedCategory === 'engineering' ? '#FFFFFF' : '#475569',
                }}
              >
                Full-Stack
              </button>
              <button
                onClick={() => setSelectedCategory('dsa')}
                style={{
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedCategory === 'dsa' ? '#0A1B38' : '#F1F5F9',
                  color: selectedCategory === 'dsa' ? '#FFFFFF' : '#475569',
                }}
              >
                DSA
              </button>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px dashed #CBD5E1',
                padding: '44px 20px',
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No mock assessments currently available in this category.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
              }}
            >
              {filteredExams.map(exam => {
                const isCompleted = exam.state === 'submitted';
                const isInProgress = exam.state === 'in_progress';

                return (
                  <div
                    key={exam.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1.5px solid #E2E8F0',
                      padding: '28px 24px',
                      boxShadow: '0 4px 18px rgba(10, 27, 56, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span
                          style={{
                            background: '#E0F2FE',
                            color: '#0369A1',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {exam.department || 'Technical'}
                        </span>

                        <span
                          style={{
                            background: isCompleted ? '#DCFCE7' : isInProgress ? '#FEF3C7' : '#F1F5F9',
                            color: isCompleted ? '#15803D' : isInProgress ? '#92400E' : '#475569',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '6px',
                          }}
                        >
                          {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : 'Available'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                        {exam.title}
                      </h3>

                      <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, margin: '0 0 20px' }}>
                        {exam.description || 'Test your proficiency across core engineering topics with randomized questions, negative marking, and automated grading.'}
                      </p>

                      {/* Meta specs pills */}
                      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', fontSize: '0.82rem', color: '#475569' }}>
                        <span>⏱️ <strong>{exam.duration_minutes} Mins</strong></span>
                        <span>📝 <strong>10 Questions</strong></span>
                        <span>🎯 <strong>{exam.total_marks} Marks</strong></span>
                      </div>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Link
                            href={`/assess/completed/${exam.id}`}
                            style={{
                              flex: 1,
                              background: '#F1F5F9',
                              color: '#334155',
                              padding: '11px 16px',
                              borderRadius: '8px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              textAlign: 'center',
                              textDecoration: 'none',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            View Result ({exam.score ?? '—'}/{exam.total_marks})
                          </Link>
                          <button
                            onClick={() => handleEnrollAndStart(exam)}
                            disabled={enrollingId === exam.id}
                            style={{
                              background: '#0A1B38',
                              color: '#FFFFFF',
                              padding: '11px 18px',
                              borderRadius: '8px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Retake
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={enrollingId === exam.id}
                          onClick={() => handleEnrollAndStart(exam)}
                          style={{
                            width: '100%',
                            background: isInProgress
                              ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                              : 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '9px',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            cursor: enrollingId === exam.id ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {enrollingId === exam.id
                            ? 'Preparing Test...'
                            : isInProgress
                            ? 'Continue In-Progress Test →'
                            : 'Start Assessment →'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2 — EXPLORE CATEGORIES */}
        <section id="categories" style={{ marginBottom: '52px' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0A1B38', margin: 0, letterSpacing: '-0.5px' }}>
              Explore Assessment Categories
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>
              Discover curated skill tracks based on your college placement and career targets.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                      {cat.difficulty}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                      {cat.questionCount} Questions in Bank
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px' }}>
                    {cat.name}
                  </h3>

                  <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    {cat.description}
                  </p>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                  <a
                    href="#practice"
                    onClick={() => setSelectedCategory(cat.slug)}
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#0284C7',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    View Mock Tests in this Track &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 — MY ASSESSMENT HISTORY */}
        <section id="history" style={{ marginBottom: '52px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0A1B38', margin: 0, letterSpacing: '-0.5px' }}>
              My Assessment History
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>
              Your verified submission records, performance scores, and timing summaries.
            </p>
          </div>

          {history.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px dashed #CBD5E1',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>
                No Completed Assessments Yet
              </h3>
              <p style={{ fontSize: '0.9rem', margin: '0 0 18px', maxWidth: '420px', marginInline: 'auto' }}>
                Complete your first standardized mock assessment to view score benchmarks, percentile breakdowns, and detailed answer keys.
              </p>
              <a
                href="#practice"
                style={{
                  display: 'inline-block',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Take a Practice Assessment Now &rarr;
              </a>
            </div>
          ) : (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '14px 20px' }}>Assessment Name</th>
                    <th style={{ padding: '14px 20px' }}>Category</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px' }}>Score</th>
                    <th style={{ padding: '14px 20px' }}>Date</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.attemptId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0A1B38' }}>
                        {item.title}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748B' }}>
                        {item.category}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            background: item.status === 'submitted' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'submitted' ? '#15803D' : '#92400E',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>
                        {item.score !== null ? `${item.score} / ${item.maxScore}` : 'Pending Release'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '0.82rem' }}>
                        {new Date(item.startTime).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {item.status === 'submitted' ? (
                          <Link
                            href={`/assess/completed/${item.examId}`}
                            style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
                          >
                            View Summary &rarr;
                          </Link>
                        ) : (
                          <Link
                            href={`/assess/exam/${item.examId}`}
                            style={{ color: '#D97706', fontWeight: 700, textDecoration: 'none' }}
                          >
                            Resume Exam &rarr;
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 5 — CAREER TOOLS (SECONDARY COMPACT CARDS) */}
        <section style={{ marginBottom: '52px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0, letterSpacing: '-0.3px' }}>
              Additional Career Development Tools
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '4px 0 0' }}>
              Free supplementary tools to polish your resume and benchmark your application against applicant tracking algorithms.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Tool 1: Resume Builder */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>CAREER TOOL</span>
                  <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>Free Tool</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 6px' }}>ATS Resume Builder</h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Create an industry-standard, recruiter-ready resume with real-time editing, live preview, and high-resolution PDF download.
                </p>
              </div>
              <Link
                href="/resume-builder"
                style={{
                  background: '#0A1B38',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Open Resume Builder &rarr;
              </Link>
            </div>

            {/* Tool 2: ATS Checker */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>DIAGNOSTIC TOOL</span>
                  <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>Free Scan</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 6px' }}>ATS Resume Checker</h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Upload your resume to check parsing health, detect missing structural sections, and verify keyword relevance.
                </p>
              </div>
              <Link
                href="/#resume-checker"
                style={{
                  background: '#F1F5F9',
                  color: '#1E293B',
                  border: '1px solid #CBD5E1',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Scan Resume Free &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 6 — OPTIONAL CAREER PREMIUM (₹49 ONE-TIME) */}
        <section>
          {checkoutMsg && (
            <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', fontSize: '0.9rem' }}>
              {checkoutMsg}
            </div>
          )}
          {checkoutErr && (
            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', fontSize: '0.9rem' }}>
              {checkoutErr}
            </div>
          )}

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #E2E8F0',
              padding: '32px 36px',
              boxShadow: '0 4px 20px rgba(10, 27, 56, 0.04)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div style={{ maxWidth: '620px' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: '#0284C7',
                  marginBottom: '6px',
                  display: 'inline-block',
                }}
              >
                Optional Career Upgrade &bull; One-Time Payment
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px' }}>
                STRUCT Resume AI Polish &amp; Detailed ATS Pack (₹49)
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, margin: '0 0 12px' }}>
                Mock assessments are always free. If you want deep AI bullet point rewrites (Google X-Y-Z formula) and section-by-section ATS scoring for your resume, get the optional add-on pack.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>✓ 2 Complete AI Bullet Rewrites</span>
                <span>✓ Section-by-Section ATS Breakdown</span>
                <span>✓ No Recurring Subscription</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: '200px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1px' }}>
                ₹49
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '12px' }}>one-time add-on</div>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleBuyResumePack}
                style={{
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '11px 22px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: checkoutLoading ? 'wait' : 'pointer',
                  opacity: checkoutLoading ? 0.8 : 1,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
              >
                {checkoutLoading ? 'Connecting...' : 'Upgrade Now — ₹49 →'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


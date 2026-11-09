'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { obfuscateForGoogle, getPoisonedClipboardPayload } from '@/lib/assess/antiCheat';

interface Question {
  id: string;
  orderIndex: number;
  isMandatory: boolean;
  text: string;
  options: string[];
  category: string;
  questionType: string;
}

interface SavedAnswer {
  selectedOptionIndex: number | null;
  isMarkedForReview: boolean;
  version: number;
}

export default function ExamInterfacePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('candidate@talvyn.com');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Fullscreen & Anti-Cheat Proctoring States
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [fullscreenViolations, setFullscreenViolations] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      }
      setIsFullscreen(true);
      setShowFullscreenModal(false);
    } catch {
      showToast('⚠️ Full-screen access is required by proctors to continue your assessment.');
    }
  };

  useEffect(() => {
    async function loadAttempt() {
      try {
        const [attRes, meRes] = await Promise.all([
          fetch(`/api/ecell/attempts/${attemptId}`),
          fetch('/api/ecell/me').catch(() => null),
        ]);

        if (!attRes.ok) {
          if (attRes.status === 401) {
            router.push('/ecell/login');
            return;
          }
          throw new Error('Failed to load examination attempt');
        }

        const data = await attRes.json();
        if (data.isSubmitted) {
          router.push('/ecell/completed');
          return;
        }

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          if (meData.student?.email) {
            setCandidateEmail(meData.student.email);
          }
        }

        setDepartment(data.department);
        setQuestions(data.questions || []);
        setAnswers(data.savedAnswers || {});
        setRemainingSeconds(data.remainingSeconds);

        // Enforce Fullscreen on start
        if (!document.fullscreenElement) {
          setShowFullscreenModal(true);
          setIsFullscreen(false);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading examination.');
      } finally {
        setLoading(false);
      }
    }

    loadAttempt();
  }, [attemptId, router]);

  // Anti-refresh guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitting && remainingSeconds > 0) {
        e.preventDefault();
        e.returnValue = 'Your examination is currently in progress. Your timer will continue running.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitting, remainingSeconds]);

  // Server-synced countdown timer
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, remainingSeconds]);

  // Comprehensive Anti-AI & Proctoring Signals
  useEffect(() => {
    if (!attemptId) return;

    const sendSecuritySignal = (eventType: string, severity: 'low' | 'medium' | 'high', details: string) => {
      fetch('/api/assess/candidate/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          examId: 'exam_ecell_round1_2026',
          eventType,
          severity,
          details,
        }),
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        showToast('⚠️ Proctored Alert: Tab switch or app blur detected and logged.');
        sendSecuritySignal('tab_switch', 'medium', 'Candidate switched tabs or minimized window');
      }
    };

    const handleWindowBlur = () => {
      sendSecuritySignal('window_blur', 'low', 'Window lost focus');
    };

    const handleFullscreenChange = () => {
      const inFs = Boolean(document.fullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs) {
        setFullscreenViolations((prev) => {
          const next = prev + 1;
          sendSecuritySignal('fullscreen_exit', 'high', `Candidate exited full-screen mode (Violation #${next})`);
          return next;
        });
        setShowFullscreenModal(true);
        showToast('⚠️ Full-screen exit detected! Return to full screen to continue.');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common inspect & copy keys
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key)) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'v' || e.key === 'V'))
      ) {
        e.preventDefault();
        showToast('⚠️ Inspection shortcuts, copy, and paste are strictly disabled.');
        sendSecuritySignal('dev_tools_attempt', 'high', `Candidate key shortcut blocked: ${e.key}`);
      }
    };

    const handleCopyOrCut = (e: ClipboardEvent) => {
      e.preventDefault();
      const poison = getPoisonedClipboardPayload(candidateEmail, 'ECELL-R1-2026');
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', poison);
      }
      showToast('⚠️ Copying is strictly prohibited and logged to proctors.');
      sendSecuritySignal('copy_attempt', 'high', 'Candidate attempted to copy question content');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showToast('Right-click context menu is disabled during proctored examinations.');
      sendSecuritySignal('right_click_attempt', 'medium', 'Candidate attempted right-click context menu');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyOrCut);
    document.addEventListener('cut', handleCopyOrCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyOrCut);
      document.removeEventListener('cut', handleCopyOrCut);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [attemptId, candidateEmail]);

  const saveAnswer = async (
    qId: string,
    optIndex: number | null,
    isMarked: boolean
  ) => {
    setSaveStatus('saving');
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        selectedOptionIndex: optIndex,
        isMarkedForReview: isMarked,
        version: (prev[qId]?.version || 0) + 1,
      },
    }));

    try {
      const res = await fetch(`/api/ecell/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          selectedOptionIndex: optIndex,
          isMarkedForReview: isMarked,
          clientVersion: (answers[qId]?.version || 0) + 1,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        if (d.isSubmitted) {
          router.push('/ecell/completed');
          return;
        }
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSelectOption = (optIndex: number) => {
    const currQ = questions[currentIndex];
    if (!currQ) return;
    const currentMarked = answers[currQ.id]?.isMarkedForReview || false;
    saveAnswer(currQ.id, optIndex, currentMarked);
  };

  const handleToggleMarkForReview = () => {
    const currQ = questions[currentIndex];
    if (!currQ) return;
    const currAns = answers[currQ.id];
    const newMarked = !(currAns?.isMarkedForReview || false);
    saveAnswer(currQ.id, currAns?.selectedOptionIndex ?? null, newMarked);
  };

  const handleClearChoice = () => {
    const currQ = questions[currentIndex];
    if (!currQ) return;
    const currentMarked = answers[currQ.id]?.isMarkedForReview || false;
    saveAnswer(currQ.id, null, currentMarked);
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const res = await fetch(`/api/ecell/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      router.push(data.redirectUrl || '/ecell/completed');
    } catch (err: any) {
      setError(err.message || 'Submission error');
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ecell/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      router.push(data.redirectUrl || '/ecell/completed');
    } catch {
      router.push('/ecell/completed');
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeCritical = remainingSeconds <= 180;
  const isTimeDanger = remainingSeconds <= 60;

  const answeredCount = Object.values(answers).filter(
    (a) => a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined
  ).length;
  const markedCount = Object.values(answers).filter((a) => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

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
          <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading examination session...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : null;

  return (
    <div
      className="ecell-page-wrapper"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Top Proctored Header */}
      <header
        style={{
          backgroundColor: '#0A1B38',
          color: '#FFFFFF',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 20px',
            height: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/struct-logo-transparent.png"
              alt="STRUCT Logo"
              style={{
                width: '42px',
                height: '32px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.45))',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.3px' }}>
                  ECELL Hiring
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#BAE6FD',
                  }}
                >
                  Round 1
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                Track: <strong style={{ color: '#FFFFFF' }}>{department}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Auto-save indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor:
                    saveStatus === 'saved'
                      ? '#22C55E'
                      : saveStatus === 'saving'
                        ? '#F59E0B'
                        : '#EF4444',
                }}
              />
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Sync error'}
              </span>
            </div>

            {/* Countdown Badge */}
            <div
              className={`ecell-timer-badge ${isTimeDanger ? 'danger' : isTimeCritical ? 'critical' : ''}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{timeFormatted}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="ecell-exam-container" style={{ flex: 1 }}>
        {/* Left Column: Question Card */}
        <div className="ecell-exam-main">
          {currentQ && (
            <div className="ecell-card-institutional" style={{ padding: '32px' }}>
              {/* Question Meta Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #F1F5F9',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#0A1B38',
                      backgroundColor: '#FAF9F6',
                      border: '1px solid #E4E2DC',
                      padding: '4px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#0284C7',
                      backgroundColor: '#EEF4FC',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {currentQ.category}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleToggleMarkForReview}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: currentAnswer?.isMarkedForReview ? '1.5px solid var(--accent-amber-border)' : '1px solid #E4E2DC',
                      backgroundColor: currentAnswer?.isMarkedForReview ? 'var(--accent-amber-bg)' : '#FFFFFF',
                      color: currentAnswer?.isMarkedForReview ? 'var(--accent-amber)' : '#5E6C84',
                    }}
                  >
                    {currentAnswer?.isMarkedForReview ? '\u2714 Marked for Review' : 'Mark for Review'}
                  </button>

                  {currentAnswer?.selectedOptionIndex !== null &&
                    currentAnswer?.selectedOptionIndex !== undefined && (
                      <button
                        onClick={handleClearChoice}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid #E4E2DC',
                          backgroundColor: '#FFFFFF',
                          color: '#EF4444',
                        }}
                      >
                        Clear Choice
                      </button>
                    )}
                </div>
              </div>

              {/* Question Text (Obfuscated against AI / Google scrapers) */}
              <h2
                style={{
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0A1B38',
                  lineHeight: 1.5,
                  margin: '0 0 28px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {obfuscateForGoogle(currentQ.text)}
              </h2>

              {/* 4 Options (Obfuscated against AI tokenizers) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {currentQ.options.map((optText, optIdx) => {
                  const isSelected = currentAnswer?.selectedOptionIndex === optIdx;
                  const label = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`ecell-mcq-choice ${isSelected ? 'active' : ''}`}
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      }}
                    >
                      <div className="ecell-mcq-letter">
                        {label}
                      </div>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: '#0A1B38',
                          lineHeight: 1.5,
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {obfuscateForGoogle(optText)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '20px',
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="ecell-btn-secondary"
                  style={{
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    padding: '10px 20px',
                  }}
                >
                  &larr; Previous
                </button>

                <span style={{ fontSize: '0.84rem', color: '#8993A4', fontWeight: 600 }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>

                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="ecell-btn-primary"
                  style={{
                    width: 'auto',
                    opacity: currentIndex === questions.length - 1 ? 0.4 : 1,
                    cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                    padding: '10px 24px',
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Palette & Submission */}
        <div className="ecell-exam-sidebar">
          <div className="ecell-card-institutional" style={{ padding: '24px' }}>
            <h3
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: '#0A1B38',
                marginBottom: '16px',
              }}
            >
              Question Palette
            </h3>

            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px',
                marginBottom: '24px',
              }}
            >
              {questions.map((q, idx) => {
                const a = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAns = a?.selectedOptionIndex !== null && a?.selectedOptionIndex !== undefined;
                const isMark = a?.isMarkedForReview;

                let bg = '#FFFFFF';
                let color = '#5E6C84';
                let border = '1.5px solid #E4E2DC';

                if (isCurrent) {
                  border = '2px solid #0284C7';
                  bg = '#EEF4FC';
                  color = '#0284C7';
                }

                if (isMark) {
                  bg = 'var(--accent-amber-bg)';
                  color = 'var(--accent-amber)';
                  border = '1.5px solid var(--accent-amber-border)';
                } else if (isAns) {
                  bg = 'var(--accent-green-bg)';
                  color = 'var(--accent-green)';
                  border = '1.5px solid var(--accent-green-border)';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '8px',
                      backgroundColor: bg,
                      color: color,
                      border: border,
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green-border)' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)' }} />
                <span>Marked for Review ({markedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FFFFFF', border: '1px solid #E4E2DC' }} />
                <span>Unanswered ({unansweredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="ecell-btn-primary"
              style={{
                background: 'var(--accent-green, #15803D)',
                boxShadow: '0 4px 14px rgba(21, 128, 61, 0.25)',
              }}
            >
              Submit Final Exam &rarr;
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 27, 56, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="ecell-card-login" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h3
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '8px',
              }}
            >
              Confirm Submission
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#5E6C84', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to finish your assessment? Once submitted, your answers are permanently locked.
            </p>

            <div
              style={{
                backgroundColor: '#FAF9F6',
                border: '1px solid #E4E2DC',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '24px',
                textAlign: 'left',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5E6C84' }}>Answered Questions:</span>
                <strong style={{ color: 'var(--accent-green, #15803D)' }}>{answeredCount} of {questions.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5E6C84' }}>Unanswered Questions:</span>
                <strong style={{ color: '#0A1B38' }}>{unansweredCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5E6C84' }}>Marked for Review:</span>
                <strong style={{ color: 'var(--accent-amber, #B45309)' }}>{markedCount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="ecell-btn-secondary"
                style={{ flex: 1 }}
              >
                Return to Exam
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="ecell-btn-primary"
                style={{
                  flex: 1,
                  background: 'var(--accent-green, #15803D)',
                }}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Enforcer Modal */}
      {showFullscreenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 21, 46, 0.96)',
            backdropFilter: 'blur(16px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '38px 34px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '2px solid #0284C7',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EEF4FC',
                color: '#12336B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '1.8rem',
              }}
            >
              🛡️
            </div>

            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '12px',
              }}
            >
              Full-Screen Proctored Mode Required
            </h2>

            <p style={{ color: '#5E6C84', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
              To ensure academic integrity, this recruitment examination must be completed exclusively in full-screen mode. 
              Tab switching, minimizing the window, or using external tools is automatically logged and reported to proctors.
            </p>

            {fullscreenViolations > 0 && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  color: '#991B1B',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '22px',
                }}
              >
                ⚠️ Full-screen exit detected (Incident #{fullscreenViolations}). All events are recorded in your proctor dossier.
              </div>
            )}

            <button
              onClick={enterFullscreen}
              className="ecell-btn-primary"
              style={{
                padding: '15px 32px',
                fontSize: '1rem',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 10px 25px -4px rgba(18, 51, 107, 0.4)',
              }}
            >
              Enter Full Screen &amp; Continue Assessment
            </button>
          </div>
        </div>
      )}

      {/* Proctoring Notification Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0A1B38',
            color: '#FFFFFF',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
            border: '1.5px solid #F59E0B',
            zIndex: 10000,
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '420px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. Official Proctored Examination.
      </footer>
    </div>
  );
}

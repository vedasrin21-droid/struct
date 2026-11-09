'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await fetch(`/api/ecell/attempts/${attemptId}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/ecell/login');
            return;
          }
          throw new Error('Failed to load examination attempt');
        }

        const data = await res.json();
        if (data.isSubmitted) {
          router.push('/ecell/completed');
          return;
        }

        setDepartment(data.department);
        setQuestions(data.questions || []);
        setAnswers(data.savedAnswers || {});
        setRemainingSeconds(data.remainingSeconds);
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
    <div className="ecell-page-wrapper">
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
            {/* Autosave status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94A3B8' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor:
                    saveStatus === 'saved' ? '#10B981' : saveStatus === 'saving' ? '#F59E0B' : '#EF4444',
                }}
              />
              <span style={{ display: 'none', minWidth: '40px' }} className="sm-inline">
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Error'}
              </span>
            </div>

            {/* Countdown Clock */}
            <div
              className={`ecell-timer-box ${
                isTimeDanger
                  ? 'ecell-timer-danger'
                  : isTimeCritical
                  ? 'ecell-timer-warning'
                  : 'ecell-timer-normal'
              }`}
            >
              <span>{timeFormatted}</span>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              style={{
                padding: '9px 18px',
                backgroundColor: 'var(--accent-green, #15803D)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Submit Exam
            </button>
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

              {/* Question Text */}
              <h2
                style={{
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0A1B38',
                  lineHeight: 1.5,
                  margin: '0 0 28px',
                }}
              >
                {currentQ.text}
              </h2>

              {/* 4 Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {currentQ.options.map((optText, optIdx) => {
                  const isSelected = currentAnswer?.selectedOptionIndex === optIdx;
                  const label = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`ecell-mcq-choice ${isSelected ? 'active' : ''}`}
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
                        }}
                      >
                        {optText}
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

        {/* Right Column: Question Palette */}
        <div className="ecell-exam-sidebar">
          <div className="ecell-card-institutional" style={{ padding: '24px 20px' }}>
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: '#8993A4',
                marginBottom: '16px',
              }}
            >
              Question Palette
            </div>

            <div className="ecell-palette-grid" style={{ marginBottom: '20px' }}>
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans?.selectedOptionIndex !== null && ans?.selectedOptionIndex !== undefined;
                const isMarked = ans?.isMarkedForReview || false;
                const isCurrent = idx === currentIndex;

                let stateClass = 'unanswered';
                if (isCurrent) stateClass = 'current';
                else if (isMarked) stateClass = 'marked';
                else if (isAnswered) stateClass = 'answered';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`ecell-palette-btn ${stateClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid #F1F5F9', paddingTop: '16px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#5E6C84' }}>Answered:</span>
                <strong style={{ color: 'var(--accent-green, #15803D)' }}>{answeredCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#5E6C84' }}>Marked for Review:</span>
                <strong style={{ color: 'var(--accent-amber, #B45309)' }}>{markedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#5E6C84' }}>Unanswered:</span>
                <strong style={{ color: '#0A1B38' }}>{unansweredCount}</strong>
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

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. Official Proctored Examination.
      </footer>
    </div>
  );
}

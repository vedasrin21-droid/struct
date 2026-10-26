'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/assess/candidate/exams/${examId}/status`)
      .then(res => res.json())
      .then(resData => {
        if (!resData.hasStarted || resData.status !== 'submitted') {
          router.push(`/assess/candidate`);
          return;
        }
        setData(resData);
      })
      .catch((err: any) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          Loading submission verification...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ padding: '32px', background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <h2 style={{ color: '#991B1B', marginBottom: '8px' }}>Unable to Load Receipt</h2>
          <p style={{ color: '#64748B', marginBottom: '16px' }}>{error || 'No submitted session found'}</p>
          <Link href="/assess/candidate" style={{ padding: '10px 18px', background: '#0A1B38', color: '#FFF', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { exam, attemptId, submittedAt, resultsReleased, score, passStatus, questions, savedAnswers } = data;
  const receiptCode = `TALVYN-${attemptId.toUpperCase()}-${Number(submittedAt).toString(36).toUpperCase()}`;
  const submittedDate = new Date(submittedAt).toLocaleString();

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Header Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '36px',
          boxShadow: '0 10px 30px rgba(10, 27, 56, 0.06)',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          {/* Success Checkmark Badge */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 auto 16px'
          }}>
            &#10003;
          </div>

          <span style={{
            background: '#E0F2FE',
            color: '#0369A1',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Official Submission Receipt
          </span>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0A1B38', margin: '14px 0 6px 0' }}>
            {exam.title}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#64748B', maxWidth: '520px', margin: '0 auto 24px' }}>
            Your assessment answers have been cryptographically timestamped and saved on the central server.
          </p>

          {/* Receipt Code Box */}
          <div style={{
            background: '#F1F5F9',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '4px',
            border: '1px dashed #CBD5E1',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Verification Receipt Code
            </span>
            <code style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '1px' }}>
              {receiptCode}
            </code>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Recorded on {submittedDate}
            </span>
          </div>

          {/* Result Release Banner */}
          {resultsReleased ? (
            <div style={{
              background: passStatus === 'passed' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${passStatus === 'passed' ? '#86EFAC' : '#FCA5A5'}`,
              borderRadius: '14px',
              padding: '24px',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: passStatus === 'passed' ? '#166534' : '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Performance Breakdown Released
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: passStatus === 'passed' ? '#15803D' : '#DC2626' }}>
                {score} <span style={{ fontSize: '1.2rem', color: '#64748B', fontWeight: 600 }}>/ {exam.total_marks}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '6px' }}>
                Status: <strong style={{ textTransform: 'capitalize', color: passStatus === 'passed' ? '#15803D' : '#DC2626' }}>{passStatus}</strong> (Passing threshold: {exam.pass_marks} marks)
              </div>
            </div>
          ) : (
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '14px',
              padding: '20px',
              marginTop: '12px',
              fontSize: '0.88rem',
              color: '#0369A1',
              lineHeight: 1.5
            }}>
              <strong>Results Notice:</strong> Assessment scores and solution explanations are currently withheld pending committee review and release. You will be able to review your detailed results here once published by your administrator.
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '28px' }}>
            <Link
              href="/assess/candidate"
              style={{
                background: '#0A1B38',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              &larr; Back to Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Print / Save Receipt
            </button>
          </div>
        </div>

        {/* Detailed Solutions Review (Only when released and showAnswerKey permitted) */}
        {resultsReleased && data.showAnswerKey !== false && questions && questions.length > 0 && questions[0]?.correctOptionIndex !== undefined ? (
          <div style={{ marginTop: '36px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>
              Question-by-Question Solution Review
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {questions.map((q: any, idx: number) => {
                const userAns = savedAnswers[q.id];
                const selectedOpt = userAns ? userAns.selectedOption : null;
                const isCorrect = selectedOpt === q.correctOptionIndex;
                const isUnanswered = selectedOpt === null || selectedOpt === undefined;

                return (
                  <div
                    key={q.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: `1px solid ${isCorrect ? '#86EFAC' : isUnanswered ? '#CBD5E1' : '#FCA5A5'}`,
                      padding: '24px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0A1B38' }}>
                        Question {idx + 1} ({q.category})
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isCorrect ? '#DCFCE7' : isUnanswered ? '#F1F5F9' : '#FEE2E2',
                        color: isCorrect ? '#15803D' : isUnanswered ? '#64748B' : '#991B1B'
                      }}>
                        {isCorrect ? `Correct (+${q.marks})` : isUnanswered ? 'Unanswered (0.0)' : `Incorrect (-${q.negative_marks})`}
                      </span>
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '16px', lineHeight: 1.5 }}>
                      {q.text}
                    </div>

                    {/* Options Review */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {q.options.map((opt: string, optIdx: number) => {
                        const isThisCorrect = optIdx === q.correctOptionIndex;
                        const isThisSelected = optIdx === selectedOpt;

                        let optBg = '#F8FAFC';
                        let optBorder = '1px solid #E2E8F0';
                        let optColor = '#334155';

                        if (isThisCorrect) {
                          optBg = '#F0FDF4';
                          optBorder = '1px solid #86EFAC';
                          optColor = '#166534';
                        } else if (isThisSelected && !isThisCorrect) {
                          optBg = '#FEF2F2';
                          optBorder = '1px solid #FCA5A5';
                          optColor = '#991B1B';
                        }

                        return (
                          <div
                            key={optIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: optBg,
                              border: optBorder,
                              color: optColor,
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{['A', 'B', 'C', 'D'][optIdx]}. {opt}</span>
                            {isThisCorrect && <strong style={{ fontSize: '0.75rem' }}>&check; Correct Solution</strong>}
                            {isThisSelected && !isThisCorrect && <strong style={{ fontSize: '0.75rem' }}>&cross; Your Selection</strong>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                        <strong>Rationale:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : resultsReleased && data.showAnswerKey === false ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            marginTop: '24px',
            textAlign: 'center',
            color: '#64748B'
          }}>
            <h4 style={{ color: '#0A1B38', marginBottom: '8px', fontSize: '1rem', fontWeight: 700 }}>Answer Key Kept Confidential</h4>
            <p style={{ fontSize: '0.86rem', margin: 0, lineHeight: 1.5 }}>
              The administrator has designated the solution key for this assessment as confidential. Your verified score and ranking above represent the final assessment evaluation.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

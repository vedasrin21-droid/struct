'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

export default function StudentFeedbackPage() {
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);

  const [overallRating, setOverallRating] = useState<number>(5);
  const [navigationRating, setNavigationRating] = useState<number>(5);
  const [questionQualityRating, setQuestionQualityRating] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<string>('moderate');
  const [technicalIssues, setTechnicalIssues] = useState<string>('None');
  const [likedAspects, setLikedAspects] = useState<string>('');
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<string>('Yes');
  const [customQuestionResponse, setCustomQuestionResponse] = useState<string>('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/ecell/me');
        if (res.ok) {
          const data = await res.json();
          setStudent(data.student);
          setExam(data.exam);
          setAttempt(data.attempt);
        }
      } catch {
        // Continue gracefully
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/ecell/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt?.id || '',
          candidateEmail: student?.email || '',
          candidateName: student?.name || '',
          department: attempt?.department || student?.department || '',
          overallRating,
          navigationRating,
          questionQualityRating,
          difficultyLevel,
          technicalIssues,
          likedAspects,
          improvementSuggestions,
          wouldRecommend,
          marketingConsent,
          customQuestionPrompt: exam?.customPostExamQuestion || '',
          customQuestionResponse,
        }),
      });

      const data = await res.json();
      router.push(data.redirectUrl || '/launching-soon');
    } catch {
      router.push('/launching-soon');
    }
  };

  const renderRatingBar = (
    value: number,
    onChange: (val: number) => void,
    label: string
  ) => {
    return (
      <div style={{ marginBottom: '22px' }}>
        <label className="ecell-label">{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = num <= value;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange(num)}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #12336B' : '1.5px solid #E4E2DC',
                  background: isSelected ? '#12336B' : '#FAF9F6',
                  color: isSelected ? '#FFFFFF' : '#0A1B38',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {num}
              </button>
            );
          })}
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#5E6C84', marginLeft: '10px' }}>
            {value === 5 ? 'Excellent' : value === 4 ? 'Good' : value === 3 ? 'Average' : value === 2 ? 'Below Average' : 'Poor'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="ecell-page-wrapper">
      {/* Top Header */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <StructLogo size={36} subtitle="Assessment Suite" />
          </Link>

          <span className="ecell-tag-pill">Candidate Feedback</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-container-wide">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div className="ecell-tag-pill" style={{ marginBottom: '12px' }}>
              <span className="ecell-dot-indicator"></span>
              Post-Exam Evaluation
            </div>
            <h1 className="ecell-heading-hero">Candidate Feedback.</h1>
            <p className="ecell-text-body">
              Your honest feedback helps us engineer an exceptional testing environment. Please take 60 seconds to share your experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="ecell-card-institutional">
            {/* 1. Overall Rating */}
            {renderRatingBar(overallRating, setOverallRating, '1. Overall Examination Experience (1 - 5)')}

            {/* 2. Platform Navigation */}
            {renderRatingBar(navigationRating, setNavigationRating, '2. Platform Interface & Navigation (1 - 5)')}

            {/* 3. Question Quality */}
            {renderRatingBar(questionQualityRating, setQuestionQualityRating, '3. Question Quality & Department Relevance (1 - 5)')}

            {/* 4. Difficulty Level */}
            <div style={{ marginBottom: '22px' }}>
              <label className="ecell-label">4. Perceived Difficulty Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {[
                  { key: 'easy', label: 'Easy' },
                  { key: 'moderate', label: 'Moderate' },
                  { key: 'challenging', label: 'Challenging' },
                  { key: 'very_hard', label: 'Very Hard' },
                ].map((item) => {
                  const isSel = difficultyLevel === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDifficultyLevel(item.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isSel ? '2px solid #0284C7' : '1.5px solid #E4E2DC',
                        background: isSel ? '#EEF4FC' : '#FAF9F6',
                        color: isSel ? '#0A1B38' : '#5E6C84',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Technical Issues */}
            <div style={{ marginBottom: '22px' }}>
              <label className="ecell-label">5. Technical or Proctoring Issues Encountered</label>
              <select
                value={technicalIssues}
                onChange={(e) => setTechnicalIssues(e.target.value)}
                className="ecell-input-text"
              >
                <option value="None">None — Smooth experience throughout</option>
                <option value="Minor Lag">Minor lag while saving answers</option>
                <option value="Connection Drop">Temporary internet disconnection</option>
                <option value="Formatting Issue">Question text or formatting anomaly</option>
                <option value="Other">Other technical problem</option>
              </select>
            </div>

            {/* 6. What did you like most? */}
            <div style={{ marginBottom: '22px' }}>
              <label className="ecell-label">6. What did you like most about the platform? (Optional)</label>
              <textarea
                value={likedAspects}
                onChange={(e) => setLikedAspects(e.target.value)}
                placeholder="e.g. Clean interface, responsive timer, clear questions..."
                rows={3}
                className="ecell-input-text"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* 7. Suggestions */}
            <div style={{ marginBottom: '22px' }}>
              <label className="ecell-label">7. Suggestions for Improvement (Optional)</label>
              <textarea
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder="How could we make the candidate assessment experience even better?"
                rows={3}
                className="ecell-input-text"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* 8. Custom Admin Question (if any) */}
            {exam?.customPostExamQuestion && (
              <div style={{ marginBottom: '22px' }}>
                <label className="ecell-label">{exam.customPostExamQuestion}</label>
                <textarea
                  value={customQuestionResponse}
                  onChange={(e) => setCustomQuestionResponse(e.target.value)}
                  placeholder="Your answer to the coordinator's question..."
                  rows={3}
                  className="ecell-input-text"
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            {/* 9. Would recommend */}
            <div style={{ marginBottom: '24px' }}>
              <label className="ecell-label">8. Would you recommend STRUCT Assessments to fellow students?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['Yes', 'Maybe', 'No'].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setWouldRecommend(choice)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: wouldRecommend === choice ? '2px solid #12336B' : '1.5px solid #E4E2DC',
                      background: wouldRecommend === choice ? '#12336B' : '#FAF9F6',
                      color: wouldRecommend === choice ? '#FFFFFF' : '#0A1B38',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>

            {/* 10. Waitlist Priority Opt-in */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#EEF4FC',
                border: '1px solid #DCE6F5',
                marginBottom: '28px',
                cursor: 'pointer',
              }}
              onClick={() => setMarketingConsent(!marketingConsent)}
            >
              <input
                type="checkbox"
                id="waitlistConsent"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  accentColor: '#12336B',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="waitlistConsent"
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#12336B',
                  cursor: 'pointer',
                  lineHeight: 1.5,
                }}
              >
                Reserve my spot on the STRUCT platform priority launch waitlist (Full launch on 16 November 2026).
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="ecell-btn-primary"
              style={{ padding: '16px 24px', fontSize: '1.02rem' }}
            >
              <span>{submitting ? 'Submitting Feedback...' : 'Submit Feedback & Explore STRUCT'}</span>
              {!submitting && <span>&rarr;</span>}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. Candidate Feedback System.
      </footer>
    </div>
  );
}

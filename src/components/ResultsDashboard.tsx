'use client';

import React, { useState } from 'react';
import { AnalysisResult } from '@/types';
import { UpgradeAiModal } from '@/components/UpgradeAiModal';

interface ResultsDashboardProps {
  result: AnalysisResult;
  onReset: () => void;
  onEditInBuilder?: () => void;
}

export function ResultsDashboard({ result, onReset, onEditInBuilder }: ResultsDashboardProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBulletId, setCopiedBulletId] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopyBullet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletId(id);
    setTimeout(() => setCopiedBulletId(null), 2500);
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--accent-green)';
    if (score >= 70) return 'var(--brand-primary)';
    if (score >= 55) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  // Circumference for radial progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.overallScore / 100) * circumference;

  return (
    <section
      id="results-section"
      className="results-section"
      style={{
        padding: '40px 0 80px 0',
      }}
    >
      <div className="container" style={{ maxWidth: '1040px' }}>
        {/* Printable Header (Visible only when printed) */}
        <div className="print-header" style={{ display: 'none' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#12336B', marginBottom: '4px' }}>
            STRUCT — Resume Diagnostic Report
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#5E6C84' }}>
            Document: {result.fileName} • Generated on {new Date(result.timestamp).toLocaleDateString()} • Overall Score: {result.overallScore}/100 ({result.overallVerdict})
          </p>
        </div>

        {/* Top Control Bar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              className="pill"
              style={{
                background: result.isAiEnhanced ? 'var(--brand-soft-blue)' : '#F3F4F6',
                color: result.isAiEnhanced ? 'var(--brand-primary)' : 'var(--brand-text-muted)',
                border: '1px solid var(--brand-border)',
                fontWeight: 700,
              }}
            >
              {result.isAiEnhanced ? '✨ ' : '⚙️ '}
              Analysis Mode: {result.aiProviderLabel}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--brand-text-muted)' }}>
              Document: <strong style={{ color: 'var(--brand-dark)' }}>{result.fileName}</strong> ({result.wordCount} words)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {onEditInBuilder && (
              <button
                onClick={onEditInBuilder}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #12336B 0%, #1D4ED8 100%)',
                  fontWeight: 700,
                  boxShadow: 'var(--clay-button-primary)',
                }}
              >
                <span>Edit in Resume Builder</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
              title="Print report or save as PDF"
            >
              <span>Print / Save Report</span>
            </button>
            <button
              onClick={onReset}
              className="btn btn-secondary btn-sm"
            >
              <span>Analyze Another</span>
            </button>
          </div>
        </div>

        {/* AI Enhancement & Entitlement Status Banner */}
        <div className="no-print" style={{ marginBottom: '24px' }}>
          {!result.isAiEnhanced ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #12336B 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                borderRadius: '20px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 10px 25px -5px rgba(18, 51, 107, 0.25)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                    ⚙️ Free Deterministic Diagnostic Active
                  </span>
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    Free Tier
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', opacity: 0.92, lineHeight: 1.4 }}>
                  Upgrade to Executive AI Polish for <strong>₹49</strong> (Includes 2 Usages). Unlock Google X-Y-Z metric bullet rewrites and tailored executive summaries.
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="btn btn-sm"
                style={{
                  background: '#FFFFFF',
                  color: '#12336B',
                  fontWeight: 800,
                  borderRadius: '12px',
                  padding: '10px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                ✨ Unlock AI Polish (₹49)
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#F0FDF4',
                color: '#166534',
                border: '1.5px solid #BBF7D0',
                borderRadius: '18px',
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span>
                <div>
                  <strong style={{ fontSize: '0.92rem' }}>AI Enhancement Active</strong>
                  <span style={{ marginLeft: '8px', fontSize: '0.82rem', color: '#15803D' }}>
                    ({result.entitlement?.remainingUsages !== undefined ? `${result.entitlement.remainingUsages} AI Usages Remaining` : 'Verified'})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', borderRadius: '10px' }}
              >
                + Top Up Credits (₹49)
              </button>
            </div>
          )}
        </div>

        {/* Upgrade AI Modal */}
        <UpgradeAiModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          defaultEmail={result.contactInfo?.detectedEmail || ''}
        />

        {/* Executive ATS Diagnostic Verdict Banner */}
        <div

          className="colour-morph-card"
          style={{
            padding: '20px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF4FC 100%)',
            border: '1.5px solid rgba(220, 230, 245, 0.95)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: result.overallScore >= 80 ? '#15803D' : '#12336B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(18, 51, 107, 0.2)',
            }}
          >
            {result.overallScore >= 80 ? '✓' : '⚡'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="tech-tag" style={{ background: '#12336B', color: '#FFFFFF' }}>
                ATS DIAGNOSTIC VERDICT
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                {result.overallScore >= 80 ? 'APPLICATION READY &bull; HIGH INTERVIEW LIKELIHOOD' : 'TARGETED OPTIMIZATIONS IDENTIFIED'}
              </span>
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--brand-dark)', fontWeight: 600, lineHeight: 1.5 }}>
              {result.overallScore >= 80
                ? 'Resume demonstrates strong quantifiable achievements. Review target keyword matches below to maximize recruiter screening passes.'
                : 'Deterministic parsing has identified high-leverage opportunities to elevate your bullet points with measurable metrics and address competency gaps.'}
            </div>
          </div>
        </div>

        {/* 1. Executive Summary & Overall Score Card */}
        <div
          className="colour-morph-card"
          style={{
            padding: '36px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '28px',
            }}
          >
            {/* Left: Overall Score Radial Dial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="score-circle-container">
                <svg className="score-circle-svg" viewBox="0 0 140 140">
                  <circle
                    className="score-circle-bg"
                    cx="70"
                    cy="70"
                    r={radius}
                  />
                  <circle
                    className="score-circle-fill"
                    cx="70"
                    cy="70"
                    r={radius}
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: strokeDashoffset,
                      stroke: getScoreColor(result.overallScore),
                    }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: 'var(--brand-dark)',
                      lineHeight: 1,
                    }}
                  >
                    {result.overallScore}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--brand-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    out of 100
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--brand-text-muted)', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  Overall Assessment
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: getScoreColor(result.overallScore),
                    marginBottom: '8px',
                    lineHeight: 1.2,
                  }}
                >
                  {result.overallVerdict}
                </h3>
                <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.92rem', maxWidth: '440px' }}>
                  {result.targetJobTitle ? (
                    <>Target Role: <strong style={{ color: 'var(--brand-dark)' }}>{result.targetJobTitle}</strong> • Level: <strong style={{ textTransform: 'capitalize', color: 'var(--brand-dark)' }}>{result.experienceLevel}</strong></>
                  ) : (
                    <>Standard Industry Benchmark • Level: <strong style={{ textTransform: 'capitalize', color: 'var(--brand-dark)' }}>{result.experienceLevel}</strong></>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Metrics Badge Group */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div className="clay-inset" style={{ padding: '14px 18px', textAlign: 'center', minWidth: '100px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                  {result.wordCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  Words
                </div>
              </div>
              <div className="clay-inset" style={{ padding: '14px 18px', textAlign: 'center', minWidth: '100px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                  {result.readingTimeMinutes} min
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  Read Time
                </div>
              </div>
              <div className="clay-inset" style={{ padding: '14px 18px', textAlign: 'center', minWidth: '100px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                  {result.bulletSuggestions.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  Bullet Fixes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Four Score Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '18px',
            marginBottom: '32px',
          }}
        >
          {/* ATS Readability */}
          <div className="clay-card-static" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                {result.scores.atsReadability.label}
              </span>
              <span className="pill" style={{
                background: result.scores.atsReadability.score >= 80 ? 'var(--accent-green-bg)' : 'var(--accent-amber-bg)',
                color: result.scores.atsReadability.score >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)',
                fontSize: '0.72rem',
                padding: '2px 8px',
              }}>
                {result.scores.atsReadability.score} / 100
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)', marginBottom: '8px' }}>
              Weight: 30% &bull; Machine Parsing
            </div>
            <div className="progress-track" style={{ height: '8px', marginBottom: '10px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${result.scores.atsReadability.score}%`,
                  background: getScoreColor(result.scores.atsReadability.score),
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)', lineHeight: 1.4, margin: 0 }}>
              {result.scores.atsReadability.description}
            </p>
          </div>

          {/* Content Quality */}
          <div className="clay-card-static" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                {result.scores.contentQuality.label}
              </span>
              <span className="pill" style={{
                background: result.scores.contentQuality.score >= 80 ? 'var(--accent-green-bg)' : 'var(--accent-amber-bg)',
                color: result.scores.contentQuality.score >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)',
                fontSize: '0.72rem',
                padding: '2px 8px',
              }}>
                {result.scores.contentQuality.score} / 100
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)', marginBottom: '8px' }}>
              Weight: 35% &bull; Action Verbs &amp; Metrics
            </div>
            <div className="progress-track" style={{ height: '8px', marginBottom: '10px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${result.scores.contentQuality.score}%`,
                  background: getScoreColor(result.scores.contentQuality.score),
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)', lineHeight: 1.4, margin: 0 }}>
              {result.scores.contentQuality.description}
            </p>
          </div>

          {/* Job Match Score */}
          <div className="clay-card-static" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                {result.scores.jobMatch.label}
              </span>
              <span className="pill" style={{
                background: result.scores.jobMatch.score >= 80 ? 'var(--accent-green-bg)' : 'var(--brand-soft-blue)',
                color: result.scores.jobMatch.score >= 80 ? 'var(--accent-green)' : 'var(--brand-primary)',
                fontSize: '0.72rem',
                padding: '2px 8px',
              }}>
                {result.scores.jobMatch.score} / 100
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)', marginBottom: '8px' }}>
              Weight: 25% &bull; {result.hasJobDescription ? '1-to-1 Target Match' : 'Domain Benchmark'}
            </div>
            <div className="progress-track" style={{ height: '8px', marginBottom: '10px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${result.scores.jobMatch.score}%`,
                  background: getScoreColor(result.scores.jobMatch.score),
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)', lineHeight: 1.4, margin: 0 }}>
              {result.scores.jobMatch.description}
            </p>
          </div>

          {/* Completeness Score */}
          <div className="clay-card-static" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                {result.scores.completeness.label}
              </span>
              <span className="pill" style={{
                background: result.scores.completeness.score >= 80 ? 'var(--accent-green-bg)' : 'var(--accent-amber-bg)',
                color: result.scores.completeness.score >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)',
                fontSize: '0.72rem',
                padding: '2px 8px',
              }}>
                {result.scores.completeness.score} / 100
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)', marginBottom: '8px' }}>
              Weight: 10% &bull; Sections &amp; Contact
            </div>
            <div className="progress-track" style={{ height: '8px', marginBottom: '10px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${result.scores.completeness.score}%`,
                  background: getScoreColor(result.scores.completeness.score),
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)', lineHeight: 1.4, margin: 0 }}>
              {result.scores.completeness.description}
            </p>
          </div>
        </div>

        {/* Evaluation Methodology & Transparency Notice Card */}
        <div
          className="clay-card-static"
          style={{
            padding: '24px 28px',
            marginBottom: '32px',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
            border: '1px solid #CBD5E1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚖️</span>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
              Scoring Methodology &amp; Transparency Notice
            </h4>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--brand-text)', lineHeight: 1.5, marginBottom: '10px' }}>
            {result.scoringBreakdown?.disclaimer ||
              'STRUCT evaluates measurable structural and semantic resume criteria using deterministic benchmarks. It does not replicate proprietary employer ATS algorithms or predict hiring decisions with certainty.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.78rem', color: 'var(--brand-text-muted)' }}>
            <div>
              <strong>ATS Readability (30%):</strong> Headers, standard contact fields, word count density, and single-column machine parsing.
            </div>
            <div>
              <strong>Content &amp; Impact (35%):</strong> Google X-Y-Z formula, active vs passive voice density, and quantified business outcomes.
            </div>
            <div>
              <strong>Role Alignment (25%):</strong> Keyword overlap against target job description or industry benchmark competencies.
            </div>
            <div>
              <strong>Completeness (10%):</strong> Verification of standard sections (Summary, Experience, Education, Skills, Projects, Certs).
            </div>
          </div>
        </div>

        {/* 3. Keyword Match & Gap Analysis Card */}
        <div className="clay-card-static" style={{ padding: '30px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                Keyword &amp; Competency Alignment
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--brand-text-muted)' }}>
                {result.hasJobDescription
                  ? 'Comparison of your resume vocabulary against terms in the target job description.'
                  : 'Key industry competencies detected in your resume. (Add a job description above to calculate 1-to-1 match gaps).'}
              </p>
            </div>
            <div className="pill pill-primary" style={{ fontSize: '0.82rem' }}>
              {result.keywords.matchedKeywords.length} Detected Skills
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Matched Keywords */}
            <div className="clay-inset" style={{ padding: '18px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-green)' }}>
                  Matched In Your Resume ({result.keywords.matchedKeywords.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.keywords.matchedKeywords.length > 0 ? (
                  result.keywords.matchedKeywords.map((kw, i) => (
                    <span key={i} className="pill pill-success" style={{ fontSize: '0.78rem' }}>
                      ✓ {kw}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--brand-text-muted)' }}>
                    No standard technical or industry keywords were detected.
                  </span>
                )}
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="clay-inset" style={{ padding: '18px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-amber)' }}>
                  Missing Target Keywords ({result.hasJobDescription ? result.keywords.missingKeywords.length : 'N/A'})
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.keywords.missingKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="pill pill-warning"
                    style={{
                      fontSize: '0.78rem',
                      lineHeight: 1.3,
                      maxWidth: result.hasJobDescription ? 'auto' : '100%',
                    }}
                  >
                    {result.hasJobDescription ? `+ ${kw}` : kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Missing Keywords Interpretation Note */}
          <div
            style={{
              marginTop: '18px',
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: '10px',
              borderLeft: '4px solid #3B82F6',
              fontSize: '0.82rem',
              color: 'var(--brand-text)',
              lineHeight: 1.5,
            }}
          >
            📌 <strong>Evidence Interpretation Note:</strong> Missing keywords reflect requirements requested in the target job description that were not detected in your resume text. Missing mentions are treated as <em>undocumented in writing</em>, not proof that you lack the skill. You can seamlessly add or verify your real experience for these skills in the Resume Builder.
          </div>
        </div>

        {/* 4. Prioritized Improvements Card */}
        <div className="clay-card-static" style={{ padding: '30px', marginBottom: '32px' }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '8px' }}>
            Prioritized Action Checklist
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--brand-text-muted)', marginBottom: '20px' }}>
            Ranked by impact on recruiter shortlisting and ATS screening algorithms.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {result.prioritizedImprovements.map((fix) => (
              <div
                key={fix.id}
                className="clay-inset"
                style={{
                  padding: '18px 22px',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span
                      className="pill"
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        background: fix.priority === 'high' ? 'var(--accent-red-bg)' : fix.priority === 'medium' ? 'var(--accent-amber-bg)' : 'var(--brand-soft-blue)',
                        color: fix.priority === 'high' ? 'var(--accent-red)' : fix.priority === 'medium' ? 'var(--accent-amber)' : 'var(--brand-primary)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {fix.priority === 'high' ? 'High Priority' : fix.priority === 'medium' ? 'Medium Priority' : 'Quick Win'}
                    </span>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--brand-dark)' }}>
                      {fix.title}
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--brand-text-muted)', lineHeight: 1.5 }}>
                    {fix.explanation}
                  </p>
                </div>

                <div
                  style={{
                    background: 'var(--brand-card-subtle)',
                    border: '1px solid var(--brand-border)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--accent-green)',
                    alignSelf: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fix.expectedImpact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Before-and-After Bullet Suggestions */}
        <div className="clay-card-static" style={{ padding: '30px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                Before &amp; After Bullet Point Rewrites
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--brand-text-muted)' }}>
                Directly grounded in your supplied resume experience. Upgraded with quantifiable metrics and active verbs.
              </p>
            </div>
            <span className="pill pill-primary" style={{ fontSize: '0.75rem' }}>
              Google X-Y-Z Formula
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {result.bulletSuggestions.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--brand-card-subtle)',
                  borderRadius: '16px',
                  border: '1px solid var(--brand-border)',
                  padding: '20px',
                  boxShadow: 'var(--clay-inset)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-text-muted)' }}>
                    Work Statement #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleCopyBullet(item.id, item.improved)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    {copiedBulletId === item.id ? '✓ Copied!' : 'Copy Upgraded Bullet'}
                  </button>
                </div>

                {/* Original Bullet */}
                <div
                  style={{
                    background: '#FDF2F2',
                    borderLeft: '4px solid #DC2626',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#991B1B', marginBottom: '2px' }}>
                    Original Resume Bullet:
                  </span>
                  <p style={{ fontSize: '0.88rem', color: '#7F1D1D', fontStyle: 'italic', margin: 0 }}>
                    &ldquo;{item.original}&rdquo;
                  </p>
                </div>

                {/* Upgraded Bullet */}
                <div
                  style={{
                    background: '#F0FDF4',
                    borderLeft: '4px solid #16A34A',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>
                    Upgraded High-Impact Bullet:
                  </span>
                  <p style={{ fontSize: '0.92rem', color: '#14532D', fontWeight: 600, margin: 0 }}>
                    &ldquo;{item.improved}&rdquo;
                  </p>
                </div>

                {/* Rationale */}
                <p style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                  💡 <strong>Coach Rationale:</strong> {item.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Suggested Executive Summary */}
        {result.summarySuggestion && (
          <div className="clay-card-static" style={{ padding: '30px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                  Tailored Professional Summary Rewrite
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--brand-text-muted)' }}>
                  {result.summarySuggestion.advice}
                </p>
              </div>
              <button
                onClick={() => handleCopySummary(result.summarySuggestion?.suggestedSummary || '')}
                className="btn btn-secondary btn-sm"
              >
                {copiedSummary ? '✓ Copied to Clipboard!' : 'Copy Summary'}
              </button>
            </div>

            <div
              className="clay-inset"
              style={{
                padding: '20px',
                background: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--brand-dark)',
                fontStyle: 'italic',
                borderLeft: '4px solid var(--brand-primary)',
              }}
            >
              &ldquo;{result.summarySuggestion.suggestedSummary}&rdquo;
            </div>
          </div>
        )}

        {/* 7. ATS Formatting & Structure Checklist */}
        <div className="clay-card-static" style={{ padding: '30px', marginBottom: '32px' }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '16px' }}>
            Formatting &amp; Technical Parser Findings
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {result.formattingChecks.map((chk, i) => (
              <div
                key={i}
                className="clay-inset"
                style={{
                  padding: '14px 18px',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                  {chk.status === 'pass' ? '✅' : chk.status === 'warning' ? '⚠️' : '❌'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--brand-dark)' }}>
                    {chk.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', lineHeight: 1.4 }}>
                    {chk.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            paddingTop: '20px',
          }}
        >
          {onEditInBuilder && (
            <button
              onClick={onEditInBuilder}
              className="btn btn-primary btn-lg"
              style={{
                background: 'linear-gradient(135deg, #12336B 0%, #1D4ED8 100%)',
                boxShadow: 'var(--clay-button-primary)',
              }}
            >
              <span>Edit &amp; Polish in Resume Builder</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="btn btn-secondary btn-lg"
          >
            <span>Print / Save PDF Report</span>
          </button>
          <button
            onClick={onReset}
            className="btn btn-secondary btn-lg"
          >
            <span>Analyze Another Resume</span>
          </button>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';

interface HeroProps {
  onCheckResumeClick: () => void;
  onSeeHowItWorksClick: () => void;
  onOpenBuilderClick?: () => void;
}

export function Hero({ onCheckResumeClick, onSeeHowItWorksClick, onOpenBuilderClick }: HeroProps) {
  return (
    <section
      className="hero-section"
      style={{
        paddingTop: '64px',
        paddingBottom: '80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        {/* Trust Label Pill */}
        <div style={{ display: 'inline-flex', marginBottom: '24px' }}>
          <div
            className="pill pill-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.86rem',
              letterSpacing: '0.3px',
              border: '1px solid rgba(18, 51, 107, 0.15)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#15803D',
                boxShadow: '0 0 0 3px rgba(21, 128, 61, 0.2)',
                display: 'inline-block',
              }}
            />
            <span>AI-powered resume insights</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
            color: 'var(--brand-dark)',
            maxWidth: '860px',
            margin: '0 auto 20px auto',
          }}
        >
          Land More Opportunities With a Smarter Resume
        </h1>

        {/* Supporting Text */}
        <p
          style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: 'var(--brand-text-muted)',
            maxWidth: '680px',
            margin: '0 auto 36px auto',
            lineHeight: 1.6,
          }}
        >
          Understand your resume&apos;s strengths, uncover job-specific skill gaps, and get practical suggestions to improve your next application.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '64px',
          }}
        >
          <button
            onClick={onCheckResumeClick}
            className="btn btn-primary btn-lg"
          >
            <span>Check My Resume</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
          {onOpenBuilderClick && (
            <button
              onClick={onOpenBuilderClick}
              className="btn btn-secondary btn-lg"
            >
              <span>Build from Scratch</span>
            </button>
          )}
          <button
            onClick={onSeeHowItWorksClick}
            className="btn btn-soft btn-lg"
          >
            <span>See How It Works</span>
          </button>
        </div>

        {/* Overlapping Realistic Sample Resume Analysis Preview */}
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Sample Label Banner */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0A1B38',
              color: '#FFFFFF',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: '-16px',
              position: 'relative',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(10, 27, 56, 0.25)',
            }}
          >
            <span style={{ color: '#DCE6F5' }}>✨</span>
            <span>SAMPLE PREVIEW — Realistic Demonstration (Upload below for your live analysis)</span>
          </div>

          {/* Claymorphism Preview Card Container */}
          <div
            className="clay-card-static"
            style={{
              padding: '36px 32px',
              textAlign: 'left',
              border: '1.5px solid rgba(220, 230, 245, 0.8)',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF9F6 100%)',
            }}
          >
            {/* Top Sample Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                borderBottom: '1px solid var(--brand-border)',
                paddingBottom: '24px',
                marginBottom: '28px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '1.45rem',
                      fontWeight: 700,
                      color: 'var(--brand-dark)',
                    }}
                  >
                    Sarah Jenkins
                  </h3>
                  <span className="pill pill-primary" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                    Mid-Senior Level
                  </span>
                </div>
                <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.95rem' }}>
                  Target Role: <strong style={{ color: 'var(--brand-dark)' }}>Senior Product Designer &amp; Design Systems Lead</strong>
                </p>
              </div>

              {/* Sample Overall Score Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: 'var(--brand-soft-blue-light)',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  border: '1px solid var(--brand-soft-blue)',
                  boxShadow: 'var(--clay-pill)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.35rem',
                    boxShadow: '0 4px 10px rgba(18, 51, 107, 0.3)',
                  }}
                >
                  88
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--brand-text-muted)', letterSpacing: '0.5px' }}>
                    Resume Score
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.95rem' }}>
                    Strong Candidate
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown 4-Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              {[
                { title: 'ATS Readability', score: 92, label: 'Excellent', color: 'var(--accent-green)' },
                { title: 'Content Impact', score: 86, label: 'Strong', color: 'var(--brand-primary)' },
                { title: 'Job Description Match', score: 84, label: 'Good Match', color: 'var(--brand-primary)' },
                { title: 'Completeness', score: 95, label: 'Comprehensive', color: 'var(--accent-green)' },
              ].map((cat, i) => (
                <div
                  key={i}
                  className="clay-inset"
                  style={{
                    padding: '16px',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-text)' }}>
                      {cat.title}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: cat.color }}>
                      {cat.score}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: '7px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${cat.score}%`, background: cat.color }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-text-muted)', marginTop: '6px' }}>
                    Status: <strong style={{ color: cat.color }}>{cat.label}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Sample Keyword Analysis & Bullet Fix Preview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Keywords */}
              <div
                style={{
                  background: 'var(--brand-card)',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid var(--brand-border)',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '12px' }}>
                  Target Keyword Gap Analysis
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '6px' }}>
                    ✓ Matched in Resume:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Figma', 'Design Systems', 'User Research', 'Agile', 'Prototyping'].map(k => (
                      <span key={k} className="pill pill-success" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '6px' }}>
                    ⚠ Missing from Resume:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['A/B Testing', 'WCAG Accessibility', 'Analytics'].map(k => (
                      <span key={k} className="pill pill-warning" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                        + {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Grounded Bullet Rewrite */}
              <div
                style={{
                  background: 'var(--brand-card)',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid var(--brand-border)',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '10px' }}>
                  Sample Before &amp; After Bullet Fix
                </div>
                <div
                  style={{
                    background: '#FDF2F2',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#991B1B',
                    marginBottom: '8px',
                    borderLeft: '3px solid #DC2626',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Before (Weak):</strong>
                  &ldquo;Responsible for designing components for the new design system.&rdquo;
                </div>
                <div
                  style={{
                    background: '#F0FDF4',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    borderLeft: '3px solid #16A34A',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>After (TALVYN Upgraded):</strong>
                  &ldquo;Architected 45+ accessible UI components across Figma and React, accelerating design-to-production velocity by 34%.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
      {/* Background Architectural Geometry & Colourmorphic Ambient Shapes */}
      <div className="ambient-grid" />
      <div className="ambient-orb-primary" style={{ top: '-140px', left: '-120px' }} />
      <div className="ambient-orb-secondary" style={{ top: '80px', right: '-120px' }} />
      
      {/* Decorative Geometric Facets */}
      <div
        className="geo-facet"
        style={{
          width: '160px',
          height: '160px',
          top: '90px',
          left: '4%',
          transform: 'rotate(-12deg)',
          opacity: 0.6,
        }}
      />
      <div
        className="geo-facet"
        style={{
          width: '180px',
          height: '180px',
          top: '220px',
          right: '3%',
          transform: 'rotate(15deg)',
          opacity: 0.5,
        }}
      />

      <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Status Pill */}
        <div style={{ display: 'inline-flex', marginBottom: '22px' }}>
          <div
            className="pill pill-primary"
            style={{
              padding: '8px 20px',
              fontSize: '0.82rem',
              letterSpacing: '0.6px',
              border: '1px solid rgba(18, 51, 107, 0.15)',
              textTransform: 'uppercase',
            }}
          >
            <span className="status-pip" style={{ color: '#15803D' }} />
            <span>Deterministic ATS Diagnostic Platform</span>
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
            maxWidth: '880px',
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
            maxWidth: '690px',
            margin: '0 auto 36px auto',
            lineHeight: 1.6,
          }}
        >
          Understand your resume&apos;s technical strengths, uncover job-specific competency gaps, and get high-impact rewrites with our deterministic ATS diagnostic engine.
        </p>

        {/* Action CTAs (Clean Typography, No generic icons) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          <button
            onClick={onCheckResumeClick}
            className="btn btn-primary btn-lg"
          >
            Check My Resume
          </button>
          {onOpenBuilderClick && (
            <button
              onClick={onOpenBuilderClick}
              className="btn btn-secondary btn-lg"
            >
              Build from Scratch
            </button>
          )}
          <button
            onClick={onSeeHowItWorksClick}
            className="btn btn-soft btn-lg"
          >
            How It Works
          </button>
        </div>

        {/* ========================================================
            ENTERPRISE ATS DIAGNOSTIC & BUILDER SPOTLIGHT
            ======================================================== */}
        <div
          className="colour-morph-card"
          style={{
            maxWidth: '1000px',
            margin: '0 auto 48px auto',
            padding: '32px 36px',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(18, 51, 107, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="tech-tag" style={{ background: '#12336B', color: '#FFFFFF' }}>
              STRUCT PLATFORM
            </span>
            <span className="tech-tag">
              ENTERPRISE ATS ENGINE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '1px solid var(--brand-border)',
                boxShadow: 'var(--clay-card-flat)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.6px', marginBottom: '6px' }}>
                01 / DETERMINISTIC ATS DIAGNOSTIC
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-dark)', marginBottom: '6px' }}>
                Industry-Standard Parser Test
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--brand-text-muted)', lineHeight: 1.5 }}>
                Evaluates section structure, font parser safety, file layout, and keyword resonance against Workday, Taleo, and Greenhouse benchmarks.
              </div>
            </div>

            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '1px solid var(--brand-border)',
                boxShadow: 'var(--clay-card-flat)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.6px', marginBottom: '6px' }}>
                02 / GOOGLE X-Y-Z IMPACT ANALYZER
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-dark)', marginBottom: '6px' }}>
                Actionable Metric Rewrites
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--brand-text-muted)', lineHeight: 1.5 }}>
                Upgrades passive duty phrases into recruiter-grade accomplishment statements formatted as &ldquo;Accomplished [X] as measured by [Y] by doing [Z]&rdquo;.
              </div>
            </div>

            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '1px solid var(--brand-border)',
                boxShadow: 'var(--clay-card-flat)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.6px', marginBottom: '6px' }}>
                03 / RESUME BUILDER &amp; EXPORT
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-dark)', marginBottom: '6px' }}>
                Selectable ATS PDF Generation
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--brand-text-muted)', lineHeight: 1.5 }}>
                Live two-column editor with zero-margin font rendering, verified data grounding, and instant PDF download preserving exact parser readability.
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SAMPLE PREVIEW CARD — REALISTIC ATS REPORT DEMO
            ======================================================== */}
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
              gap: '10px',
              background: '#0A1B38',
              color: '#FFFFFF',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '-16px',
              position: 'relative',
              zIndex: 10,
              boxShadow: '0 4px 14px rgba(10, 27, 56, 0.25)',
            }}
          >
            <span className="status-pip" style={{ color: '#DCE6F5' }} />
            <span>SAMPLE DIAGNOSTIC PREVIEW &bull; LIVE BENCHMARK DEMONSTRATION</span>
          </div>

          {/* Colourmorphism Preview Card Container */}
          <div
            className="colour-morph-card"
            style={{
              padding: '36px 32px',
              textAlign: 'left',
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
                  <span className="tech-tag">
                    MID-SENIOR
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
                    ATS Score
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
                { code: '01 / FORMAT', title: 'ATS Readability', score: 92, label: 'Excellent', color: 'var(--accent-green)' },
                { code: '02 / IMPACT', title: 'Content Impact', score: 86, label: 'Strong', color: 'var(--brand-primary)' },
                { code: '03 / KEYWORDS', title: 'Job Description Match', score: 84, label: 'Good Match', color: 'var(--brand-primary)' },
                { code: '04 / SECTIONS', title: 'Completeness', score: 95, label: 'Comprehensive', color: 'var(--accent-green)' },
              ].map((cat, i) => (
                <div
                  key={i}
                  className="clay-inset"
                  style={{
                    padding: '16px',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--brand-text-light)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {cat.code}
                  </div>
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

            {/* Keyword Analysis & Bullet Fix Preview */}
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
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    [ MATCHED COMPETENCIES ]
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Figma', 'Design Systems', 'User Research', 'Agile', 'Prototyping'].map((k) => (
                      <span key={k} className="pill pill-success" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    [ MISSING KEYWORD OPPORTUNITIES ]
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['A/B Testing', 'WCAG Accessibility', 'Analytics'].map((k) => (
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
                  Grounded Before &amp; After Bullet Fix
                </div>
                <div
                  style={{
                    background: '#FDF2F2',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#991B1B',
                    marginBottom: '8px',
                    borderLeft: '3px solid #DC2626',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    BEFORE (WEAK / PASSIVE):
                  </strong>
                  &ldquo;Responsible for designing components for the new design system.&rdquo;
                </div>
                <div
                  style={{
                    background: '#F0FDF4',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    borderLeft: '3px solid #16A34A',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    AFTER (TALVYN X-Y-Z UPGRADE):
                  </strong>
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

'use client';

import React from 'react';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Upload Your Resume',
      desc: 'Drop in your PDF, Word document (.docx), or paste raw text. Set your experience level and target job role for tailored precision.',
      badge: 'Step 1',
    },
    {
      num: '02',
      title: 'Analyze Your Skills',
      desc: 'Our deterministic parser tests ATS readability, cross-references 100+ industry competencies, and simulates automated recruiter filtering.',
      badge: 'Step 2',
    },
    {
      num: '03',
      title: 'Improve Your Resume',
      desc: 'Receive immediate before-and-after bullet rewrites with quantifiable metrics, targeted keyword gap additions, and a polished executive summary.',
      badge: 'Step 3',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="how-it-works-section"
      style={{
        padding: '80px 0',
        background: 'var(--brand-card-subtle)',
        borderTop: '1px solid var(--brand-border)',
        borderBottom: '1px solid var(--brand-border)',
      }}
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="pill pill-primary" style={{ marginBottom: '14px' }}>
            <span>Three Simple Steps</span>
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--brand-dark)',
              letterSpacing: '-1px',
              marginBottom: '12px',
            }}
          >
            How TALVYN Optimizes Your Application
          </h2>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            From raw document to recruiter-ready diagnostic report in under 10 seconds.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="clay-card"
              style={{
                padding: '36px 28px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '2.4rem',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      opacity: 0.85,
                      lineHeight: 1,
                    }}
                  >
                    {step.num}
                  </span>
                  <span className="pill pill-primary" style={{ fontSize: '0.75rem' }}>
                    {step.badge}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--brand-dark)',
                    marginBottom: '10px',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--brand-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--brand-primary)',
                  fontWeight: 600,
                }}
              >
                <span>Instant automated execution</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

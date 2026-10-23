'use client';

import React from 'react';

export function Features() {
  const featureList = [
    {
      title: 'Resume Score',
      icon: '📊',
      desc: 'Get an objective 0–100 composite evaluation calculated across ATS parser compatibility, quantifiable impact, and completeness.',
      highlights: ['Transparent scoring formula', 'Benchmark against experience levels', 'Pinpoint exact weakness areas'],
    },
    {
      title: 'ATS Readability',
      icon: '🤖',
      desc: 'Simulate how leading applicant tracking systems (Greenhouse, Lever, Workday) parse your headers, dates, and contact credentials.',
      highlights: ['Format barrier detection', 'Contact field extraction test', 'Standard section verification'],
    },
    {
      title: 'Job Description Matching',
      icon: '🎯',
      desc: 'Paste any target job description to reveal a side-by-side keyword match rate and specific high-value missing competencies.',
      highlights: ['1-to-1 keyword gap list', 'Domain skill weighting', 'Avoid keyword stuffing traps'],
    },
    {
      title: 'Actionable AI Feedback',
      icon: '💡',
      desc: 'Receive tailored before-and-after bullet point transformations grounded strictly in your real background with quantifiable results.',
      highlights: ['Google X-Y-Z formula', 'Action verb upgrades', 'Executive summary rewrites'],
    },
  ];

  return (
    <section
      id="features"
      className="features-section"
      style={{
        padding: '80px 0',
      }}
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div className="pill pill-primary" style={{ marginBottom: '14px' }}>
            <span>Core Capabilities</span>
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
            Engineered For Modern Hiring Standards
          </h2>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
            TALVYN replaces guesswork with actionable diagnostic precision to ensure your resume survives both machine screening and human recruiter review.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {featureList.map((feat, idx) => (
            <div
              key={idx}
              className="clay-card"
              style={{
                padding: '32px 26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'var(--brand-soft-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    marginBottom: '20px',
                    boxShadow: 'var(--clay-pill)',
                  }}
                >
                  {feat.icon}
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
                  {feat.title}
                </h3>
                <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  {feat.desc}
                </p>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--brand-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {feat.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--brand-text)' }}>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

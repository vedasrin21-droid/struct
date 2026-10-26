'use client';

import React from 'react';

export function Features() {
  const featureList = [
    {
      code: 'SYS.01',
      tag: 'COMPOSITE SCORING',
      title: 'Resume Benchmark Score',
      desc: 'An objective 0–100 composite evaluation calculated across ATS parser compatibility, quantifiable impact, and completeness.',
      highlights: ['Transparent scoring formula', 'Benchmark against experience levels', 'Pinpoint exact weakness areas'],
    },
    {
      code: 'SYS.02',
      tag: 'PARSER SIMULATION',
      title: 'ATS Readability Engine',
      desc: 'Simulate how leading applicant tracking systems (Greenhouse, Lever, Workday) extract your headers, dates, and contact credentials.',
      highlights: ['Format barrier detection', 'Contact field extraction test', 'Standard section verification'],
    },
    {
      code: 'SYS.03',
      tag: 'COMPETENCY MAPPING',
      title: 'Job Description Matching',
      desc: 'Paste any target job description to reveal a side-by-side keyword match rate and specific high-value missing competencies.',
      highlights: ['1-to-1 keyword gap list', 'Domain skill weighting', 'Avoid keyword stuffing traps'],
    },
    {
      code: 'SYS.04',
      tag: 'METRIC REWRITES',
      title: 'Actionable Bullet Upgrades',
      desc: 'Receive tailored before-and-after bullet point transformations grounded strictly in your real background with quantifiable results.',
      highlights: ['Google X-Y-Z formula', 'Action verb upgrades', 'Executive summary rewrites'],
    },
  ];

  return (
    <section
      id="features"
      className="features-section"
      style={{
        padding: '90px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Geometric Shapes */}
      <div className="ambient-grid" />
      <div className="ambient-orb-primary" style={{ top: '20%', right: '-100px' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="pill pill-primary" style={{ marginBottom: '14px', textTransform: 'uppercase' }}>
            <span className="status-pip" style={{ color: 'var(--brand-primary)' }} />
            <span>Core Architectural Capabilities</span>
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--brand-dark)',
              letterSpacing: '-1px',
              marginBottom: '14px',
            }}
          >
            Engineered For Modern Hiring Standards
          </h2>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
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
              className="colour-morph-card"
              style={{
                padding: '32px 26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Clean Geometric Index Header (No generic icons) */}
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
                      fontFamily: "'Space Grotesk', monospace",
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {feat.code}
                  </span>
                  <span className="tech-tag">
                    {feat.tag}
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
                  {feat.title}
                </h3>
                <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '22px' }}>
                  {feat.desc}
                </p>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--brand-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {feat.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--brand-text)' }}>
                    <span className="status-pip" style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
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

'use client';

import React from 'react';
import Link from 'next/link';

export function Features() {
  const featureList = [
    {
      code: '01',
      tag: 'FLAGSHIP CORE',
      title: 'Mock Assessments',
      desc: 'Practice for technical, aptitude, and hiring assessments with structured mock tests.',
      highlights: [
        'Standardized questions across core engineering tracks',
        'Server-side countdown timer & autosave persistence',
        'Automatic grading with positive and negative marking',
        'Instant benchmark evaluation and score summaries',
      ],
      ctaText: 'Explore Assessments (Launch: 16 Nov)',
      ctaHref: '/launching-soon',
      accentColor: '#0284C7',
    },
    {
      code: '02',
      tag: 'SKILL PATHWAYS',
      title: 'Assessment Categories',
      desc: 'Discover assessments based on your skills, interests, and career goals.',
      highlights: [
        'Data Structures & Algorithms track',
        'Full-Stack & Web Architecture tracks',
        'Databases, SQL, & System Design modules',
        'Quantitative Aptitude & Logical Reasoning practice',
      ],
      ctaText: 'Browse Categories',
      ctaHref: '#categories',
      accentColor: '#0A1B38',
    },
    {
      code: '03',
      tag: 'INSTITUTIONAL & HIRING',
      title: 'ECELL Hiring Assessments',
      desc: 'Official online recruitment assessment for collegiate leadership & execution roles.',
      highlights: [
        'Secure password-authenticated participant login',
        'One-department locking & server-timed examination',
        'Non-invasive proctoring & focus telemetry',
        'Direct submission to ECELL recruitment team',
      ],
      ctaText: 'Enter Examination Portal',
      ctaHref: '/ecell/login',
      accentColor: '#1E293B',
    },
    {
      code: '04',
      tag: 'CAREER TOOL',
      title: 'Resume Builder',
      desc: 'Create a professional, ATS-friendly resume.',
      highlights: [
        'Zero-clipping, vector-clean A4 PDF generation',
        'Live two-column preview as you type',
        'Classic Executive and Modern Clean layout options',
        '100% free with no hidden export paywalls',
      ],
      ctaText: 'Coming Soon • 16 Nov',
      ctaHref: '/launching-soon',
      accentColor: '#64748B',
    },
    {
      code: '05',
      tag: 'CAREER TOOL',
      title: 'ATS Resume Checker',
      desc: "Understand your resume's ATS compatibility and identify improvement opportunities.",
      highlights: [
        'Instant 0–100 parsing health evaluation',
        'Structural section & contact validation',
        'Keyword match against job descriptions',
        'Optional Google X-Y-Z formula AI enhancement',
      ],
      ctaText: 'Coming Soon • 16 Nov',
      ctaHref: '/launching-soon',
      accentColor: '#475569',
    },
  ];

  return (
    <section
      id="features"
      className="features-section"
      style={{
        padding: '96px 20px',
        position: 'relative',
        background: '#FFFFFF',
        borderTop: '1px solid rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1220px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.2)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0284C7',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            STRUCT Platform Capabilities
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2.1rem, 3.8vw, 3rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1.2px',
              margin: '0 0 16px',
            }}
          >
            Built for Serious Technical Assessment &amp; Career Preparation
          </h2>
          <p
            style={{
              fontSize: '1.08rem',
              color: '#64748B',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            STRUCT powers standardized mock practice, campus hiring drives, and foundational career readiness for collegiate candidates.
          </p>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: '28px',
          }}
        >
          {featureList.map((feat) => (
            <div
              key={feat.code}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1.5px solid #E5E8EF',
                padding: '34px 30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 18px rgba(10, 27, 56, 0.04)',
                position: 'relative',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: feat.accentColor,
                      letterSpacing: '1px',
                    }}
                  >
                    {feat.code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.05)',
                      color: '#475569',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {feat.tag}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0A1B38',
                    letterSpacing: '-0.4px',
                    margin: '0 0 10px',
                  }}
                >
                  {feat.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.92rem',
                    color: '#64748B',
                    lineHeight: 1.6,
                    margin: '0 0 24px',
                  }}
                >
                  {feat.desc}
                </p>

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {feat.highlights.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '0.86rem',
                        color: '#334155',
                        lineHeight: 1.45,
                      }}
                    >
                      <span style={{ color: feat.accentColor, fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {feat.ctaHref.startsWith('#') ? (
                  <a
                    href={feat.ctaHref}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: feat.accentColor,
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      padding: '6px 0',
                    }}
                  >
                    <span>{feat.ctaText}</span>
                    <span>&rarr;</span>
                  </a>
                ) : (
                  <Link
                    href={feat.ctaHref}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: feat.accentColor,
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      padding: '6px 0',
                    }}
                  >
                    <span>{feat.ctaText}</span>
                    <span>&rarr;</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

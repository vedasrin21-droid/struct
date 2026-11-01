'use client';

import React from 'react';
import Link from 'next/link';

export function Features() {
  const featureList = [
    {
      code: 'ASSESS.01',
      tag: 'FLAGSHIP CORE',
      title: 'Anti-Cheat Proctored Assessments',
      desc: 'Institutional-grade technical exams with real-time countdown synchronization, autosave versioning, and non-invasive proctoring signals.',
      highlights: [
        'Browser blur & tab-switch telemetry',
        'Homoglyph anti-Google search index defense',
        'Automated server-side positive & negative marking',
        'Timed question-level duration control',
      ],
      linkText: 'Explore Exam System',
      linkHref: '/assess',
      accentColor: '#0284C7',
    },
    {
      code: 'AI.02',
      tag: 'VERSION 2 ROADMAP',
      title: 'Adaptive Mock Technical Interviews',
      desc: 'Simulate high-stakes technical screener rounds with AI evaluators that adapt questions dynamically based on your code and explanations.',
      highlights: [
        'Real-time coding & system design critique',
        'STAR framework behavioral coaching',
        'Immediate transcript scoring & gap report',
        'Industry-tailored questions (FAANG, Fintech, Startups)',
      ],
      linkText: 'Version 2 Preview',
      linkHref: '/portal',
      accentColor: '#10B981',
    },
    {
      code: 'RECRUIT.03',
      tag: 'ENTERPRISE HIRING',
      title: 'Recruitment & Candidate Roster Automation',
      desc: 'Empower university departments and hiring managers to dispatch exams, monitor concurrent candidates, and export verified score rosters.',
      highlights: [
        'Bulk CSV candidate credential generation (Mode B)',
        'Multi-tenant organization data isolation',
        'Automated score release gating & answer concealment',
        'Complete candidate leaderboard with CSV export',
      ],
      linkText: 'Recruiter Console',
      linkHref: '/assess/admin',
      accentColor: '#0F172A',
    },
    {
      code: 'CAREER.04',
      tag: 'ENTRY UTILITY',
      title: 'ATS Diagnostics & Smart Resume Builder',
      desc: 'The diagnostic gateway: pinpoint formatting traps and upgrade bullet points using the Google X-Y-Z formula before you apply.',
      highlights: [
        'Deterministic 0–100 composite parser score',
        '1-to-1 job description competency gap analysis',
        'Executive bullet upgrades grounded in real achievements',
        'Clean ATS-optimized PDF generation',
      ],
      linkText: 'Check Resume Score',
      linkHref: '#resume-checker',
      accentColor: '#64748B',
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
      <div style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
            SaaS Platform Architecture
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2.1rem, 3.5vw, 2.8rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1px',
              marginBottom: '14px',
            }}
          >
            Built for High-Stakes Career Benchmarking
          </h2>
          <p style={{ color: '#64748B', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            STRUCT unifies technical assessments, AI interview simulations, and candidate recruitment tools under a single authoritative, security-hardened SaaS platform.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '24px',
          }}
        >
          {featureList.map((feat, idx) => (
            <div
              key={idx}
              style={{
                background: '#FAF9F6',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '32px 26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: feat.accentColor,
                      background: '#FFFFFF',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {feat.code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      color: feat.accentColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {feat.tag}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0A1B38',
                    letterSpacing: '-0.3px',
                    margin: '0 0 10px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {feat.title}
                </h3>

                <p
                  style={{
                    color: '#64748B',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    marginBottom: '22px',
                  }}
                >
                  {feat.desc}
                </p>

                <div
                  style={{
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: '16px',
                    marginBottom: '24px',
                  }}
                >
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {feat.highlights.map((item, hIdx) => (
                      <li
                        key={hIdx}
                        style={{
                          fontSize: '0.84rem',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: feat.accentColor,
                            flexShrink: 0,
                          }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <Link
                  href={feat.linkHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: feat.accentColor,
                    textDecoration: 'none',
                  }}
                >
                  <span>{feat.linkText}</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

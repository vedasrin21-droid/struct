'use client';

import React, { useState } from 'react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is STRUCT and how does it differ from traditional assessment platforms?',
      a: 'STRUCT is an end-to-end technical assessment and AI interview coaching SaaS platform. Unlike legacy test suites, STRUCT combines proctored high-concurrency coding assessments with adaptive AI mock interviews and deep ATS resume alignment. Candidates benchmark their engineering readiness, while engineering teams hire verified top talent with zero cheat vulnerability.',
    },
    {
      q: 'How does STRUCT’s anti-cheat shield and telemetry proctoring work?',
      a: 'STRUCT enforces multi-layer anti-cheat defense during live technical assessments: non-destructive telemetry monitors tab switching and window blurs, clipboard poisoning deters external AI copy-pasting, homoglyph traps detect OCR screen readers, and code replay analysis flags impossible keystroke bursts.',
    },
    {
      q: 'How does the STRUCT scoring engine evaluate my resume and profile?',
      a: 'Our scoring engine uses a weighted composite formula: 30% ATS Readability (parser extraction, section headers, contact syntax), 35% Content Quality (action verb frequency, quantifiable metric density, absence of weak duty phrases), 25% Target Job Match (keyword alignment and competency coverage), and 10% Completeness (core sections and external verification links).',
    },
    {
      q: 'When will AI Mock Technical Interviews launch?',
      a: 'AI Mock Technical Interviews are officially scheduled for Version 2. In Version 1, candidates have complete access to timed proctored practice assessments, public catalog self-enrollment, ATS resume diagnostic scans, Google X-Y-Z bullet enhancements, and institutional recruiting tests.',
    },
    {
      q: 'Which document formats are supported for the ATS diagnostic scan?',
      a: 'STRUCT accepts PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) files up to 5 MB in size. For the best parsing accuracy, we recommend uploading standard single-column PDF or DOCX documents without password protection.',
    },
    {
      q: 'Is candidate and exam data stored or shared with third parties?',
      a: 'No. STRUCT operates on strict zero-persistence architecture for resume evaluations. Resumes are processed in volatile memory only for the duration of the analysis request and immediately discarded. Proctored exam submissions are securely encrypted and accessible only to verified organization administrators.',
    },
    {
      q: 'What are the pricing options for candidates and recruiters?',
      a: 'Candidates can start with a 100% free ATS diagnostic scan, buy an instant ₹49 Executive AI Polish pack, or subscribe to Pro at ₹249/mo (or Elite at ₹499/mo) for proctored mock assessments and candidate certifications. Engineering organizations can choose from flexible hiring tiers starting with a free recruiter pilot up to Enterprise volume screening.',
    },
  ];

  return (
    <section
      id="faq"
      className="faq-section"
      style={{
        padding: '80px 0',
        background: 'var(--brand-card-subtle)',
        borderTop: '1px solid var(--brand-border)',
      }}
    >
      <div className="container" style={{ maxWidth: '860px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="pill pill-primary" style={{ marginBottom: '14px' }}>
            <span>Got Questions?</span>
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
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '1.05rem' }}>
            Everything you need to know about STRUCT proctored assessments, AI mock interviews, and data privacy.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="clay-card-static"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: isOpen ? 'var(--brand-primary)' : 'var(--brand-dark)',
                      paddingRight: '16px',
                    }}
                  >
                    {faq.q}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isOpen ? 'var(--brand-primary)' : 'var(--brand-soft-blue-light)',
                      color: isOpen ? '#FFFFFF' : 'var(--brand-primary)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 24px 22px 24px',
                      color: 'var(--brand-text-muted)',
                      fontSize: '0.94rem',
                      lineHeight: 1.6,
                      borderTop: '1px solid rgba(220, 230, 245, 0.5)',
                      paddingTop: '14px',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

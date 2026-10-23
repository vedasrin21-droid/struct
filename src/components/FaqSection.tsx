'use client';

import React, { useState } from 'react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which document formats and file sizes are supported?',
      a: 'TALVYN accepts PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) files up to 5 MB in size. For the best parsing accuracy, we recommend uploading standard single-column PDF or DOCX documents without password protection.',
    },
    {
      q: 'How does the TALVYN scoring engine calculate my resume score?',
      a: 'Our scoring engine uses a weighted composite formula: 30% ATS Readability (parser extraction, section headers, contact syntax), 35% Content Quality (action verb frequency, quantifiable metric density, absence of weak duty phrases), 25% Target Job Match (keyword alignment and competency coverage), and 10% Completeness (core sections and external verification links).',
    },
    {
      q: 'How does the job description matching work?',
      a: 'When you paste a target job description, TALVYN tokenizes the requirements, identifies essential technical skills, tools, and domain keywords, and cross-references them against your resume. You receive a direct percentage match score along with a clear list of matched skills and missing keyword opportunities.',
    },
    {
      q: 'Are the bullet point suggestions AI-generated or rule-based?',
      a: 'TALVYN uses a hybrid approach. It first deterministically analyzes your real resume bullets for passive phrasing and missing metrics. If an AI provider (such as Gemini or OpenAI) is connected, it crafts tailored, context-aware rewrites grounded strictly in your supplied experience. If no AI key is active or if the connection fails, our deterministic engine generates high-impact formulaic rewrites, always transparently labeled.',
    },
    {
      q: 'Is my resume data stored or shared?',
      a: 'No. TALVYN operates on strict zero-persistence architecture. Resumes are processed in volatile memory only for the duration of the analysis request and immediately discarded. We do not store resumes, retain extracted text in databases, or harvest personal contact information.',
    },
    {
      q: 'Can I export or save my diagnostic report?',
      a: 'Yes. Simply click the "Print / Save PDF Report" button on your results dashboard. Our dedicated print stylesheet formats the report cleanly for saving as a multi-page PDF or physical printing.',
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
            Everything you need to know about TALVYN scoring, ATS testing, and data privacy.
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

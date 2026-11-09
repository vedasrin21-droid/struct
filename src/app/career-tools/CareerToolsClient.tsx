'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CareerToolsClient() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // ATS Card Interactive State
  const [atsInputMode, setAtsInputMode] = useState<'upload' | 'paste'>('upload');

  // Resume Builder Interactive State
  const [activeTemplate, setActiveTemplate] = useState<'modern' | 'classic' | 'executive' | 'minimal'>('modern');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('struct_user_email');
      if (email) setUserEmail(email);
    }
    fetch('/api/assess/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/assess/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('struct_user_email');
      localStorage.removeItem('struct_user_name');
      localStorage.removeItem('struct_user_role');
    }
    setUserEmail(null);
    window.location.href = '/';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFBFD',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* ==================== GLOBAL NAVBAR ==================== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div
              style={{
                width: '35px',
                height: '35px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '-0.5px',
                boxShadow: '0 2px 8px rgba(10, 27, 56, 0.16)',
                flexShrink: 0,
              }}
            >
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  fontSize: '1.22rem',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  color: '#0A1B38',
                  lineHeight: 1.1,
                }}
              >
                STRUCT
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#0284C7',
                }}
              >
                Career &amp; ATS Platform
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <Link
              href="/"
              style={{
                color: '#475569',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'color 0.15s ease',
              }}
            >
              Home
            </Link>

            <Link
              href="/career-tools"
              style={{
                color: '#0284C7',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                transition: 'color 0.15s ease',
              }}
            >
              Career Tools
            </Link>

            <Link
              href="/dashboard"
              style={{
                color: '#475569',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'color 0.15s ease',
              }}
            >
              Assessments
            </Link>

            <Link
              href="/#pricing"
              style={{
                color: '#475569',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'color 0.15s ease',
              }}
            >
              Pricing
            </Link>
          </nav>

          {/* Right Action Suite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/assess"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#0A1B38',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '7px 15px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Organisation Login</span>
            </Link>

            {userEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href="/dashboard"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                    boxShadow: '0 2px 8px rgba(10, 27, 56, 0.15)',
                  }}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  padding: '7px 18px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.22)',
                }}
              >
                Get Started &rarr;
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <main style={{ flex: 1, padding: '60px 24px 80px 24px' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          
          {/* Editorial Headline */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#334155',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
              STRUCT Career Studio
            </div>

            <h1
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: 'clamp(2.3rem, 4vw, 3.4rem)',
                fontWeight: 800,
                letterSpacing: '-1.4px',
                color: '#0A1B38',
                lineHeight: 1.15,
                marginBottom: '14px',
              }}
            >
              Resume Intelligence &amp; Verification
            </h1>

            <p
              style={{
                fontSize: '1.08rem',
                color: '#64748B',
                maxWidth: '620px',
                margin: '0 auto',
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              Enterprise-grade tools engineered to audit compliance against recruitment tracking algorithms and author recruiter-vetted vector resumes.
            </p>
          </div>

          {/* ========================================================
              TWO COMPREHENSIVE ARCHITECTURAL MODULES
              Left: ATS Diagnostic Scanner
              Right: Single-Column Vector Resume Studio
              ======================================================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))',
              gap: '28px',
              alignItems: 'stretch',
              marginBottom: '36px',
            }}
          >
            {/* ==================== MODULE 01: ATS DIAGNOSTIC ==================== */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '32px',
                position: 'relative',
              }}
            >
              <div>
                {/* Module Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#0A1B38',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                      }}
                    >
                      01
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      Diagnostic Engine
                    </span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    Parser Engine v3.1
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#0A1B38',
                    letterSpacing: '-0.5px',
                    marginBottom: '8px',
                  }}
                >
                  ATS Resume Compatibility Checker
                </h2>

                <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: 1.55, marginBottom: '22px' }}>
                  Evaluate your document against enterprise ATS parsers (Workday, Greenhouse, Lever). Detect unparsed sections, structural breaks, and keyword deficits.
                </p>

                {/* Segmented Control for Upload vs Paste */}
                <div
                  style={{
                    display: 'flex',
                    background: '#F1F5F9',
                    padding: '3px',
                    borderRadius: '8px',
                    marginBottom: '18px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAtsInputMode('upload')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: atsInputMode === 'upload' ? '#FFFFFF' : 'transparent',
                      color: atsInputMode === 'upload' ? '#0A1B38' : '#64748B',
                      fontWeight: atsInputMode === 'upload' ? 700 : 500,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      boxShadow: atsInputMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Document Upload (.pdf / .docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAtsInputMode('paste')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: atsInputMode === 'paste' ? '#FFFFFF' : 'transparent',
                      color: atsInputMode === 'paste' ? '#0A1B38' : '#64748B',
                      fontWeight: atsInputMode === 'paste' ? 700 : 500,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      boxShadow: atsInputMode === 'paste' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9" y1="20" x2="15" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                    <span>Raw Words / Text Input</span>
                  </button>
                </div>

                {/* Interactive Console Visual Mockup */}
                <div
                  onClick={() => router.push(`/ats-checker?tab=${atsInputMode}`)}
                  style={{
                    background: '#F8FAFD',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284C7';
                    e.currentTarget.style.background = '#F0F9FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFD';
                  }}
                >
                  {atsInputMode === 'upload' ? (
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0284C7',
                          marginBottom: '10px',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '4px' }}>
                        Click to upload resume or drag &amp; drop
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        Supports PDF 1.7 (.pdf) and Microsoft Word (.docx) &bull; Up to 5 MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.74rem', fontFamily: 'Consolas, monospace', color: '#64748B', fontWeight: 600 }}>
                          INPUT_BUFFER: UTF-8 TEXT
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#0284C7', fontWeight: 600 }}>
                          Click to paste &rarr;
                        </span>
                      </div>
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontFamily: 'Consolas, monospace',
                          fontSize: '0.78rem',
                          color: '#475569',
                          lineHeight: 1.5,
                        }}
                      >
                        Senior Software Engineer | Experience: Distributed systems, rate limiters, Kafka...
                      </div>
                    </div>
                  )}
                </div>

                {/* Architectural Specifications Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Token Matching</div>
                    <div style={{ fontSize: '0.84rem', color: '#0A1B38', fontWeight: 700, marginTop: '2px' }}>1-to-1 Job Alignment</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Bullet Impact</div>
                    <div style={{ fontSize: '0.84rem', color: '#0A1B38', fontWeight: 700, marginTop: '2px' }}>Google X-Y-Z Syntax</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/ats-checker?tab=${atsInputMode}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  padding: '13px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.22)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>Launch ATS Diagnostic Console</span>
                <span style={{ fontSize: '1.05rem' }}>&rarr;</span>
              </Link>
            </div>

            {/* ==================== MODULE 02: RESUME STUDIO ==================== */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '32px',
                position: 'relative',
              }}
            >
              <div>
                {/* Module Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#0A1B38',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                      }}
                    >
                      02
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      Authoring Studio
                    </span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#0284C7', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
                    Single-Column Flow
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#0A1B38',
                    letterSpacing: '-0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Professional Resume Builder
                </h2>

                <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: 1.55, marginBottom: '22px' }}>
                  Construct a high-scoring, single-column resume formatted to eliminate ATS parsing errors while preserving recruiter readability.
                </p>

                {/* Segmented Control for Templates */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    background: '#F1F5F9',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '2px',
                    marginBottom: '18px',
                  }}
                >
                  {(['modern', 'classic', 'executive', 'minimal'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTemplate(t)}
                      style={{
                        padding: '7px 4px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTemplate === t ? '#FFFFFF' : 'transparent',
                        color: activeTemplate === t ? '#0A1B38' : '#64748B',
                        fontWeight: activeTemplate === t ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: activeTemplate === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Interactive Architectural Resume Canvas Preview */}
                <div
                  onClick={() => router.push('/resume-builder')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    minHeight: '128px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284C7';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }}
                >
                  {activeTemplate === 'modern' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1.5px solid #0284C7', paddingBottom: '4px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0A1B38' }}>ALEX RIVERA</span>
                          <span style={{ fontSize: '0.74rem', color: '#64748B', marginLeft: '8px' }}>SDE-2 Full Stack</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#0284C7', fontWeight: 600 }}>alex.rivera@structonline.in</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#334155', lineHeight: 1.45 }}>
                        &bull; Engineered high-throughput settlement pipeline processing 140k req/min with zero downtime.
                      </div>
                    </div>
                  )}

                  {activeTemplate === 'classic' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0A1B38', letterSpacing: '0.4px' }}>ALEX RIVERA</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '8px' }}>
                        Bengaluru, India &bull; linkedin.com/in/alex-rivera &bull; github.com/alexrivera
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#334155', textAlign: 'left', lineHeight: 1.45 }}>
                        &bull; Led architecture overhaul migrating legacy monolith to event-driven Go microservices.
                      </div>
                    </div>
                  )}

                  {activeTemplate === 'executive' && (
                    <div>
                      <div style={{ background: '#0A1B38', color: '#FFFFFF', padding: '5px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', letterSpacing: '0.3px' }}>ALEX RIVERA</span>
                        <span style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 700 }}>PRINCIPAL ENGINEER</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45 }}>
                        &bull; Governed engineering standard across 4 global teams; reduced cloud infra spend by 28%.
                      </div>
                    </div>
                  )}

                  {activeTemplate === 'minimal' && (
                    <div style={{ fontFamily: 'Consolas, monospace' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0A1B38', marginBottom: '3px' }}>ALEX_RIVERA // CV</div>
                      <div style={{ fontSize: '0.72rem', color: '#0284C7', marginBottom: '4px' }}>&gt; CORE: Distributed Systems &bull; High-Concurrency Redis &bull; Postgres</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>&gt; Validated single-column layout for ATS compliance</div>
                    </div>
                  )}
                </div>

                {/* Architectural Specifications Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Layout Standard</div>
                    <div style={{ fontSize: '0.84rem', color: '#0A1B38', fontWeight: 700, marginTop: '2px' }}>4 Recruiter Formats</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Export Engine</div>
                    <div style={{ fontSize: '0.84rem', color: '#0A1B38', fontWeight: 700, marginTop: '2px' }}>Print-Ready Vector PDF</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/resume-builder"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                  color: '#FFFFFF',
                  padding: '13px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(10, 27, 56, 0.22)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>Open Resume Authoring Studio</span>
                <span style={{ fontSize: '1.05rem' }}>&rarr;</span>
              </Link>
            </div>
          </div>

          {/* ==================== BOTTOM TECHNICAL ASSURANCE BAR ==================== */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0A1B38' }}>Privacy First: </span>
                <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                  Resumes are processed securely in memory and never shared, sold, or indexed.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.84rem' }}>
              <Link href="/ats-checker" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
                Go to ATS Checker &rarr;
              </Link>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <Link href="/resume-builder" style={{ color: '#0A1B38', fontWeight: 700, textDecoration: 'none' }}>
                Go to Resume Builder &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: '24px 32px',
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: '0.84rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>&copy; {new Date().getFullYear()} STRUCT online. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
            <Link href="/ats-checker" style={{ color: '#64748B', textDecoration: 'none' }}>ATS Checker</Link>
            <Link href="/resume-builder" style={{ color: '#64748B', textDecoration: 'none' }}>Resume Builder</Link>
            <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>Assessments</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

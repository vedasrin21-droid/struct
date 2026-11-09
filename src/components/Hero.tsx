'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeroProps {
  onCheckResumeClick: () => void;
  onSeeHowItWorksClick: () => void;
  onOpenBuilderClick?: () => void;
}

export function Hero({ onCheckResumeClick, onSeeHowItWorksClick, onOpenBuilderClick }: HeroProps) {
  const [testRunCompleted, setTestRunCompleted] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email);
        }
      })
      .catch(() => { });
  }, []);

  const handleSimulateTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      setIsRunningTests(false);
      setTestRunCompleted(true);
    }, 600);
  };

  return (
    <section
      className="hero-section"
      style={{
        paddingTop: '76px',
        paddingBottom: '90px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 50%, var(--brand-bg) 100%)',
        borderBottom: '1px solid var(--brand-border)',
      }}
    >
      {/* Background Soft Blue Brand Atmosphere */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '4%',
          width: '720px',
          height: '520px',
          background: 'radial-gradient(circle, rgba(18, 51, 107, 0.08) 0%, rgba(220, 230, 245, 0.05) 50%, transparent 70%)',
          filter: 'blur(55px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '-80px',
          width: '560px',
          height: '440px',
          background: 'radial-gradient(circle, rgba(220, 230, 245, 0.5) 0%, transparent 70%)',
          filter: 'blur(65px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1420px',
          margin: '0 auto',
          padding: '0 28px',
        }}
      >
        {/* ========================================================
            2-COLUMN SIDE-BY-SIDE HERO (COMMANDING MAIN HERO PAGE)
            Left: Grand Headline, Platform Subtext, Aesthetic Action Suite
            Right: Expanded STRUCT Cockpit IDE Developer Showcase
            ======================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))',
            alignItems: 'center',
            gap: '56px',
            marginBottom: '52px',
          }}
        >
          {/* ==================== LEFT COLUMN (COMMANDING HERO) ==================== */}
          <div style={{ textAlign: 'left', maxWidth: '680px' }}>
            {/* Direct, Authoritative Headline */}
            {/* Direct, Authoritative Headline */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>
              ECELL Hiring — Round 1
            </div>

            <h1
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 'clamp(3.1rem, 5vw, 4.5rem)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-2.2px',
                color: 'var(--brand-dark)',
                marginBottom: '20px',
              }}
            >
              STRUCT.<br />
              <span style={{ color: '#0284C7' }}>Your next opportunity starts here.</span>
            </h1>

            {/* Platform Subtitle */}
            <p
              style={{
                fontSize: 'clamp(1.1rem, 1.4vw, 1.25rem)',
                color: 'var(--brand-text-muted)',
                lineHeight: 1.65,
                marginBottom: '34px',
                fontWeight: 400,
                maxWidth: '650px',
              }}
            >
              Official online recruitment assessment for collegiate leadership & execution roles. Experience secure proctoring, live question sequencing, and department-specific evaluations.
            </p>

            {/* Aesthetic Action Suite */}
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
              {/* Primary Action Pair */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  flexWrap: 'wrap',
                }}
              >
                <Link
                  href="/ecell/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                    color: '#FFFFFF',
                    padding: '16px 34px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    textDecoration: 'none',
                    boxShadow: '0 10px 28px -4px rgba(10, 27, 56, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.22)',
                    transition: 'all 0.18s ease',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Enter Assessment Portal</span>
                  <span style={{ fontSize: '1.15rem' }}>&rarr;</span>
                </Link>

                <Link
                  href="/launching-soon"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FFFFFF',
                    color: 'var(--brand-dark)',
                    padding: '15px 26px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px -2px rgba(18, 51, 107, 0.08)',
                    border: '1.5px solid var(--brand-border)',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Platform Launch: 16 Nov</span>
                </Link>
              </div>

              {/* Dedicated Assigned Exam Link */}
              <div style={{ marginTop: '4px' }}>
                <Link
                  href="/ecell/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#0284C7',
                    fontWeight: 700,
                    fontSize: '0.94rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>Candidate Login &amp; Department Selection Portal</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN (ENLARGED STRUCT COCKPIT IDE) ==================== */}
          <div style={{ width: '100%' }}>
            <div
              style={{
                background: 'var(--brand-dark)',
                borderRadius: '18px',
                border: '1px solid rgba(220, 230, 245, 0.15)',
                boxShadow: '0 24px 54px -10px rgba(10, 27, 56, 0.42), 0 0 0 1px rgba(18, 51, 107, 0.25)',
                textAlign: 'left',
                overflow: 'hidden',
              }}
            >
              {/* Cockpit Window Header & Mode Badge */}
              <div
                style={{
                  background: '#071226',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Traffic Lights & Session Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#8E9EB5', fontFamily: 'Consolas, monospace', fontWeight: 600, letterSpacing: '0.2px' }}>
                    STRUCT COCKPIT v3.2 [ACTIVE LIVE SESSION]
                  </span>
                </div>

                {/* Proctored Exam IDE Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0A1B38', padding: '5px 14px', borderRadius: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0099E5', display: 'inline-block' }} />
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.2px',
                    }}
                  >
                    Proctored Exam IDE
                  </span>
                </div>
              </div>

              {/* LIVE PROCTORED EXAM IDE */}
              <div style={{ padding: '18px 22px' }}>
                {/* Proctoring Telemetry Card */}
                <div
                  style={{
                    background: 'rgba(18, 51, 107, 0.35)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    borderRadius: '9px',
                    padding: '11px 15px',
                    marginBottom: '14px',
                    fontSize: '0.78rem',
                    fontFamily: 'Consolas, monospace',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#BAE6FD' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', display: 'inline-block' }} />
                    <span style={{ fontWeight: 600 }}>PROCTORING: SHIELD LOCKED (0 tab blurs detected)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8E9EB5', fontSize: '0.76rem' }}>
                    <span>TIME REMAINING: 42:18</span>
                    <span style={{ color: '#38BDF8', fontWeight: 600 }}>AUTOSAVE: v14 (DB SYNCED)</span>
                  </div>
                </div>

                {/* Code Editor Box */}
                <div
                  style={{
                    background: '#060E1E',
                    borderRadius: '11px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px 18px',
                    fontFamily: 'Consolas, "Fira Code", monospace',
                    fontSize: '0.88rem',
                    lineHeight: 1.62,
                    color: '#E2E8F0',
                    marginBottom: '16px',
                    overflowX: 'auto',
                  }}
                >
                  <div style={{ color: '#64748B', marginBottom: '8px', fontSize: '0.76rem' }}>
                    {'// Problem: SlidingWindowRateLimiter (Concurrency) • Max Score: 25 Marks'}
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ color: '#475569', userSelect: 'none', textAlign: 'right', fontSize: '0.84rem', lineHeight: 1.62 }}>
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>4</div>
                      <div>5</div>
                      <div>6</div>
                      <div>7</div>
                      <div>8</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        <span style={{ color: '#F43F5E' }}>export async function</span>{' '}
                        <span style={{ color: '#38BDF8' }}>checkRateLimit</span>(
                        <span style={{ color: '#FCD34D' }}>key: string, limit: number, windowMs: number</span>
                        ): <span style={{ color: '#38BDF8' }}>Promise&lt;boolean&gt;</span> &#123;
                      </div>
                      <div style={{ paddingLeft: '16px', color: '#94A3B8' }}>
                        const now = Date.now(), clearBefore = now - windowMs;<br />
                        <span style={{ color: '#6EE7B7' }}>{'// Atomic Redis sliding log execution'}</span><br />
                        await redis.zremrangebyscore(key, 0, clearBefore);<br />
                        if (await redis.zcard(key) &gt;= limit) <span style={{ color: '#F43F5E' }}>return false</span>;<br />
                        await redis.zadd(key, now, `${'{'}now{'}'}-${'{'}crypto.randomUUID(){'}'}`);<br />
                        <span style={{ color: '#F43F5E' }}>return true</span>;
                      </div>
                      <div>&#125;</div>
                    </div>
                  </div>
                </div>

                {/* Sleek Combined Action Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handleSimulateTests}
                      disabled={isRunningTests}
                      style={{
                        background: '#0099E5',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0, 153, 229, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isRunningTests ? 'Compiling...' : 'Run Official Test Suite ▶'}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: testRunCompleted ? '#34D399' : '#8E9EB5', fontFamily: 'Consolas, monospace' }}>
                      {testRunCompleted ? '✓ 4 / 4 PASSED (14ms)' : '4 test cases pending'}
                    </span>
                  </div>

                  <Link
                    href="/assess"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Launch Live Assessment &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FOUR CREDIBILITY METRIC CARDS (BELOW SPLIT COLUMNS)
            Styled with Brand Identity Tokens (Clay / White Cards)
            ======================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '14px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              background: 'var(--brand-card)',
              border: '1.5px solid var(--brand-border)',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(18, 51, 107, 0.04)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-dark)', marginBottom: '3px' }}>10,000+</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)', fontWeight: 600 }}>Standardized Exam Questions</div>
          </div>

          <div
            style={{
              padding: '16px 18px',
              background: 'var(--brand-card)',
              border: '1.5px solid var(--brand-border)',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(18, 51, 107, 0.04)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-primary)', marginBottom: '3px' }}>Anti-Cheat Shield</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)', fontWeight: 600 }}>Homoglyph &amp; Telemetry Defense</div>
          </div>

          <div
            style={{
              padding: '16px 18px',
              background: 'var(--brand-card)',
              border: '1.5px solid var(--brand-border)',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(18, 51, 107, 0.04)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10B981', marginBottom: '3px' }}>Adaptive AI Feedback</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)', fontWeight: 600 }}>STAR System Design Critique</div>
          </div>

          <div
            style={{
              padding: '16px 18px',
              background: 'var(--brand-card)',
              border: '1.5px solid var(--brand-border)',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(18, 51, 107, 0.04)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-dark)', marginBottom: '3px' }}>₹49 Entry Pack</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)', fontWeight: 600 }}>Zero-Commitment Starter Tool</div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StructLogo } from '@/components/StructLogo';

export default function LaunchingSoonPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, college }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register for waitlist.');
      }

      setSuccessMessage(data.message || 'You have been added to the priority waitlist!');
      setEmail('');
      setName('');
      setCollege('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#07152E',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, rgba(18, 51, 107, 0.08) 50%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(7, 21, 46, 0.9)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            height: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <StructLogo size={36} theme="dark" subtitle="Career Intelligence" />
          </Link>

          <div>
            <Link
              href="/ecell/login"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '8px 18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none',
              }}
            >
              ECELL Assessment Portal &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Date Pill */}
        <div
          style={{
            display: 'inline-block',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: '#38BDF8',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '6px 16px',
            borderRadius: '100px',
            marginBottom: '20px',
          }}
        >
          Official Public Launch &bull; 16 November 2026
        </div>

        <h1
          style={{
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-1.5px',
            lineHeight: 1.15,
            maxWidth: '780px',
            margin: '0 0 16px',
          }}
        >
          Something bigger is coming to your career.
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            color: '#94A3B8',
            lineHeight: 1.65,
            maxWidth: '620px',
            margin: '0 0 40px',
          }}
        >
          STRUCT is engineering the next-generation career intelligence ecosystem: from enterprise ATS resume diagnostics to real-time proctored mock assessments.
        </p>

        {/* Waitlist Box */}
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'rgba(10, 27, 56, 0.85)',
            borderRadius: '20px',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
            padding: '36px 32px',
            textAlign: 'left',
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 6px',
            }}
          >
            Join the Priority Launch Waitlist
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 22px' }}>
            Be the first to access our enterprise tools with exclusive inaugural credits on launch day.
          </p>

          {successMessage ? (
            <div
              style={{
                backgroundColor: 'rgba(21, 128, 61, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                color: '#86EFAC',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              <strong>Priority Seat Reserved!</strong>
              <div style={{ marginTop: '4px', fontSize: '0.84rem' }}>{successMessage}</div>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorMessage && (
                <div
                  style={{
                    backgroundColor: 'rgba(185, 28, 28, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FCA5A5',
                    fontSize: '0.82rem',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  backgroundColor: '#070D18',
                  border: '1.5px solid #1E293B',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College or University"
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  backgroundColor: '#070D18',
                  border: '1.5px solid #1E293B',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu or personal email"
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  backgroundColor: '#070D18',
                  border: '1.5px solid #1E293B',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Reserving your seat...' : 'Get Early Access \u2192'}
              </button>
            </form>
          )}

          <div
            style={{
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.76rem',
              color: '#64748B',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Zero spam guarantee</span>
            <span>Over 600+ students queued</span>
          </div>
        </div>

        {/* Feature Teasers */}
        <div style={{ marginTop: '70px', width: '100%', maxWidth: '960px' }}>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#64748B',
              marginBottom: '28px',
            }}
          >
            Upcoming Enterprise Platform Modules
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px 22px',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                Enterprise ATS Diagnostic Engine
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.55, margin: 0 }}>
                Test your resume against modern Applicant Tracking System algorithms, inspect keyword coverage, parse PDF/Word docs, and build recruiter-ready resumes in live vector preview.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px 22px',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                AI Adaptive Mock Assessments
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.55, margin: 0 }}>
                Timed, role-specific technical evaluations designed for engineering, business, and quantitative careers. Complete with automated answer keys and proctored analytics.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px 22px',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                Simulated AI Interview Suite
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.55, margin: 0 }}>
                Practice behavioral and technical recruiter rounds with instant AI feedback on communication clarity, technical depth, and industry readiness.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#07152E',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748B',
        }}
      >
        STRUCT Career Intelligence Platform &bull; Official Launch: 16 November 2026
      </footer>
    </div>
  );
}

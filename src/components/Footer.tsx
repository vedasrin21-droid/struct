'use client';

import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenContact: () => void;
}

export function Footer({ onOpenPrivacy, onOpenTerms, onOpenContact }: FooterProps) {
  return (
    <footer
      style={{
        background: 'var(--brand-dark)',
        color: '#FFFFFF',
        padding: '64px 0 32px 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand Column */}
          <div style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #DCE6F5 0%, #FFFFFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-dark)',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                S
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: '-0.5px',
                }}
              >
                STRUCT
              </span>
            </div>
            <p style={{ color: '#BAC7D5', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '16px' }}>
              Institutional-grade technical assessments, adaptive AI interview simulations, and verified hiring telemetry for high-growth tech teams.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#8993A4' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <span>Multi-instance secure exam &amp; payment infrastructure</span>
            </div>
          </div>

          {/* Core Platform Links Column */}
          <div>
            <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#DCE6F5', marginBottom: '16px' }}>
              Platform
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li>
                <a href="/assess" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Technical Assessments
                </a>
              </li>
              <li>
                <a href="/portal" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  AI Mock Interviews
                </a>
              </li>
              <li>
                <a href="#pricing" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Pro Plans &amp; Pricing
                </a>
              </li>
              <li>
                <a href="/assess/admin" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Recruiter Console
                </a>
              </li>
              <li>
                <a href="#resume-checker" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  ATS Resume Diagnostic
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Trust Column */}
          <div>
            <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#DCE6F5', marginBottom: '16px' }}>
              Trust &amp; Legal
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li>
                <button
                  onClick={onOpenPrivacy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#BAC7D5',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenTerms}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#BAC7D5',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenContact}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#BAC7D5',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  Contact Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.82rem',
            color: '#8993A4',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} STRUCT. All rights reserved. Built for ambitious professionals.
          </div>
          <div>
            Theme: Deep Navy &amp; Off-White Claymorphism
          </div>
        </div>
      </div>
    </footer>
  );
}

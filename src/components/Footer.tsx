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
                T
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
                TALVYN
              </span>
            </div>
            <p style={{ color: '#BAC7D5', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '16px' }}>
              Premium AI Resume Score Checker. Helping candidates unlock higher interview conversion through ATS diagnostics and quantified impact optimization.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#8993A4' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <span>Zero-persistence privacy guarantee</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#DCE6F5', marginBottom: '16px' }}>
              Product
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li>
                <a href="#resume-checker" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Analyze Resume
                </a>
              </li>
              <li>
                <a href="#features" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Features &amp; Benchmarks
                </a>
              </li>
              <li>
                <a href="#how-it-works" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" style={{ color: '#BAC7D5', textDecoration: 'none' }}>
                  Frequently Asked Questions
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
            &copy; {new Date().getFullYear()} TALVYN. All rights reserved. Built for ambitious professionals.
          </div>
          <div>
            Theme: Deep Navy &amp; Off-White Claymorphism
          </div>
        </div>
      </div>
    </footer>
  );
}

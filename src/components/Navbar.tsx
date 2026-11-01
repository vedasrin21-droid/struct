'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface NavbarProps {
  onCheckResumeClick: () => void;
  onOpenBuilderClick?: () => void;
  onHomeClick?: () => void;
}

export function Navbar({ onCheckResumeClick, onOpenBuilderClick, onHomeClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '66px',
        }}
      >
        {/* Left Corner: Brand Logo, Name & Tagline */}
        <Link
          href="/"
          onClick={(e) => {
            if (onHomeClick) {
              e.preventDefault();
              onHomeClick();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.5px',
              boxShadow: '0 4px 10px rgba(10, 27, 56, 0.15)',
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.25rem',
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
              Assessments &amp; Hiring Platform
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '26px',
          }}
          className="desktop-nav"
        >
          <Link
            href="/assess"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Practice Assessments
          </Link>

          <a
            href="#pricing"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Pro Plans &amp; Pricing
          </a>

          <a
            href="#resume-checker"
            onClick={(e) => {
              e.preventDefault();
              onCheckResumeClick();
            }}
            style={{
              color: '#64748B',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.88rem',
              transition: 'color 0.15s ease',
            }}
          >
            Resume Diagnostic
          </a>
        </nav>

        {/* Right Corner: Recruiter Link & Primary Assessments CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/assess/admin"
            style={{
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.86rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.15s ease',
            }}
            className="hidden-mobile"
          >
            Recruiter Login
          </Link>

          <Link
            href="/assess"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
              color: '#FFFFFF',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
              letterSpacing: '-0.2px',
            }}
          >
            <span>Assessments</span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              Live
            </span>
            <span>&rarr;</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#0A1B38',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
          }}
        >
          <Link
            href="/assess"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#0284C7',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0',
            }}
          >
            <span>Online Assessments (Live Portal)</span>
            <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>Launch</span>
          </Link>
          <Link
            href="/assess"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Practice Assessments
          </Link>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Pro Features &amp; Pricing (INR)
          </a>
          <a
            href="#resume-checker"
            onClick={() => {
              setMobileMenuOpen(false);
              onCheckResumeClick();
            }}
            style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', padding: '6px 0' }}
          >
            Resume Diagnostic (Free Entry Tool)
          </a>
          <Link
            href="/assess"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              marginTop: '8px',
              background: '#0A1B38',
              color: '#FFFFFF',
              textAlign: 'center',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            Candidate &amp; Recruiter Portal &rarr;
          </Link>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
          .hidden-mobile {
            display: inline-block !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}

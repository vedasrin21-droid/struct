'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  onCheckResumeClick?: () => void;
  onOpenBuilderClick?: () => void;
  onHomeClick?: () => void;
}

export function Navbar({ onCheckResumeClick, onOpenBuilderClick, onHomeClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('struct_user_email');
      setUserEmail(email);
    }
  }, []);

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
              Career &amp; ATS Platform
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '24px',
          }}
          className="desktop-nav"
        >
          <Link
            href="/"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Home
          </Link>

          <Link
            href="/resume-builder"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Resume Builder
          </Link>

          <a
            href="/#resume-checker"
            onClick={(e) => {
              if (onCheckResumeClick) {
                e.preventDefault();
                onCheckResumeClick();
              }
            }}
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            ATS Checker
          </a>

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
            Assessments
          </Link>

          <a
            href="/#pricing"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Pricing
          </a>
        </nav>

        {/* Right Corner: User Identity & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userEmail ? (
            <>
              <Link
                href="/portal"
                style={{
                  color: '#0A1B38',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  background: '#FFFFFF',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
                className="hidden-mobile"
              >
                Dashboard
              </Link>
              <Link
                href="/assess"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                }}
              >
                Assessments &rarr;
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                style={{
                  color: '#475569',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  transition: 'background 0.15s ease',
                }}
                className="hidden-mobile"
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                }}
              >
                Get Started &rarr;
              </Link>
            </>
          )}

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
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Home
          </Link>
          <Link
            href="/resume-builder"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Resume Builder (Free)
          </Link>
          <a
            href="/#resume-checker"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onCheckResumeClick) onCheckResumeClick();
            }}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            ATS Resume Checker
          </a>
          <Link
            href="/assess"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            STRUCT Assess (Exams)
          </Link>
          <a
            href="/#pricing"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Pricing
          </a>
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              href="/portal"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: '#F1F5F9',
                color: '#0A1B38',
                textAlign: 'center',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              My Dashboard
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                color: '#FFFFFF',
                textAlign: 'center',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Sign In / Sign Up &rarr;
            </Link>
          </div>
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

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
            href="/dashboard"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Mock Assessments
          </Link>

          <a
            href="/#categories"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Assessment Categories
          </a>

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
        </nav>

        {/* Right Corner: User Identity & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dedicated Assigned Exam Login Link */}
          <Link
            href="/assess/login"
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#0A1B38',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '7px 13px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            className="hidden-mobile"
          >
            <span>Assigned Exam Login</span>
            <span style={{ color: '#0284C7' }}>&rarr;</span>
          </Link>

          {userEmail ? (
            <>
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
            </>
          ) : (
            <>
              <Link
                href="/login"
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
                Login
              </Link>

              <Link
                href="/register"
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
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Mock Assessments
          </Link>
          <a
            href="/#categories"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Assessment Categories
          </a>
          <Link
            href="/assess/login"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0284C7', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Assigned Examination Login &rarr;
          </Link>
          <Link
            href="/resume-builder"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Resume Builder
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
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              href="/dashboard"
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
              Candidate Dashboard
            </Link>
            <Link
              href="/register"
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

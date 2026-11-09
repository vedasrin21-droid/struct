'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StructLogo } from './StructLogo';

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
      if (email) setUserEmail(email);
    }
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email);
          if (typeof window !== 'undefined') {
            localStorage.setItem('struct_user_email', data.user.email);
            localStorage.setItem('struct_user_name', data.user.name || '');
            localStorage.setItem('struct_user_role', data.user.role || 'candidate');
          }
        } else {
          setUserEmail(null);
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
            textDecoration: 'none',
          }}
        >
          <StructLogo size={36} subtitle="Career & ATS Platform" />
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
            onClick={(e) => {
              if (onHomeClick) {
                e.preventDefault();
                onHomeClick();
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
            Home
          </Link>

          <Link
            href="/launching-soon"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Career Tools
          </Link>

          <Link
            href="/ecell/login"
            style={{
              color: '#0284C7',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            ECELL Assessment
          </Link>

          <Link
            href="/launching-soon"
            style={{
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'color 0.15s ease',
            }}
          >
            Platform Launch
          </Link>
        </nav>

        {/* Right Corner: User Identity & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Assessment Portal Button */}
          <Link
            href="/ecell/login"
            style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#FFFFFF',
              background: '#0284C7',
              border: '1px solid #0284C7',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            className="hidden-mobile"
          >
            <span>Assessment Portal</span>
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
                  transition: 'all 0.15s ease',
                }}
                className="hidden-mobile"
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
            onClick={() => {
              setMobileMenuOpen(false);
              if (onHomeClick) onHomeClick();
            }}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Home
          </Link>
          <Link
            href="/career-tools"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Career Tools
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0A1B38', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '6px 0' }}
          >
            Assessments
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
              href="/assess"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#0A1B38',
                textAlign: 'center',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Organisation Login
            </Link>
            {userEmail ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                    color: '#FFFFFF',
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
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    textAlign: 'center',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
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
                Get Started &rarr;
              </Link>
            )}
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

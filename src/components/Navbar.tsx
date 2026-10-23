'use client';

import React, { useState } from 'react';

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
        background: 'rgba(245, 243, 238, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--brand-border)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '76px',
        }}
      >
        {/* Brand Logo */}
        <a
          href="#"
          onClick={(e) => {
            if (onHomeClick) {
              e.preventDefault();
              onHomeClick();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          {/* Custom Geometric Clay Icon */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #12336B 0%, #0A1B38 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(10, 27, 56, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.5px',
            }}
          >
            T
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
                fontSize: '1.35rem',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                color: 'var(--brand-dark)',
                lineHeight: 1.1,
              }}
            >
              TALVYN
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: 'var(--brand-text-muted)',
              }}
            >
              Resume Checker &amp; Builder
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          <a
            href="#features"
            style={{
              color: 'var(--brand-text)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-text)')}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            style={{
              color: 'var(--brand-text)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-text)')}
          >
            How It Works
          </a>
          {onOpenBuilderClick && (
            <button
              onClick={onOpenBuilderClick}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary)',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
              }}
            >
              <span>Resume Builder</span>
              <span className="pill" style={{ background: 'var(--brand-soft-blue)', color: 'var(--brand-primary)', fontSize: '0.68rem', padding: '1px 6px' }}>New</span>
            </button>
          )}
          <a
            href="#faq"
            style={{
              color: 'var(--brand-text)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-text)')}
          >
            FAQ
          </a>
        </nav>

        {/* Right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onOpenBuilderClick && (
            <button
              onClick={onOpenBuilderClick}
              className="btn btn-secondary"
              style={{ display: 'inline-flex' }}
            >
              <span>Build Resume</span>
            </button>
          )}
          <button
            onClick={onCheckResumeClick}
            className="btn btn-primary"
            style={{ display: 'inline-flex' }}
          >
            <span>Check My Resume</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'var(--brand-card)',
              border: '1px solid var(--brand-border)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--brand-text)',
              boxShadow: 'var(--clay-button-secondary)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            background: 'var(--brand-card)',
            borderBottom: '1px solid var(--brand-border)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--clay-card)',
          }}
        >
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--brand-text)', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--brand-text)', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}
          >
            How It Works
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--brand-text)', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}
          >
            FAQ
          </a>
          {onOpenBuilderClick && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBuilderClick();
              }}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '4px' }}
            >
              Resume Builder (New)
            </button>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onCheckResumeClick();
            }}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '4px' }}
          >
            Check My Resume
          </button>
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
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}

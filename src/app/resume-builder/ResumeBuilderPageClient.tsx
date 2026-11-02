'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResumeBuilder } from '@/components/ResumeBuilder';

export default function ResumeBuilderPageClient() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFD',
      display: 'flex',
      flexDirection: 'column',
      color: '#0F172A',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Dedicated Builder Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 4px 10px rgba(10, 27, 56, 0.15)',
              flexShrink: 0,
            }}>
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.18rem',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#0A1B38',
                lineHeight: 1.1,
              }}>
                STRUCT
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#0284C7',
              }}>
                ATS Resume Builder
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }} className="hidden-mobile">
            <Link
              href="/"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              Home
            </Link>
            <Link
              href="/#resume-checker"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              ATS Checker
            </Link>
            <Link
              href="/assess"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              Assessments
            </Link>
          </div>

          {/* Right Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/portal"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0A1B38',
                textDecoration: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                background: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              My Dashboard
            </Link>
            <Link
              href="/sign-in"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(10, 27, 56, 0.15)',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Builder Canvas */}
      <main style={{ flex: 1, width: '100%' }}>
        <ResumeBuilder
          onBackToResults={() => router.push('/#resume-checker')}
          onBackToChecker={() => router.push('/#resume-checker')}
        />
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResumeChecker } from '@/components/ResumeChecker';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { AnalysisResult } from '@/types';

export default function AtsCheckerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'paste' ? 'paste' : 'upload';

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditInBuilder = () => {
    router.push('/resume-builder');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFD',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                ATS Resume Checker
              </span>
            </div>
          </Link>

          {/* Breadcrumbs / Center Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
              Home
            </Link>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <Link href="/career-tools" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
              Career Tools
            </Link>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: '#0A1B38', fontWeight: 700 }}>ATS Score Checker</span>
          </div>

          {/* Right Action Suite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/resume-builder"
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#0A1B38',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '7px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Resume Builder &rarr;</span>
            </Link>
            <Link
              href="/career-tools"
              style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(10, 27, 56, 0.15)',
              }}
            >
              All Career Tools
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '30px 24px 60px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {analysisResult ? (
            <div>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0A1B38',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  &larr; Analyze Another Resume
                </button>

                <button
                  type="button"
                  onClick={handleEditInBuilder}
                  style={{
                    background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  Edit in Resume Builder &rarr;
                </button>
              </div>

              <ResultsDashboard
                result={analysisResult}
                onReset={handleReset}
                onEditInBuilder={handleEditInBuilder}
              />
            </div>
          ) : (
            <div>
              <ResumeChecker
                onAnalysisComplete={handleAnalysisComplete}
                defaultTab={initialTab}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: '24px 28px',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>&copy; {new Date().getFullYear()} STRUCT online. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
            <Link href="/career-tools" style={{ color: '#64748B', textDecoration: 'none' }}>Career Tools</Link>
            <Link href="/resume-builder" style={{ color: '#64748B', textDecoration: 'none' }}>Resume Builder</Link>
            <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>Assessments</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


'use client';

import React from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

export default function SignInClient() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = Boolean(
    publishableKey &&
    publishableKey.trim() !== '' &&
    !publishableKey.includes('placeholder') &&
    publishableKey.startsWith('pk_')
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--brand-bg, #F5F3EE)',
      display: 'flex',
      flexDirection: 'column',
      color: '#0F172A',
      fontFamily: 'inherit'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 4px 10px rgba(10, 27, 56, 0.2)'
            }}>
              S
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-0.5px' }}>STRUCT</span>
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '-2px', fontWeight: 600 }}>IDENTITY PORTAL</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Don&apos;t have an account?</span>
            <Link
              href="/sign-up"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0284C7',
                textDecoration: 'none'
              }}
            >
              Sign Up &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isClerkConfigured ? (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/portal"
              appearance={{
                variables: {
                  colorPrimary: '#0A1B38',
                  colorBackground: '#FFFFFF',
                  borderRadius: '10px',
                },
                elements: {
                  card: 'border border-slate-200 shadow-xl rounded-2xl',
                  formButtonPrimary: 'bg-[#0A1B38] hover:bg-[#12336B] text-white font-bold py-2.5',
                  footerActionLink: 'text-[#0284C7] hover:underline font-semibold',
                }
              }}
            />
          ) : (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '36px 32px',
              boxShadow: '0 12px 36px rgba(10, 27, 56, 0.08)',
              width: '100%',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#E0F2FE',
                color: '#0369A1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.4rem',
                fontWeight: 700
              }}>
                🔐
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>
                Sign In to STRUCT
              </h1>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
                Access ATS resume scoring, interview simulations, and verified assessment credentials.
              </p>

              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '16px',
                fontSize: '0.82rem',
                color: '#475569',
                textAlign: 'left',
                marginBottom: '24px',
                lineHeight: 1.5
              }}>
                <strong>Authentication Ready:</strong> Production authentication uses Clerk SSO & Multi-factor directory. In local offline testing, navigate directly to your workspace.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/portal"
                  style={{
                    display: 'block',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#0A1B38',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.92rem'
                  }}
                >
                  Continue to Candidate Portal &rarr;
                </Link>
                <Link
                  href="/assess"
                  style={{
                    display: 'block',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '0.85rem'
                  }}
                >
                  Candidate Assessment Portal
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

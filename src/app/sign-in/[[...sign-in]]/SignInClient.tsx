'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignInClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleTab, setRoleTab] = useState<'candidate' | 'admin'>('candidate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      // Store identity in localStorage for consistent client session state
      if (typeof window !== 'undefined') {
        localStorage.setItem('struct_user_email', data.user.email);
        localStorage.setItem('struct_user_name', data.user.name || '');
        localStorage.setItem('struct_user_role', data.user.role || 'candidate');
      }

      // Route based on role
      if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        router.push('/assess/admin');
      } else {
        router.push('/portal');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string, tab: 'candidate' | 'admin') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setRoleTab(tab);
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F8FC',
      display: 'flex',
      flexDirection: 'column',
      color: '#182238',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Navbar */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E8EF',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #243B73 0%, #17264A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(36, 59, 115, 0.25)'
            }}>
              S
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#17264A', letterSpacing: '-0.5px' }}>STRUCT</span>
              <span style={{ fontSize: '0.72rem', color: '#6B7280', display: 'block', marginTop: '-2px', fontWeight: 600 }}>CAREER PLATFORM</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.88rem', color: '#6B7280' }}>Don&apos;t have an account?</span>
            <Link
              href="/sign-up"
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#243B73',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #E5E8EF',
                background: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              Sign Up &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E5E8EF',
          boxShadow: '0 16px 40px rgba(23, 38, 74, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          padding: '36px 32px',
        }}>
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#F0F4FC',
              color: '#243B73',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: '1.3rem',
              fontWeight: 800
            }}>
              ⚡
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#17264A', margin: 0 }}>
              Sign In to STRUCT
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#6B7280', marginTop: '6px', marginBottom: 0 }}>
              Build your resume, test your skills, and track assessments.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: '#F7F8FC',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '20px',
            border: '1px solid #E5E8EF'
          }}>
            <button
              type="button"
              onClick={() => { setRoleTab('candidate'); setError(null); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: roleTab === 'candidate' ? '#FFFFFF' : 'transparent',
                color: roleTab === 'candidate' ? '#243B73' : '#6B7280',
                boxShadow: roleTab === 'candidate' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Student / Candidate
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab('admin'); setError(null); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: roleTab === 'admin' ? '#FFFFFF' : 'transparent',
                color: roleTab === 'admin' ? '#243B73' : '#6B7280',
                boxShadow: roleTab === 'admin' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Organization Admin
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#FDF2F2',
              border: '1px solid #F8B4B4',
              color: '#9B1C1C',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              lineHeight: 1.45,
              marginBottom: '18px'
            }}>
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#17264A', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleTab === 'admin' ? 'admin@talvyn.com' : 'candidate@talvyn.com'}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E5E8EF',
                  fontSize: '0.92rem',
                  color: '#182238',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#17264A' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4566A8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E5E8EF',
                  fontSize: '0.92rem',
                  color: '#182238',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #243B73 0%, #17264A 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                boxShadow: '0 4px 14px rgba(36, 59, 115, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.1s ease'
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#FFFFFF',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Signing In...
                </>
              ) : (
                `Sign In as ${roleTab === 'admin' ? 'Administrator' : 'Student'} \u2192`
              )}
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #E5E8EF',
            fontSize: '0.78rem',
            color: '#6B7280',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Quick Demo Fill:</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fillDemo('candidate@talvyn.com', 'CandidatePass123!', 'candidate')}
                style={{
                  background: '#F0F4FC',
                  border: '1px solid #D5E1F7',
                  color: '#243B73',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Demo Candidate
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@talvyn.com', 'TalvynAdmin2026!', 'admin')}
                style={{
                  background: '#F0F4FC',
                  border: '1px solid #D5E1F7',
                  color: '#243B73',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Demo Admin
              </button>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

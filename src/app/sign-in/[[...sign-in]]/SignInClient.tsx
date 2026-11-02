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

      if (typeof window !== 'undefined') {
        localStorage.setItem('struct_user_email', data.user.email);
        localStorage.setItem('struct_user_name', data.user.name || '');
        localStorage.setItem('struct_user_role', data.user.role || 'candidate');
      }

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
      background: 'radial-gradient(circle at 50% 12%, rgba(2, 132, 199, 0.05) 0%, transparent 60%), #F8FAFD',
      display: 'flex',
      flexDirection: 'column',
      color: '#0F172A',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Sticky Top Navbar */}
      <header style={{
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
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand Logo & Name matching Home page */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
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
            }}>
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.25rem',
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
                Assessments &amp; Hiring Platform
              </span>
            </div>
          </Link>

          {/* Right Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.88rem', color: '#64748B' }}>New to STRUCT?</span>
            <Link
              href="/sign-up"
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#0A1B38',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                background: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              Sign Up &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '430px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 20px 48px -12px rgba(10, 27, 56, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
          padding: '40px 36px',
        }}>
          {/* Card Header without emojis */}
          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#0284C7',
              marginBottom: '8px'
            }}>
              Identity &amp; Assessment Access
            </span>
            <h1 style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-0.8px',
              margin: '0 0 6px',
              lineHeight: 1.2
            }}>
              Sign In to STRUCT
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748B',
              lineHeight: 1.5,
              margin: 0
            }}>
              Access your resume builder, skill evaluations, and assessment credentials.
            </p>
          </div>

          {/* Role Switcher Tabs (Segmented Control) */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '22px',
            border: '1px solid #E2E8F0'
          }}>
            <button
              type="button"
              onClick={() => { setRoleTab('candidate'); setError(null); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: roleTab === 'candidate' ? '#FFFFFF' : 'transparent',
                color: roleTab === 'candidate' ? '#0A1B38' : '#64748B',
                boxShadow: roleTab === 'candidate' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Candidate / Student
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab('admin'); setError(null); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: roleTab === 'admin' ? '#FFFFFF' : 'transparent',
                color: roleTab === 'admin' ? '#0A1B38' : '#64748B',
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
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              lineHeight: 1.45,
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}>
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
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1E293B'
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284C7',
                    fontSize: '0.78rem',
                    fontWeight: 700,
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
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  color: '#0F172A',
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
                background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                boxShadow: '0 4px 14px rgba(10, 27, 56, 0.25)',
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
                  Authenticating...
                </>
              ) : (
                `Sign In as ${roleTab === 'admin' ? 'Administrator' : 'Student'} \u2192`
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Footer */}
          <div style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.8rem',
            color: '#64748B',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Quick Verification Accounts:</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fillDemo('candidate@talvyn.com', 'CandidatePass123!', 'candidate')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#0A1B38',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Candidate Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@talvyn.com', 'TalvynAdmin2026!', 'admin')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#0A1B38',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Admin Demo
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

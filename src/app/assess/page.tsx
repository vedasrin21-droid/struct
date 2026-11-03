'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AssessHubPage() {
  const router = useRouter();
  const [role, setRole] = useState<'candidate' | 'admin'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          if (data.user.role === 'admin' || data.user.role === 'super_admin') {
            router.push('/assess/admin');
          } else {
            router.push('/assess/candidate');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        router.push('/assess/admin');
      } else {
        router.push('/assess/candidate');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--brand-bg, #F5F3EE)', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <span style={{ marginLeft: '6px', fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#0284C7', color: '#FFF' }}>ASSESS</span>
              </div>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/dashboard" style={{ fontSize: '0.88rem', color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}>
              Mock Assessments &rarr;
            </Link>
            <Link href="/" style={{ fontSize: '0.88rem', color: '#475569', textDecoration: 'none', fontWeight: 600 }}>
              &larr; Platform Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: '999px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#0369A1',
            marginBottom: '14px'
          }}>
            <span>Institutional &amp; Hiring Examination Platform</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1px', marginBottom: '12px' }}>
            Secure Online Examination Portal
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#475569', maxWidth: '640px', margin: '0 auto' }}>
            Conduct college assessments and department-level hiring examinations with automated server-side scoring, countdown synchronization, and non-invasive proctoring.
          </p>
        </div>

        {/* Auth Box & Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Login Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            boxShadow: '0 10px 30px rgba(10, 27, 56, 0.08)',
            padding: '32px',
          }}>
            {/* Role Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '24px'
            }}>
              <button
                type="button"
                onClick={() => { setRole('candidate'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: role === 'candidate' ? '#FFFFFF' : 'transparent',
                  color: role === 'candidate' ? '#0A1B38' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: role === 'candidate' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Candidate Login
              </button>
              <button
                type="button"
                onClick={() => { setRole('admin'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: role === 'admin' ? '#FFFFFF' : 'transparent',
                  color: role === 'admin' ? '#0A1B38' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: role === 'admin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Admin Console
              </button>
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0A1B38', marginBottom: '8px' }}>
              {role === 'admin' ? 'Administrator Authentication' : 'Candidate Assessment Access'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
              {role === 'admin'
                ? 'Sign in with your authorized admin credentials to configure question banks, assign exams, and review proctoring logs.'
                : 'Sign in to access your assigned college examinations and public mock assessments.'}
            </p>

            {/* Error & Success Messages */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                lineHeight: 1.4
              }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #86EFAC',
                color: '#166534',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                lineHeight: 1.4
              }}>
                {successMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {role === 'admin' ? 'Admin Email Address' : 'Candidate Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'admin@structonline.in' : 'student@institution.edu'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: role === 'admin' ? 'linear-gradient(135deg, #0A1B38 0%, #17264A 100%)' : 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: '8px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                {loading ? 'Signing In...' : role === 'admin' ? 'Sign In to Admin Console \u2192' : 'Access Assessment Workspace \u2192'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.84rem', color: '#64748B' }}>
                {role === 'admin' ? (
                  <span>
                    Need institution or recruiter credentials?{' '}
                    <Link href="/register" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
                      Register Organization &rarr;
                    </Link>
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span>
                      Have an assigned examination?{' '}
                      <Link href="/assess/login" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
                        Assigned Exam Login &rarr;
                      </Link>
                    </span>
                    <span>
                      New student?{' '}
                      <Link href="/register" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
                        Create free mock account &rarr;
                      </Link>
                    </span>
                  </div>
                )}
              </div>
            </form>

            {/* Non-production safety check */}
            {process.env.NODE_ENV !== 'production' && null}
          </div>

          {/* Value Props & Information Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)'
            }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#E0F2FE',
                  color: '#0369A1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>
                  01
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0A1B38', marginBottom: '4px' }}>
                    Zero Answer-Key Leakage Architecture
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                    Questions delivered to candidates contain strictly options and prompts. Solution keys and rationale explanations remain encrypted on the server until authorized results release.
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)'
            }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>
                  02
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0A1B38', marginBottom: '4px' }}>
                    Authoritative Server Deadlines &amp; Autosave
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                    Browser clocks cannot manipulate test durations. Every response is version-tracked with automatic background sync and idempotent final submission.
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)'
            }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>
                  03
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0A1B38', marginBottom: '4px' }}>
                    Non-Invasive Proctoring Telemetry
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                    Signals such as tab switching, window blurring, and fullscreen exits are recorded for proctor review without intrusive biometric or camera surveillance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

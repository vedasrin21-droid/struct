'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AssessHubPage() {
  const router = useRouter();
  const [role, setRole] = useState<'candidate' | 'admin'>('candidate');
  const [isRegisterAdmin, setIsRegisterAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          if (data.user.role === 'admin') {
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

      if (data.user.role === 'admin') {
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

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, setupCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMsg('Administrator account registered! Please log in.');
      setIsRegisterAdmin(false);
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCandidate = () => {
    setRole('candidate');
    setIsRegisterAdmin(false);
    setEmail('candidate@talvyn.com');
    setPassword('CandidatePass123!');
    setError(null);
  };

  const fillDemoAdmin = () => {
    setRole('admin');
    setIsRegisterAdmin(false);
    setEmail('admin@talvyn.com');
    setPassword('TalvynAdmin2026!');
    setError(null);
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" style={{ fontSize: '0.9rem', color: '#475569', textDecoration: 'none', fontWeight: 600 }}>
              &larr; Back to Resume Tools
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
                onClick={() => { setRole('candidate'); setIsRegisterAdmin(false); setError(null); }}
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
              {isRegisterAdmin ? 'Register Root Administrator' : role === 'admin' ? 'Administrator Authentication' : 'Candidate Assessment Access'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
              {isRegisterAdmin
                ? 'Enter your administration setup code to create an administrator profile.'
                : role === 'admin'
                ? 'Sign in to configure question banks, assign exams, and review proctoring logs.'
                : 'Enter your assigned candidate credentials to access scheduled exams.'}
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

            {/* Form */}
            {isRegisterAdmin ? (
              <form onSubmit={handleRegisterAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@talvyn.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
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
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Setup Code
                  </label>
                  <input
                    type="password"
                    required
                    value={setupCode}
                    onChange={e => setSetupCode(e.target.value)}
                    placeholder="Talvyn@Assess2026!"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                    Default setup code: <code>Talvyn@Assess2026!</code>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#0A1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: '8px'
                  }}
                >
                  {loading ? 'Registering...' : 'Create Admin Profile'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRegisterAdmin(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284C7',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  &larr; Return to Admin Login
                </button>
              </form>
            ) : (
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
                    placeholder={role === 'admin' ? 'admin@talvyn.com' : 'candidate@talvyn.com'}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
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
                    placeholder="Enter account password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: role === 'admin' ? '#0A1B38' : '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {loading ? 'Signing In...' : role === 'admin' ? 'Access Admin Console' : 'Access Candidate Portal'}
                </button>

                {role === 'admin' && (
                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => { setIsRegisterAdmin(true); setError(null); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0284C7',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Need to register an admin account? Click here
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Quick Demo Fill Buttons */}
            <div style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px dashed #E2E8F0',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Instant Local Testing Credentials
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={fillDemoCandidate}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #BAE6FD',
                    background: '#F0F9FF',
                    color: '#0369A1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Fill Demo Candidate
                </button>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Fill Demo Admin
                </button>
              </div>
            </div>
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

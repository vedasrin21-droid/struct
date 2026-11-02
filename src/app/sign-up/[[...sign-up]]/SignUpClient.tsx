'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          college: college.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please check your details.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('struct_user_email', data.user.email);
        localStorage.setItem('struct_user_name', data.user.name);
        localStorage.setItem('struct_user_role', data.user.role);
      }

      router.push(data.redirectUrl || '/portal');
    } catch (err: any) {
      setError(err.message || 'Unable to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <span style={{ fontSize: '0.88rem', color: '#64748B' }}>Already registered?</span>
            <Link
              href="/sign-in"
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
              Sign In &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Register Workspace */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
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
              Student Career Onboarding
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
              Create Your STRUCT Account
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748B',
              lineHeight: 1.5,
              margin: 0
            }}>
              Unlock ATS resume optimization, skill assessments, and career credentials.
            </p>
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

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
                placeholder="rohan@example.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}>
                College / University <span style={{ fontWeight: 400, color: '#64748B' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. IIT Bombay, BITS Pilani"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1E293B'
                }}>
                  Password <span style={{ fontWeight: 400, color: '#64748B' }}>(min. 8 characters)</span>
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
                minLength={8}
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
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  boxSizing: 'border-box'
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
                  Creating Account...
                </>
              ) : (
                'Create Free Account \u2192'
              )}
            </button>
          </form>

          <p style={{
            fontSize: '0.78rem',
            color: '#64748B',
            textAlign: 'center',
            marginTop: '22px',
            lineHeight: 1.5,
            marginBottom: 0
          }}>
            By creating an account, you agree to STRUCT&apos;s{' '}
            <Link href="/terms" style={{ color: '#0284C7', textDecoration: 'underline' }}>Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" style={{ color: '#0284C7', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </p>
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

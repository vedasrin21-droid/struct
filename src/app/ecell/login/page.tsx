'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

export default function EcellLoginPage() {
  const router = useRouter();
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrId.trim() || !password.trim()) {
      setError('Please provide your Registration ID or Registered Email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ecell/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId: emailOrId.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please verify your credentials.');
      }

      router.push(data.redirectUrl || '/ecell/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ecell-page-wrapper">
      {/* Header */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <StructLogo size={36} subtitle="Assessment Suite" />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="ecell-tag-pill">Recruitment 2026</span>
            <Link
              href="/launching-soon"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#5E6C84',
                textDecoration: 'none',
              }}
            >
              Platform Launch
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="ecell-main-content">
        <div className="ecell-card-login">
          <div className="ecell-tag-pill" style={{ marginBottom: '18px' }}>
            <span className="ecell-dot-indicator"></span>
            ECELL Hiring &mdash; Round 1
          </div>

          <h1 className="ecell-heading-hero">Welcome to ECELL Hiring.</h1>
          <p className="ecell-text-body">
            Log in to access your recruitment assessment and record your performance.
          </p>

          {error && <div className="ecell-banner-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="ecell-field-group">
              <label className="ecell-label">Registration ID or Registered Email</label>
              <input
                type="text"
                required
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="e.g. 2026EC104 or candidate@talvyn.com"
                className="ecell-input-text"
                autoComplete="username"
              />
            </div>

            <div className="ecell-field-group" style={{ marginBottom: '24px' }}>
              <label className="ecell-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter confidential password"
                  className="ecell-input-text"
                  style={{ paddingRight: '56px' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#5E6C84',
                    padding: '4px 6px',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="ecell-btn-primary">
              <span>{loading ? 'Authenticating...' : 'Login to Assessment'}</span>
              {!loading && <span>&rarr;</span>}
            </button>
          </form>

          <div
            style={{
              marginTop: '26px',
              paddingTop: '18px',
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center',
              fontSize: '0.78rem',
              color: '#64748B',
              fontWeight: 600,
            }}
          >
            Proctored &bull; Encrypted Single-Session Session
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#8993A4',
              marginTop: '20px',
            }}
          >
            Trouble logging in? Please contact your ECELL student coordinator.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. All rights reserved. ECELL Official Recruitment Engine.
      </footer>
    </div>
  );
}

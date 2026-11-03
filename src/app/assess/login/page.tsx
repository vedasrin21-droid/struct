'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AssignedExamLoginPage() {
  const router = useRouter();
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noExamNotice, setNoExamNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNoExamNotice(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/exam-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your examination credentials.');
      }

      if (data.hasAssignedExam === false) {
        setNoExamNotice(data.error || 'No examination has been assigned to your account. Please verify with your coordinator or proctor.');
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push('/assess/candidate');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to examination server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFD',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#0F172A',
      }}
    >
      {/* Top Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.35rem',
              boxShadow: '0 4px 14px rgba(10, 27, 56, 0.25)',
            }}
          >
            S
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-0.5px' }}>
              STRUCT
            </span>
            <span
              style={{
                marginLeft: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '8px',
                background: '#0284C7',
                color: '#FFFFFF',
                letterSpacing: '0.5px',
              }}
            >
              ASSESS
            </span>
          </div>
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0A1B38',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
          }}
        >
          STRUCT Assess
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#64748B', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
          Log in using the examination credentials provided by your organization.
        </p>
      </div>

      {/* Examination Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 12px 36px rgba(10, 27, 56, 0.08)',
          padding: '36px 32px',
        }}
      >
        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              marginBottom: '20px',
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        {/* No Exam Assigned Notice */}
        {noExamNotice && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              color: '#92400E',
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '0.88rem',
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <strong>Examination Notice:</strong>
            <p style={{ margin: '6px 0 0' }}>{noExamNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Participant ID or Email
            </label>
            <input
              type="text"
              required
              autoFocus
              value={emailOrId}
              onChange={e => setEmailOrId(e.target.value)}
              placeholder="e.g. cand_abc123 or student@institution.edu"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '9px',
                border: '1px solid #CBD5E1',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your assigned password"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '9px',
                border: '1px solid #CBD5E1',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0A1B38 0%, #17264A 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9px',
              padding: '13px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(10, 27, 56, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Login to Examination →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #F1F5F9' }}>
          <Link
            href="/"
            style={{
              fontSize: '0.85rem',
              color: '#64748B',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to STRUCT Home
          </Link>
        </div>
      </div>

      {/* Security Reassurance */}
      <div
        style={{
          marginTop: '28px',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '0.8rem',
          maxWidth: '420px',
          lineHeight: 1.5,
        }}
      >
        <span>🔒 Server-authoritative timer, proctored session tokens, and encrypted answer submission active.</span>
      </div>
    </div>
  );
}

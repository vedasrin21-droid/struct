'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

function AssignedExamLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlExamCode = searchParams.get('code') || '';

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [examCode, setExamCode] = useState(urlExamCode.trim().toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noExamNotice, setNoExamNotice] = useState<string | null>(null);

  useEffect(() => {
    if (urlExamCode) {
      setExamCode(urlExamCode.trim().toUpperCase());
    }
  }, [urlExamCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNoExamNotice(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assess/auth/exam-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrId,
          password,
          examCode: examCode.trim().toUpperCase() || undefined,
        }),
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
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 12px 36px rgba(10, 27, 56, 0.08)',
        padding: '36px 32px',
      }}
    >
      {/* Banner for ECELL Hiring candidates */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1.5px solid #BFDBFE',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '0.84rem', color: '#1E40AF', fontWeight: 600 }}>
          Appearing for <strong>ECELL Hiring — Round 1</strong>?
        </div>
        <Link
          href="/ecell/login"
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#FFFFFF',
            background: '#2563EB',
            padding: '6px 14px',
            borderRadius: '8px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Go to ECELL Portal &rarr;
        </Link>
      </div>

      {/* Target Exam Banner if examCode is present */}
      {examCode && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '1px solid #BAE6FD',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#0284C7',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#0369A1',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Assigned Examination Access
            </div>
            <div
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#0A1B38',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Code: {examCode}
            </div>
          </div>
        </div>
      )}

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
            placeholder="e.g. cand_abc123 or candidate@institution.edu"
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
            placeholder="Enter your assigned examination password"
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

        {/* Optional Exam Code Input (if not locked by URL or candidate wants to specify) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              Unique Exam Code
            </label>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
              {urlExamCode ? 'Pre-filled from link' : 'Optional if assigned'}
            </span>
          </div>
          <input
            type="text"
            value={examCode}
            onChange={e => setExamCode(e.target.value.toUpperCase())}
            placeholder="e.g. CAMPUS-2026-ENG"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '9px',
              border: '1px solid #CBD5E1',
              fontSize: '0.92rem',
              outline: 'none',
              boxSizing: 'border-box',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              background: urlExamCode ? '#F8FAFC' : '#FFFFFF',
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
  );
}

export default function AssignedExamLoginPage() {
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
            marginBottom: '16px',
          }}
        >
          <StructLogo size={42} subtitle="ASSESS SUITE" />
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

      <Suspense fallback={
        <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '36px', maxWidth: '440px', width: '100%', textAlign: 'center', color: '#64748B' }}>
          Loading examination portal...
        </div>
      }>
        <AssignedExamLoginForm />
      </Suspense>

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

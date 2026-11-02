'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

export function PricingSection() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const handleBuyResumePack = async () => {
    setCheckoutErr(null);
    setCheckoutMsg(null);
    setCheckoutLoading(true);

    try {
      const email = typeof window !== 'undefined' ? localStorage.getItem('struct_user_email') || '' : '';
      const userEmail = email.trim() || 'candidate@structonline.in';

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'resume_ai_pack_49',
          userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate checkout order.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please verify your connection.');
      }

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'STRUCT Career Platform',
        description: 'Resume AI Enhancement + Detailed ATS Analysis (₹49)',
        order_id: data.orderId,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: '#0A1B38',
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setCheckoutMsg('Checkout cancelled.');
          },
        },
        handler: async (resp: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setCheckoutMsg('Verifying payment confirmation...');
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }
            setCheckoutMsg('Payment successful! Your Resume AI & Detailed ATS credits are now active.');
            if (typeof window !== 'undefined') {
              window.location.href = '/portal?payment=success';
            }
          } catch (vErr: any) {
            setCheckoutErr(vErr.message || 'Payment verification error.');
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      rzp.open();
    } catch (err: any) {
      setCheckoutErr(err.message || 'Failed to open payment gateway.');
      setCheckoutLoading(false);
    }
  };

  return (
    <section
      id="pricing"
      style={{
        padding: '90px 24px',
        background: '#F8FAFD',
        borderTop: '1px solid #E5E8EF',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Section Header: MAIN FOCUS ON ASSESSMENTS */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#0284C7',
              marginBottom: '10px',
            }}
          >
            STRUCT Assess — Examination &amp; Mock Testing Plans
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1px',
              margin: '0 0 16px',
            }}
          >
            Practice, Benchmark &amp; Prove Your Technical Skills
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              maxWidth: '640px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Take official campus recruitment drives, test yourself against standardized mock benchmarks, and get instant server-side scoring.
          </p>
        </div>

        {/* Feedback alerts */}
        {checkoutMsg && (
          <div style={{ maxWidth: '680px', margin: '0 auto 24px', background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '12px 18px', borderRadius: '10px', textAlign: 'center', fontSize: '0.92rem' }}>
            {checkoutMsg}
          </div>
        )}
        {checkoutErr && (
          <div style={{ maxWidth: '680px', margin: '0 auto 24px', background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '12px 18px', borderRadius: '10px', textAlign: 'center', fontSize: '0.92rem' }}>
            {checkoutErr}
          </div>
        )}

        {/* PRIMARY ASSESSMENT PRICING CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: '32px',
            alignItems: 'stretch',
            marginBottom: '48px',
          }}
        >
          {/* Card 1: STRUCT Assess Student Free */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1.5px solid #E5E8EF',
              padding: '42px 36px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 18px rgba(10, 27, 56, 0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#64748B' }}>
                Student Access
              </span>
              <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                Free Forever
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Assess Free
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
              Essential examination portal access for college drives, campus recruitment, and starter mock technical testing.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1.5px' }}>₹0</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>/ free for students</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Institutional Examinations:</strong> Participate in official college, club &amp; company exam drives</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Public Mock Assessments:</strong> Practice standardized technical benchmarks with real timers</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Server-Side Auto Grading:</strong> Automated evaluation with positive &amp; negative marking</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Verification Receipt:</strong> Cryptographic timestamped submission code for records</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Candidate Dashboard:</strong> Review past exam participation and released scores</span>
              </li>
            </ul>

            <Link
              href="/assess"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                border: '1.5px solid rgba(15, 23, 42, 0.15)',
                background: '#FFFFFF',
                color: '#0A1B38',
                fontSize: '0.95rem',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              Start Free Assessment &rarr;
            </Link>
          </div>

          {/* Card 2: STRUCT Assess Pro Pass */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '2px solid #0284C7',
              padding: '42px 36px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 48px -10px rgba(2, 132, 199, 0.18)',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Value Badge */}
            <div
              style={{
                position: 'absolute',
                top: '-13px',
                right: '32px',
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                color: '#FFFFFF',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                padding: '4px 14px',
                borderRadius: '999px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              Recommended • Full Mock Prep
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#0284C7' }}>
                Mock Exam Pass
              </span>
              <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                Comprehensive Training
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Assess Pro Pass
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
              Extensive technical mock preparation for campus drives with full anti-cheat simulation and question rationales.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '28px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1.5px' }}>₹199</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>one-time pass (no subscription)</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Unlimited Mock Assessments:</strong> Full access to Full Stack, DSA, Frontend, &amp; CS Fundamentals</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Full Anti-Cheat Simulation:</strong> Tab-switch tracking, fullscreen guard, and telemetry audit</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Comprehensive Solution Reviews:</strong> Question-by-question explanations and engineering rationales</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Skill Gap &amp; Benchmark Report:</strong> Identify topic strengths, category percentiles, and speed telemetry</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Verified Candidate Credential:</strong> Shareable assessment certificate to include in job applications</span>
              </li>
            </ul>

            <Link
              href="/assess"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                color: '#FFFFFF',
                fontSize: '0.98rem',
                fontWeight: 800,
                textAlign: 'center',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              Get Assess Pro Pass &rarr;
            </Link>
          </div>
        </div>

        {/* DISTINCT SEPARATE SECTION: RESUME BUILDER & AI POLISH ADD-ON */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            padding: '36px 32px',
            boxShadow: '0 10px 30px rgba(10, 27, 56, 0.05)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'inline-flex', padding: '4px 10px', background: '#F1F5F9', borderRadius: '6px', color: '#475569', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Separate Career Tool &bull; Resume Builder &amp; AI Polish
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px' }}>
                STRUCT Resume Builder &amp; AI ATS Polish (₹49 Add-On)
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 16px' }}>
                Our ATS Resume Builder is completely free to use with live previews and clean PDF exports. If you need deep AI bullet point rewrites and section-by-section ATS diagnostic, grab the optional one-time add-on.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.86rem', color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> Free ATS Resume Creator &amp; Vector PDF
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> Optional AI Rewrite &amp; ATS Scan (₹49 One-Time)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> Google X-Y-Z formula bullet polish
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleBuyResumePack}
                style={{
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  opacity: checkoutLoading ? 0.8 : 1,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
              >
                {checkoutLoading ? 'Connecting...' : 'Get Resume AI Pack — ₹49 →'}
              </button>

              <Link
                href="/resume-builder"
                style={{
                  fontSize: '0.85rem',
                  color: '#0284C7',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '6px',
                }}
              >
                Open Free Resume Builder &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Reassurance Footer */}
        <div style={{ textAlign: 'center', marginTop: '36px', color: '#64748B', fontSize: '0.86rem' }}>
          <span>🔒 Secured via Razorpay (UPI, Google Pay, PhonePe, Cards, NetBanking). Instant access.</span>
        </div>
      </div>
    </section>
  );
}

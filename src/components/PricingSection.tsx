'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

export function PricingSection() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const handleBuyPremium = async () => {
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
            setCheckoutMsg('Payment successful! Your Premium Resume AI & Detailed ATS credits are active.');
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
        {/* Section Header */}
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
            Clear &amp; Transparent Student Pricing
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
            Everything You Need to Get Hired
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              maxWidth: '620px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Start 100% free with the complete resume builder and examination portal. Upgrade once for deep AI rewriting and in-depth ATS diagnostic.
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

        {/* 2-Card Single Source of Truth Pricing Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          {/* Plan A: STRUCT Free */}
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
                Plan A
              </span>
              <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                Free Forever
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              STRUCT Free
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
              Essential career foundation for every student. Build a resume, take exams, and understand your initial ATS standing.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1.5px' }}>₹0</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>/ free forever</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Full Resume Builder:</strong> Enter education, experience, projects, skills &amp; certs</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Professional Template:</strong> Clean formatting optimized for recruiters &amp; scanners</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Instant PDF Export:</strong> Pristine vector resume download with zero blank pages</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Basic ATS Checker:</strong> Resume structure evaluation &amp; initial score</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>STRUCT Assess:</strong> Eligibility and participation in college &amp; company exams</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>User Dashboard:</strong> Profile history and exam submissions</span>
              </li>
            </ul>

            <Link
              href="/resume-builder"
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
              Build My Free Resume &rarr;
            </Link>
          </div>

          {/* Plan B: STRUCT Premium Resume Package */}
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
              Recommended • One-Time Upgrade
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#0284C7' }}>
                Plan B
              </span>
              <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                One-Time Payment
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              STRUCT Premium Resume Package
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
              Resume AI Enhancement + Detailed ATS Analysis. High-value upgrade for students aiming for top campus placements.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '28px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '-1.5px' }}>₹49</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>one-time (no recurring fees)</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Everything in STRUCT Free</strong> included</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>AI Resume Enhancement:</strong> Google X-Y-Z bullet rewrites, metric framing &amp; strong action verbs</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Detailed ATS Breakdown:</strong> Section scores for Education, Experience, Skills &amp; Formatting</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Keyword Gap Analysis:</strong> Match missing terms against target company job descriptions</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>Readability &amp; Format Guard:</strong> Detect parser-breaking fonts, symbols &amp; column errors</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#0A1B38', lineHeight: 1.45 }}>
                <span style={{ color: '#0284C7', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>✓</span>
                <span><strong>2 Complete Usages:</strong> Polish multiple target roles or re-scan after updates</span>
              </li>
            </ul>

            <button
              type="button"
              disabled={checkoutLoading}
              onClick={handleBuyPremium}
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
                cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                opacity: checkoutLoading ? 0.8 : 1,
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {checkoutLoading ? 'Connecting to Payment Gateway...' : 'Upgrade to Premium — ₹49 (One-Time) →'}
            </button>
          </div>
        </div>

        {/* Reassurance Footer */}
        <div style={{ textAlign: 'center', marginTop: '36px', color: '#64748B', fontSize: '0.86rem' }}>
          <span>🔒 Secured via Razorpay (UPI, Google Pay, PhonePe, Cards, NetBanking). Instant activation.</span>
        </div>
      </div>
    </section>
  );
}

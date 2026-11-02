'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

export default function IndividualPortal() {
  const [credits, setCredits] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const fetchCredits = (email: string) => {
    fetch(`/api/entitlements/balance?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCredits(d.balance);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('struct_user_email') || 'candidate@structonline.in';
      const name = localStorage.getItem('struct_user_name') || '';
      setUserEmail(email);
      setUserName(name);
      fetchCredits(email);
    }
  }, []);

  const handleBuyPremium = async () => {
    setCheckoutErr(null);
    setCheckoutMsg(null);
    setCheckoutLoading(true);

    try {
      const email = userEmail.trim() || 'candidate@structonline.in';

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'resume_ai_pack_49',
          userEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate payment order.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your connection.');
      }

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'STRUCT Career Platform',
        description: 'STRUCT Premium Resume Package (₹49)',
        order_id: data.orderId,
        prefill: {
          email,
        },
        theme: {
          color: '#0A1B38',
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setCheckoutMsg('Checkout modal closed.');
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
            setCheckoutMsg('Payment successful! Your Premium Resume AI & Detailed ATS credits are now active.');
            fetchCredits(email);
          } catch (vErr: any) {
            setCheckoutErr(vErr.message || 'Payment verification error.');
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      rzp.open();
    } catch (err: any) {
      setCheckoutErr(err.message || 'Failed to process checkout.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFD', color: '#0F172A', padding: '36px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, background: '#FFFFFF', padding: '22px 28px', borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#0284C7', color: '#FFFFFF', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                STRUCT CANDIDATE DASHBOARD
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0A1B38' }}>
                {userName ? `Welcome back, ${userName}` : 'Student Career & Assessment Hub'}
              </h1>
            </div>
            <p style={{ color: '#64748B', fontSize: 13, margin: '4px 0 0' }}>
              Connected account: <strong>{userEmail || 'Active Candidate'}</strong> &bull; Free Plan Active
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#F1F5F9', padding: '8px 16px', borderRadius: 8, textAlign: 'right', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>AI Polish Balance</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0284C7' }}>
                {credits !== null ? `${credits} Credits` : '0 Credits'}
              </div>
            </div>
            <Link
              href="/assess"
              style={{
                background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(10, 27, 56, 0.15)'
              }}
            >
              Enter Exams &rarr;
            </Link>
          </div>
        </div>

        {/* Feedback Alerts */}
        {checkoutMsg && (
          <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '12px 18px', borderRadius: 10, marginBottom: 20 }}>
            {checkoutMsg}
          </div>
        )}
        {checkoutErr && (
          <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '12px 18px', borderRadius: 10, marginBottom: 20 }}>
            {checkoutErr}
          </div>
        )}

        {/* 3 Core Product Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 36 }}>
          {/* Card 1: STRUCT Assess */}
          <div style={{ background: '#FFFFFF', border: '2px solid #0284C7', borderRadius: 14, padding: 24, boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>STRUCT ASSESS</span>
              <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>Live Proctored</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: '#0A1B38' }}>Technical Examinations</h3>
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px', flex: 1 }}>
              Official college drives, anti-cheat monitored examinations, timed MCQs, and full answer submission tracking.
            </p>
            <Link
              href="/assess"
              style={{
                display: 'inline-block',
                background: '#0284C7',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Enter Exam Portal &rarr;
            </Link>
          </div>

          {/* Card 2: Resume Builder */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>RESUME BUILDER</span>
              <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>Free Tool</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: '#0A1B38' }}>ATS Resume Builder</h3>
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px', flex: 1 }}>
              Create a recruiter-ready resume with real-time formatting, education and project tracking, and vector PDF download.
            </p>
            <Link
              href="/resume-builder"
              style={{
                display: 'inline-block',
                background: '#0A1B38',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Open Resume Builder &rarr;
            </Link>
          </div>

          {/* Card 3: ATS Resume Checker */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>ATS DIAGNOSTIC</span>
              <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>Free Scan</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: '#0A1B38' }}>ATS Resume Checker</h3>
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px', flex: 1 }}>
              Test your resume against modern ATS scanning algorithms, identify keyword gaps, and check structural balance.
            </p>
            <Link
              href="/#resume-checker"
              style={{
                display: 'inline-block',
                background: '#475569',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Run ATS Scanner &rarr;
            </Link>
          </div>
        </div>

        {/* Section: Single Authoritative Upgrade Card */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '2px solid #0284C7', padding: '36px 32px', boxShadow: '0 12px 36px rgba(2, 132, 199, 0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', padding: '4px 10px', background: '#E0F2FE', borderRadius: 6, color: '#0369A1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                STUDENT VALUE UPGRADE &bull; ONE-TIME PAYMENT
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0A1B38', margin: '0 0 8px' }}>
                STRUCT Premium Resume Package
              </h2>
              <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                Resume AI Enhancement + Detailed ATS Analysis. Includes 2 complete runs with Google X-Y-Z bullet rewrites, metric optimizations, keyword gap matching, and section-by-section breakdown.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: 13, color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> 2 Complete AI Enhancement Runs
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> Google X-Y-Z Bullet Rewriting
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> Deep Section ATS Score Breakdown
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#0284C7' }}>✓</strong> One-time ₹49 payment (No recurring fees)
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 240 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#0A1B38', lineHeight: 1 }}>₹49</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, margin: '4px 0 16px' }}>one-time payment</div>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleBuyPremium}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '13px 24px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  opacity: checkoutLoading ? 0.8 : 1,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                {checkoutLoading ? 'Connecting...' : 'Upgrade Now — ₹49 →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

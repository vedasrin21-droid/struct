'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

interface Plan {
  id: string;
  tierCode: string;
  target: string;
  name: string;
  priceInr: number;
  billingCycle: string;
  limits: any;
}

export default function IndividualPortal() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('struct_user_email') || '' : ''));
  const [promoCode, setPromoCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
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
    // 1. Fetch individual plans
    fetch('/api/plans?target=individual')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.plans) {
          setPlans(d.plans);
        }
      })
      .catch(() => {});

    // 2. Fetch credits if email stored in localStorage
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('struct_user_email') : null;
    if (savedEmail) {
      fetchCredits(savedEmail);
    }
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutMsg(null);
    setCheckoutErr(null);
    setCheckoutLoading(true);

    try {
      const email = emailInput.trim() || 'candidate@struct.careers';
      localStorage.setItem('struct_user_email', email);

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: plan.tierCode,
          promoCode: promoCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate plan checkout');

      if (data.isFree) {
        setCheckoutMsg(`Plan ${plan.name} activated successfully.`);
        fetchCredits(email);
        setCheckoutLoading(false);
      } else {
        setCheckoutMsg(`Launching Razorpay checkout for ₹${(data.amountPaise / 100).toFixed(0)}...`);
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || typeof window === 'undefined' || !(window as any).Razorpay) {
          throw new Error('Unable to load payment gateway. Please check your internet connection and try again.');
        }

        const rzp = new (window as any).Razorpay({
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency || 'INR',
          name: 'STRUCT Career Platform',
          description: `${plan.name} Subscription`,
          order_id: data.orderId,
          prefill: {
            email,
          },
          theme: {
            color: '#0284c7',
          },
          modal: {
            ondismiss: () => {
              setCheckoutLoading(false);
              setCheckoutMsg('Payment modal closed.');
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
              setCheckoutMsg(`Payment successful! Plan ${plan.name} is now active.`);
              fetchCredits(email);
            } catch (vErr: any) {
              setCheckoutErr(vErr.message || 'Payment verification error.');
            } finally {
              setCheckoutLoading(false);
            }
          },
        });
        rzp.open();
      }
    } catch (err: any) {
      setCheckoutErr(err.message);
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '36px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, background: '#ffffff', padding: '20px 24px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                STRUCT CANDIDATE HUB
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Technical Assessments &amp; Career Hub
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
              Take proctored coding exams, self-enroll in public practice benchmarks, and optimize your resume.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#f1f5f9', padding: '6px 14px', borderRadius: 8, textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Active Credits Balance</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0284c7' }}>
                {credits !== null ? `${credits} Usages` : '0 Usages'}
              </div>
            </div>
            <Link
              href="/assess"
              style={{
                background: '#0a1b38',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Take Exam &rarr;
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {checkoutMsg && (
          <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {checkoutMsg}
          </div>
        )}
        {checkoutErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {checkoutErr}
          </div>
        )}

        {/* Core Actions Grid: Highlight Assessments & AI Interviews First */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 36 }}>
          {/* Card 1: Technical Mock Assessments (Primary Flagship) */}
          <div style={{ background: '#ffffff', border: '2px solid #0284c7', borderRadius: 14, padding: 24, boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>CORE ENGINE</span>
              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>Live Proctored</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Proctored Technical Assessments</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
              Full-stack coding challenges, TypeScript/React benchmarks, and timed MCQs with server-side scoring and tab-switch telemetry.
            </p>
            <Link
              href="/assess"
              style={{
                display: 'inline-block',
                background: '#0284c7',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Enter Exam Portal &rarr;
            </Link>
          </div>

          {/* Card 2: Adaptive AI Mock Interviews (Version 2 Preview) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>VERSION 2 ROADMAP</span>
              <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>In Development</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>AI Mock Technical Interviews</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
              Adaptive technical screeners and behavioral STAR interview simulations are launching in Version 2. Standardized practice assessments are available now.
            </p>
            <div
              style={{
                display: 'inline-block',
                background: '#f8fafc',
                color: '#64748b',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: 'default',
              }}
            >
              Coming in Version 2 &bull; Roadmap
            </div>
          </div>

          {/* Card 3: Resume Diagnostic (Entry Utility) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ENTRY UTILITY</span>
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>Free Tool</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>ATS Resume Diagnostic &amp; Builder</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
              Test your resume against ATS parsers, match job description skills, and rewrite weak bullet points with Google X-Y-Z formula.
            </p>
            <Link
              href="/#resume-checker"
              style={{
                display: 'inline-block',
                background: '#475569',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Run ATS Scanner &rarr;
            </Link>
          </div>
        </div>

        {/* Section: Premium Preparation Plans */}
        <div id="plans" style={{ marginBottom: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', padding: '4px 12px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: 999, color: '#0284c7', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
              Authoritative Pro Plans &amp; Pricing
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#0f172a' }}>
              Individual Pro Preparation Memberships
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
              Unlock monthly proctored technical exams, public practice catalog enrollment, and executive resume enhancements with transparent Rupee billing.
            </p>
          </div>

          {/* Promo code bar */}
          <div style={{ maxWidth: 440, margin: '0 auto 28px', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Promo code (e.g. LAUNCH50)"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          {/* Plans Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {plans.map((p) => {
              const isPro = p.tierCode === 'struct_pro';
              const isElite = p.tierCode === 'struct_elite';
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    border: isPro ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: 28,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: isPro ? '0 12px 30px -5px rgba(2, 132, 199, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  {isPro && (
                    <div style={{ position: 'absolute', top: -12, right: 24, background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 999 }}>
                      MOST POPULAR • BEST VALUE
                    </div>
                  )}

                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{p.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '14px 0 16px' }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: '#0f172a' }}>₹{p.priceInr}</span>
                    <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>/ month</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>&check;</span>
                      <span><strong>{p.limits?.mockAssessmentsPerMonth}</strong> Proctored Mock Assessments / mo</span>
                    </li>
                    <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>&check;</span>
                      <span>Public Practice Catalog Self-Enrollment</span>
                    </li>
                    <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>&check;</span>
                      <span><strong>{p.limits?.resumeAiCredits}</strong> Executive Resume AI Polish Usages</span>
                    </li>
                    <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>&check;</span>
                      <span>Comprehensive <strong>{p.limits?.historyDays}</strong>-day score &amp; telemetry history</span>
                    </li>
                    {isElite && (
                      <li style={{ padding: '6px 0', fontSize: 14, color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#0284c7', fontWeight: 800 }}>&check;</span>
                        <span>Standardized FAANG &amp; Tier-1 Assessment Benchmarks</span>
                      </li>
                    )}
                  </ul>

                  <button
                    disabled={checkoutLoading}
                    onClick={() => handleSubscribe(p)}
                    style={{
                      width: '100%',
                      background: isPro ? '#0284c7' : '#0a1b38',
                      color: '#ffffff',
                      border: 'none',
                      padding: '13px 0',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                      boxShadow: isPro ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                    }}
                  >
                    {checkoutLoading && selectedPlan?.id === p.id ? 'Connecting Gateway...' : `Subscribe to ${p.name} (₹${p.priceInr})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

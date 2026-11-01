'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function PricingSection() {
  const [billingTarget, setBillingTarget] = useState<'individual' | 'organization'>('individual');
  const [annualBilling, setAnnualBilling] = useState(false);

  const individualPlans = [
    {
      tier: 'struct_starter',
      name: 'Starter Prep',
      badge: 'Free Tier',
      tagline: 'Essential diagnostic entry tools for aspiring engineers.',
      priceMonthly: 0,
      period: 'forever',
      popular: false,
      features: [
        '5 Proctored Mock Assessments / mo',
        'Public Practice Assessment Catalog Access',
        '3 Resume ATS Score Checks',
        'Standard Question Bank & Explanations',
        '30-Day Performance History',
      ],
      ctaText: 'Start Free Prep',
      ctaLink: '/assess',
      accentColor: '#64748B',
    },
    {
      tier: 'struct_pro',
      name: 'STRUCT Pro',
      badge: 'Most Popular',
      tagline: 'Intensive preparation for technical campus & company drives.',
      priceMonthly: annualBilling ? 199 : 249,
      period: 'per month',
      popular: true,
      features: [
        '20 Proctored Mock Assessments / mo',
        '10 Executive AI Resume Polish Usages (X-Y-Z formula)',
        'Full Anti-Cheat Simulation (Tab switch & proctoring check)',
        '90-Day Comprehensive Benchmark Analytics',
        'Standardized Rank & Percentile Leaderboard',
        'Priority Practice Catalog Access',
      ],
      ctaText: 'Upgrade to Pro — ₹' + (annualBilling ? '199' : '249'),
      ctaLink: '/portal',
      accentColor: '#0284C7',
    },
    {
      tier: 'struct_elite',
      name: 'STRUCT Elite',
      badge: 'Maximum Impact',
      tagline: 'Complete FAANG & Tier-1 company hiring readiness.',
      priceMonthly: annualBilling ? 399 : 499,
      period: 'per month',
      popular: false,
      features: [
        '50 Proctored Mock Assessments / mo',
        '25 Executive AI Resume Polish Usages',
        'Standardized FAANG & Tier-1 Assessment Benchmarks',
        '180-Day Audit History & Career Insights',
        'Priority Proctored Evaluation & Fast-track Review',
        'Full Answer Key & Solution Unmasking',
      ],
      ctaText: 'Get Elite Access — ₹' + (annualBilling ? '399' : '499'),
      ctaLink: '/portal',
      accentColor: '#0F172A',
    },
  ];

  const organizationPlans = [
    {
      tier: 'recruit_free',
      name: 'Recruit Free',
      badge: 'Starter Org',
      tagline: 'For small departments and trial hiring assessments.',
      priceMonthly: 0,
      period: 'forever',
      popular: false,
      features: [
        '1 Administrator Seat',
        '30-Minute Max Assessment Duration',
        'Public Question Bank Library',
        'Instant Server-Side Grading',
        'Basic Candidate Attempt Records',
      ],
      ctaText: 'Create Free Org',
      ctaLink: '/assess',
      accentColor: '#64748B',
    },
    {
      tier: 'recruit_pro',
      name: 'Recruit Pro',
      badge: 'High Value',
      tagline: 'Structured campus recruitment and department hiring drives.',
      priceMonthly: annualBilling ? 1199 : 1499,
      period: 'per month',
      popular: true,
      features: [
        '100 Candidate Evaluations / mo',
        '3 Administrator & Reviewer Seats',
        '60-Minute Max Assessment Duration',
        '5 Concurrent Hiring Campaigns',
        'Full Non-Invasive Proctoring Signals & Telemetry',
        'CSV Candidate Roster Import & Export',
      ],
      ctaText: 'Start Recruit Pro — ₹' + (annualBilling ? '1,199' : '1,499'),
      ctaLink: '/assess/admin',
      accentColor: '#0284C7',
    },
    {
      tier: 'recruit_business',
      name: 'Recruit Business',
      badge: 'Campus & Scale',
      tagline: 'For colleges, universities, and large engineering orgs.',
      priceMonthly: annualBilling ? 3999 : 4999,
      period: 'per month',
      popular: false,
      features: [
        '500 Candidate Evaluations / mo',
        '10 Administrator Seats',
        '120-Minute Max Assessment Duration',
        '20 Concurrent Exam Campaigns',
        'Custom Institutional Question Banking',
        'Advanced Cohort Analytics & Plagiarism Detection',
      ],
      ctaText: 'Select Business — ₹' + (annualBilling ? '3,999' : '4,999'),
      ctaLink: '/assess/admin',
      accentColor: '#0F172A',
    },
    {
      tier: 'recruit_enterprise',
      name: 'Enterprise',
      badge: 'Bespoke Scale',
      tagline: 'Nationwide campus drives and multi-tier enterprises.',
      priceMonthly: annualBilling ? 11999 : 14999,
      period: 'per month',
      popular: false,
      features: [
        '2,000+ Candidate Evaluations / mo',
        '25 Administrator Seats',
        '180-Minute Assessment Duration',
        'Unlimited Exam Campaigns',
        'Custom SSO (Clerk / SAML / Mode B Roster)',
        'Dedicated SLA & Custom Data Retention',
      ],
      ctaText: 'Contact Enterprise',
      ctaLink: '/assess/admin',
      accentColor: '#0284C7',
    },
  ];

  return (
    <section
      id="pricing"
      style={{
        padding: '96px 20px',
        background: '#FAF9F6',
        borderTop: '1px solid rgba(15, 23, 42, 0.08)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.2)',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0284C7',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            Transparent Indian Rupee (INR) Pricing
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2.1rem, 4vw, 3rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1px',
              margin: '0 0 14px 0',
            }}
          >
            Pro Features &amp; Authoritative Plans
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              color: '#64748B',
              maxWidth: '680px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6,
            }}
          >
            Predictable, transparent subscription tiers for individual technical candidates and institutional recruiters. All fees securely processed via Razorpay.
          </p>

          {/* Target Audience Switcher: Individual vs Organization */}
          <div
            style={{
              display: 'inline-flex',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '4px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingTarget('individual')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: billingTarget === 'individual' ? '#0A1B38' : 'transparent',
                color: billingTarget === 'individual' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Candidate Preparation Plans
            </button>
            <button
              type="button"
              onClick={() => setBillingTarget('organization')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: billingTarget === 'organization' ? '#0A1B38' : 'transparent',
                color: billingTarget === 'organization' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Recruiter &amp; College Plans
            </button>
          </div>

          {/* Annual Billing Discount Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '0.9rem', color: '#475569' }}>
            <span style={{ fontWeight: !annualBilling ? 700 : 500, color: !annualBilling ? '#0A1B38' : '#64748B' }}>Monthly</span>
            <button
              type="button"
              onClick={() => setAnnualBilling(!annualBilling)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: annualBilling ? '#0284C7' : '#CBD5E1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              aria-label="Toggle annual billing"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: annualBilling ? '23px' : '3px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <span style={{ fontWeight: annualBilling ? 700 : 500, color: annualBilling ? '#0284C7' : '#64748B' }}>
              Annual <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', marginLeft: '4px' }}>Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: billingTarget === 'individual' ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
            marginBottom: '48px',
          }}
        >
          {(billingTarget === 'individual' ? individualPlans : organizationPlans).map((plan, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: plan.popular ? '2px solid #0284C7' : '1px solid #E2E8F0',
                boxShadow: plan.popular ? '0 16px 36px rgba(2, 132, 199, 0.12)' : '0 4px 16px rgba(15, 23, 42, 0.04)',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transform: plan.popular ? 'scale(1.02)' : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-13px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                    {plan.name}
                  </h3>
                  {!plan.popular && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, minHeight: '38px', margin: '0 0 20px 0' }}>
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0A1B38' }}>₹</span>
                  <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0A1B38', lineHeight: 1, letterSpacing: '-1.5px' }}>
                    {plan.priceMonthly.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.86rem', color: '#64748B', fontWeight: 600 }}>
                    / {plan.period}
                  </span>
                </div>

                {/* Feature Bullet Points */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '20px', marginBottom: '28px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
                    Included Capabilities
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            minWidth: '18px',
                            borderRadius: '50%',
                            background: '#DCFCE7',
                            color: '#15803D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <Link
                  href={plan.ctaLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: '10px',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                    background: plan.popular ? '#0284C7' : '#0A1B38',
                    color: '#FFFFFF',
                    boxShadow: plan.popular ? '0 4px 14px rgba(2, 132, 199, 0.28)' : '0 2px 6px rgba(10, 27, 56, 0.1)',
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {plan.ctaText} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Micro-Pack Callout Card: ₹49 Resume AI Pack */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0A1B38 0%, #12336B 100%)',
            borderRadius: '16px',
            padding: '24px 32px',
            color: '#FFFFFF',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 8px 24px rgba(10, 27, 56, 0.15)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ background: '#38BDF8', color: '#0A1B38', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Quick Diagnostic Entry
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Need just a quick resume polish? Try the ₹49 Executive AI Pack
              </h4>
            </div>
            <p style={{ color: '#CBD5E1', fontSize: '0.88rem', margin: 0, maxWidth: '640px' }}>
              Includes 2 full AI usages: Google X-Y-Z quantifiable bullet rewrites, tailored executive summary, and ATS-tested PDF export with zero recurring subscription commitment.
            </p>
          </div>
          <Link
            href="/portal"
            style={{
              background: '#38BDF8',
              color: '#0A1B38',
              padding: '10px 22px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.9rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Get ₹49 Pack &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

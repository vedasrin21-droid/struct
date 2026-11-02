'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadRazorpayScript } from '@/lib/payments/clientCheckout';

export default function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Feedback Form State
  const [overallRating, setOverallRating] = useState<number>(5);
  const [navigationRating, setNavigationRating] = useState<number>(5);
  const [technicalIssues, setTechnicalIssues] = useState<string>('none');
  const [likedAspects, setLikedAspects] = useState<string>('');
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<string>('yes');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);

  // Premium Package Checkout State
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assess/candidate/exams/${examId}/status`)
      .then(res => res.json())
      .then(resData => {
        if (!resData.hasStarted || resData.status !== 'submitted') {
          router.push(`/assess/candidate`);
          return;
        }
        setData(resData);
      })
      .catch((err: any) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId, router]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackErr(null);
    setFeedbackSubmitting(true);

    try {
      const email = typeof window !== 'undefined' ? localStorage.getItem('struct_user_email') || '' : '';
      const name = typeof window !== 'undefined' ? localStorage.getItem('struct_user_name') || '' : '';

      const res = await fetch('/api/assess/candidate/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          attemptId: data?.attemptId,
          overallRating,
          navigationRating,
          technicalIssues,
          likedAspects,
          improvementSuggestions,
          wouldRecommend,
          marketingConsent,
          email,
          name,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to submit examination feedback');
      }

      setFeedbackSubmitted(true);
    } catch (err: any) {
      setFeedbackErr(err.message || 'Unable to record feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

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

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initiate payment.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Unable to connect to Razorpay payment gateway.');
      }

      const rzp = new (window as any).Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'STRUCT Career Platform',
        description: 'Resume AI Enhancement + Detailed ATS Analysis (₹49)',
        order_id: orderData.orderId,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: '#0A1B38',
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setCheckoutMsg('Checkout closed.');
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
            setCheckoutMsg('Payment successful! Your Premium Resume AI credits are active.');
            setTimeout(() => {
              window.location.href = '/resume-builder?upgrade=success';
            }, 1200);
          } catch (vErr: any) {
            setCheckoutErr(vErr.message || 'Payment verification error.');
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      rzp.open();
    } catch (err: any) {
      setCheckoutErr(err.message || 'Failed to initialize payment gateway.');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFD' }}>
        <div style={{ textAlign: 'center', color: '#64748B', fontFamily: 'sans-serif' }}>
          Loading official submission verification...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFD', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '32px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', maxWidth: '440px' }}>
          <h2 style={{ color: '#991B1B', marginBottom: '8px' }}>Unable to Load Receipt</h2>
          <p style={{ color: '#64748B', marginBottom: '16px', fontSize: '0.9rem' }}>{error || 'No submitted session found'}</p>
          <Link href="/assess/candidate" style={{ padding: '10px 18px', background: '#0A1B38', color: '#FFFFFF', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, display: 'inline-block' }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { exam, attemptId, submittedAt, resultsReleased, score, passStatus, questions, savedAnswers } = data;
  const receiptCode = `STRUCT-${attemptId.toUpperCase()}-${Number(submittedAt).toString(36).toUpperCase()}`;
  const submittedDate = new Date(submittedAt).toLocaleString();

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFD', color: '#0F172A', padding: '40px 20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Top Header Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '36px',
          boxShadow: '0 10px 30px rgba(10, 27, 56, 0.06)',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          {/* Success Checkmark Badge */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 auto 16px'
          }}>
            &#10003;
          </div>

          <span style={{
            background: '#E0F2FE',
            color: '#0369A1',
            padding: '4px 14px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            textTransform: 'uppercase'
          }}>
            Official Submission Receipt
          </span>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0A1B38', margin: '14px 0 6px 0', letterSpacing: '-0.5px' }}>
            {exam.title}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#64748B', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Congratulations! Your examination answers have been securely submitted and timestamped on the central server.
          </p>

          {/* Receipt Code Box */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '4px',
            border: '1px dashed #CBD5E1',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Verification Receipt Code
            </span>
            <code style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38', letterSpacing: '1px' }}>
              {receiptCode}
            </code>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Recorded on {submittedDate}
            </span>
          </div>

          {/* Result Release Banner */}
          {resultsReleased ? (
            <div style={{
              background: passStatus === 'passed' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${passStatus === 'passed' ? '#86EFAC' : '#FCA5A5'}`,
              borderRadius: '14px',
              padding: '24px',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: passStatus === 'passed' ? '#166534' : '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Performance Breakdown Released
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: passStatus === 'passed' ? '#15803D' : '#DC2626' }}>
                {score} <span style={{ fontSize: '1.2rem', color: '#64748B', fontWeight: 600 }}>/ {exam.total_marks}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '6px' }}>
                Status: <strong style={{ textTransform: 'capitalize', color: passStatus === 'passed' ? '#15803D' : '#DC2626' }}>{passStatus}</strong> (Passing threshold: {exam.pass_marks} marks)
              </div>
            </div>
          ) : (
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '14px',
              padding: '20px',
              marginTop: '12px',
              fontSize: '0.88rem',
              color: '#0369A1',
              lineHeight: 1.5
            }}>
              <strong>Evaluation Notice:</strong> Examination scores and ranking will be published once the evaluation window concludes. You will receive an email update at your registered address.
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}>
            <Link
              href="/portal"
              style={{
                background: '#0A1B38',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              My Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Print Receipt
            </button>
          </div>
        </div>

        {/* FEEDBACK FORM SECTION */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '36px',
          boxShadow: '0 4px 18px rgba(10, 27, 56, 0.04)',
          marginBottom: '24px'
        }}>
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#0284C7' }}>
              Candidate Experience Survey
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0A1B38', margin: '6px 0' }}>
              How was your examination experience?
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
              Your feedback directly shapes STRUCT assessments and campus examination reliability.
            </p>
          </div>

          {feedbackSubmitted ? (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: '#166534'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎉</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px' }}>Thank you for your valuable feedback!</h3>
              <p style={{ fontSize: '0.88rem', margin: 0, color: '#15803D' }}>
                Your responses have been recorded in our evaluation database.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit}>
              {feedbackErr && (
                <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.86rem' }}>
                  {feedbackErr}
                </div>
              )}

              {/* Question 1: Overall Rating */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '8px' }}>
                  1. Overall Examination Experience (1 = Poor, 5 = Excellent)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '8px',
                        border: overallRating === star ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        background: overallRating === star ? '#E0F2FE' : '#FFFFFF',
                        color: overallRating === star ? '#0369A1' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Navigation & Portal Ease */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '8px' }}>
                  2. Portal Navigation &amp; Question Flow Ease
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setNavigationRating(rate)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '8px',
                        border: navigationRating === rate ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        background: navigationRating === rate ? '#E0F2FE' : '#FFFFFF',
                        color: navigationRating === rate ? '#0369A1' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Technical Issues */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '8px' }}>
                  3. Did you encounter any technical issues?
                </label>
                <select
                  value={technicalIssues}
                  onChange={(e) => setTechnicalIssues(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    outline: 'none'
                  }}
                >
                  <option value="none">None — Smooth &amp; seamless</option>
                  <option value="minor_lag">Minor lag / Question load delay</option>
                  <option value="timer_confusion">Timer or auto-save hesitation</option>
                  <option value="reload_disconnection">Browser reload / connectivity hiccup</option>
                  <option value="other">Other technical observation</option>
                </select>
              </div>

              {/* Question 4: Liked Aspects */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '6px' }}>
                  4. What did you like most about the examination system? (Optional)
                </label>
                <input
                  type="text"
                  value={likedAspects}
                  onChange={(e) => setLikedAspects(e.target.value)}
                  placeholder="e.g. Clean interface, fast timer, intuitive category filtering..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Question 5: Suggestions for Improvement */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '6px' }}>
                  5. What can we improve for your next round? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={improvementSuggestions}
                  onChange={(e) => setImprovementSuggestions(e.target.value)}
                  placeholder="Tell us what would make future tests even better..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Question 6: Would Recommend */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0A1B38', marginBottom: '8px' }}>
                  6. Would you recommend STRUCT for college &amp; technical preparation?
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'Yes, definitely', val: 'yes' },
                    { label: 'Maybe / Neutral', val: 'maybe' },
                    { label: 'No', val: 'no' }
                  ].map((item) => (
                    <label
                      key={item.val}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: wouldRecommend === item.val ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        background: wouldRecommend === item.val ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: wouldRecommend === item.val ? 700 : 500,
                        color: wouldRecommend === item.val ? '#0369A1' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="recommend"
                        value={item.val}
                        checked={wouldRecommend === item.val}
                        onChange={() => setWouldRecommend(item.val)}
                        style={{ display: 'none' }}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional Marketing Consent Checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#0284C7' }}
                  />
                  <span>
                    Keep me updated with campus hiring drives, placement benchmarks, and free career prep resources from STRUCT.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={feedbackSubmitting}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0A1B38 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: feedbackSubmitting ? 'not-allowed' : 'pointer',
                  opacity: feedbackSubmitting ? 0.8 : 1,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
              >
                {feedbackSubmitting ? 'Recording Feedback...' : 'Submit Examination Feedback →'}
              </button>
            </form>
          )}
        </div>

        {/* POST-EXAMINATION PREMIUM RESUME CONVERSION BANNER */}
        <div style={{
          background: 'linear-gradient(135deg, #0A1B38 0%, #17264A 100%)',
          borderRadius: '20px',
          padding: '36px 32px',
          color: '#FFFFFF',
          boxShadow: '0 16px 40px rgba(10, 27, 56, 0.18)',
          marginBottom: '36px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ maxWidth: '500px' }}>
              <span style={{
                background: 'rgba(2, 132, 199, 0.3)',
                border: '1px solid rgba(2, 132, 199, 0.5)',
                color: '#7DD3FC',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '10px'
              }}>
                Next Career Step
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Ensure your resume passes company ATS filters
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 16px' }}>
                Now that you have proven your technical competence in this examination, make sure your resume does not get filtered out by algorithmic scanners.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#E2E8F0', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#38BDF8' }}>✓</strong> Google X-Y-Z bullet rewrites &amp; metric optimizations
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#38BDF8' }}>✓</strong> Deep keyword gap matching for company campus drives
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#38BDF8' }}>✓</strong> Section-by-section ATS breakdown
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: '220px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px 20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>₹49</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '4px 0 16px' }}>One-time student upgrade</div>

              {checkoutMsg && (
                <div style={{ fontSize: '0.8rem', color: '#34D399', marginBottom: '10px' }}>{checkoutMsg}</div>
              )}
              {checkoutErr && (
                <div style={{ fontSize: '0.8rem', color: '#F87171', marginBottom: '10px' }}>{checkoutErr}</div>
              )}

              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleBuyPremium}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  opacity: checkoutLoading ? 0.8 : 1,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  marginBottom: '10px'
                }}
              >
                {checkoutLoading ? 'Connecting...' : 'Upgrade Now — ₹49 →'}
              </button>

              <Link
                href="/resume-builder"
                style={{
                  fontSize: '0.78rem',
                  color: '#CBD5E1',
                  textDecoration: 'underline',
                  display: 'inline-block'
                }}
              >
                Or build my free resume first &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Detailed Solutions Review (Only when released and showAnswerKey permitted) */}
        {resultsReleased && data.showAnswerKey !== false && questions && questions.length > 0 && questions[0]?.correctOptionIndex !== undefined ? (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>
              Question-by-Question Solution Review
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {questions.map((q: any, idx: number) => {
                const userAns = savedAnswers[q.id];
                const selectedOpt = userAns ? userAns.selectedOption : null;
                const isCorrect = selectedOpt === q.correctOptionIndex;
                const isUnanswered = selectedOpt === null || selectedOpt === undefined;

                return (
                  <div
                    key={q.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: `1px solid ${isCorrect ? '#86EFAC' : isUnanswered ? '#CBD5E1' : '#FCA5A5'}`,
                      padding: '24px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0A1B38' }}>
                        Question {idx + 1} ({q.category})
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isCorrect ? '#DCFCE7' : isUnanswered ? '#F1F5F9' : '#FEE2E2',
                        color: isCorrect ? '#15803D' : isUnanswered ? '#64748B' : '#991B1B'
                      }}>
                        {isCorrect ? `Correct (+${q.marks})` : isUnanswered ? 'Unanswered (0.0)' : `Incorrect (-${q.negative_marks})`}
                      </span>
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '16px', lineHeight: 1.5 }}>
                      {q.text}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {q.options.map((opt: string, optIdx: number) => {
                        const isThisCorrect = optIdx === q.correctOptionIndex;
                        const isThisSelected = optIdx === selectedOpt;

                        let optBg = '#F8FAFC';
                        let optBorder = '1px solid #E2E8F0';
                        let optColor = '#334155';

                        if (isThisCorrect) {
                          optBg = '#F0FDF4';
                          optBorder = '1px solid #86EFAC';
                          optColor = '#166534';
                        } else if (isThisSelected && !isThisCorrect) {
                          optBg = '#FEF2F2';
                          optBorder = '1px solid #FCA5A5';
                          optColor = '#991B1B';
                        }

                        return (
                          <div
                            key={optIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: optBg,
                              border: optBorder,
                              color: optColor,
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{['A', 'B', 'C', 'D'][optIdx]}. {opt}</span>
                            {isThisCorrect && <strong style={{ fontSize: '0.75rem' }}>&check; Correct Solution</strong>}
                            {isThisSelected && !isThisCorrect && <strong style={{ fontSize: '0.75rem' }}>&cross; Your Selection</strong>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                        <strong>Rationale:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

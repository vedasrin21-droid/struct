'use client';

import React, { useState } from 'react';
import { startRazorpayCheckout, CheckoutResult } from '@/lib/payments/clientCheckout';

interface UpgradeAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccess?: (result: CheckoutResult) => void;
}

export function UpgradeAiModal({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccess,
}: UpgradeAiModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive your purchase receipt.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await startRazorpayCheckout({
      productId: 'resume_ai_pack_49',
      email: email.trim(),
      onSuccess: (res) => {
        setLoading(false);
        setSuccessMsg('Payment successful! 2 AI Usages have been credited.');
        if (onSuccess) onSuccess(res);
        setTimeout(() => {
          onClose();
        }, 1800);
      },
      onError: (err) => {
        setLoading(false);
        setErrorMsg(err.message || 'Payment was unsuccessful or cancelled.');
      },
      onDismiss: () => {
        setLoading(false);
      },
    });

    if (!result.success && result.error && !result.cancelled) {
      setLoading(false);
      setErrorMsg(result.error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 27, 56, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="colour-morph-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '28px',
          maxWidth: '480px',
          width: '100%',
          padding: '36px 32px',
          boxShadow: '0 25px 60px -15px rgba(18, 51, 107, 0.35)',
          border: '1px solid rgba(220, 230, 245, 0.95)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#F4F7FC',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#5E6C84',
            fontSize: '1.2rem',
            fontWeight: 700,
          }}
        >
          &times;
        </button>

        {/* Header Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span
            style={{
              background: 'linear-gradient(135deg, #EEF4FC 0%, #DCE6F5 100%)',
              color: '#12336B',
              fontSize: '0.76rem',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '20px',
              letterSpacing: '0.5px',
              border: '1px solid rgba(18, 51, 107, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ✨ STRUCT EXECUTIVE AI POLISH
          </span>
        </div>

        <h3
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#0A1B38',
            marginBottom: '8px',
            lineHeight: 1.25,
          }}
        >
          Unlock AI Resume Enhancement
        </h3>

        <p style={{ color: '#5E6C84', fontSize: '0.9rem', marginBottom: '22px', lineHeight: 1.5 }}>
          Upgrade from deterministic scoring to Google X-Y-Z metric bullet rewrites and a tailored executive summary.
        </p>

        {/* Feature List */}
        <div
          style={{
            background: '#F8FAFD',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '24px',
            border: '1px solid rgba(220, 230, 245, 0.9)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(220, 230, 245, 0.7)', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 800, color: '#12336B', fontSize: '1.25rem' }}>₹49</span>
            <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 800, background: '#DCFCE7', padding: '3px 10px', borderRadius: '12px' }}>
              Includes 2 Complete Usages
            </span>
          </div>

          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: '#172B4D', lineHeight: 1.7 }}>
            <li><strong>2 Full AI Enhancements</strong>: Bullet rewrites + executive summary.</li>
            <li><strong>Zero Risk</strong>: Failed AI processing never consumes a credit.</li>
            <li><strong>Never Expires</strong>: Usages remain active on your account.</li>
            <li><strong>One-time payment</strong>: No subscription or hidden recurring charges.</li>
          </ul>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleCheckout}>
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#12336B',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Email for Receipt & Usages
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1.5px solid rgba(18, 51, 107, 0.2)',
                fontSize: '0.92rem',
                color: '#0A1B38',
                outline: 'none',
              }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '14px',
                border: '1px solid #FCA5A5',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: '#F0FDF4',
                color: '#16A34A',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '14px',
                border: '1px solid #86EFAC',
              }}
            >
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              fontSize: '0.98rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #12336B 0%, #1D4ED8 100%)',
              boxShadow: '0 8px 20px rgba(18, 51, 107, 0.25)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing via Razorpay...' : 'Pay ₹49 with UPI / Card (Razorpay)'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <span style={{ fontSize: '0.72rem', color: '#8993A4' }}>
            🔒 Verified 256-bit SSL encrypted checkout powered by Razorpay.
          </span>
        </div>
      </div>
    </div>
  );
}

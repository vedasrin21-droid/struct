'use client';

import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10, 27, 56, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="clay-card-static"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '32px',
          position: 'relative',
          boxShadow: 'var(--clay-elevated)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--brand-border)',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--brand-dark)',
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--brand-card-subtle)',
              border: '1px solid var(--brand-border)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--brand-text)',
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

export function PrivacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <div style={{ color: 'var(--brand-text)', fontSize: '0.92rem', lineHeight: 1.7 }}>
        <p style={{ marginBottom: '14px' }}>
          <strong>Last updated: October 2026</strong>
        </p>
        <p style={{ marginBottom: '14px' }}>
          At <strong>STRUCT</strong>, your privacy and document confidentiality are paramount. We adhere to a strict <em>zero-persistence architecture</em> for all uploaded and analyzed documents.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          1. Document Processing &amp; Ephemeral Memory
        </h4>
        <p style={{ marginBottom: '14px' }}>
          When you upload a resume file (PDF or DOCX) or paste resume text, the file content is read into temporary server memory strictly for the duration of the analysis request. Once the diagnostic score is calculated and transmitted back to your browser, all in-memory copies are immediately deleted. No resumes are written to long-term storage or relational databases.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          2. Personal Identifiable Information (PII)
        </h4>
        <p style={{ marginBottom: '14px' }}>
          STRUCT extracts email addresses and phone numbers solely to verify ATS contact-field completeness. We do not catalog, build advertising profiles from, or distribute your contact details to recruiters or third-party brokers.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          3. AI Processing
        </h4>
        <p style={{ marginBottom: '14px' }}>
          When an AI provider is active, resume excerpts are transmitted through secure TLS API endpoints under standard zero-retention enterprise terms. Neither STRUCT nor our AI backend uses your private resume data to train public foundation models.
        </p>
      </div>
    </BaseModal>
  );
}

export function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Terms of Service">
      <div style={{ color: 'var(--brand-text)', fontSize: '0.92rem', lineHeight: 1.7 }}>
        <p style={{ marginBottom: '14px' }}>
          <strong>Last updated: October 2026</strong>
        </p>
        <p style={{ marginBottom: '14px' }}>
          By accessing and using the STRUCT Resume Score Checker service, you agree to these Terms of Service.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          1. Purpose of the Service
        </h4>
        <p style={{ marginBottom: '14px' }}>
          STRUCT provides automated resume diagnostics, ATS formatting checks, and keyword matching recommendations. The score and bullet recommendations are analytical estimates intended to assist job seekers. STRUCT does not guarantee employment, interview callbacks, or hiring outcomes.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          2. User Content &amp; Ownership
        </h4>
        <p style={{ marginBottom: '14px' }}>
          You retain 100% intellectual property ownership of any resume text or documents you submit to the service. By using STRUCT, you grant the system only the ephemeral computational rights necessary to process and display your diagnostic report.
        </p>

        <h4 style={{ color: 'var(--brand-dark)', fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
          3. Fair Use &amp; Limitations
        </h4>
        <p style={{ marginBottom: '14px' }}>
          You agree not to upload malicious scripts, reverse-engineer the API endpoints, or flood the analysis engine with automated volumetric traffic. File uploads are limited to 5 MB per request.
        </p>
      </div>
    </BaseModal>
  );
}

export function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Contact STRUCT">
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✉️</div>
          <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', color: 'var(--brand-dark)', marginBottom: '8px' }}>
            Message Sent Successfully
          </h4>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.92rem', marginBottom: '20px' }}>
            Thank you for reaching out, {name || 'there'}! The STRUCT team will review your message and reply to {email} shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="btn btn-primary btn-sm"
          >
            Close Window
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>
            Have feedback on your resume scoring report, suggestions for new features, or technical questions? Let us know below.
          </p>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--brand-dark)', marginBottom: '4px' }}>
              Your Name
            </label>
            <input
              type="text"
              required
              className="clay-input"
              placeholder="Alex Morgan"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--brand-dark)', marginBottom: '4px' }}>
              Your Email
            </label>
            <input
              type="email"
              required
              className="clay-input"
              placeholder="alex@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--brand-dark)', marginBottom: '4px' }}>
              Message
            </label>
            <textarea
              required
              className="clay-textarea"
              rows={4}
              placeholder="How can we assist you with STRUCT?"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
            Send Message
          </button>
        </form>
      )}
    </BaseModal>
  );
}

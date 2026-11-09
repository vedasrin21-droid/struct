'use client';

import React from 'react';
import Link from 'next/link';
import { StructLogo } from '@/components/StructLogo';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  FileText,
  BarChart3,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="ecell-page-wrapper">
      {/* 1. Executive Navbar */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <StructLogo size={36} subtitle="Recruitment Engine" />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="ecell-tag-pill">
              <span className="ecell-dot-indicator"></span>
              Recruitment 2026
            </span>
            <Link
              href="/launching-soon"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#12336B',
                textDecoration: 'none',
              }}
            >
              Platform Launch &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main style={{ flex: 1 }}>
        <section
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '60px 24px 40px',
            textAlign: 'center',
          }}
        >
          {/* Live Recruitment Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '100px',
              background: '#EEF4FC',
              border: '1.5px solid #DCE6F5',
              color: '#12336B',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.4px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(18, 51, 107, 0.06)',
            }}
          >
            <span className="ecell-dot-indicator"></span>
            ECELL HIRING &mdash; ROUND 1 IS LIVE
          </div>

          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1.5px',
              lineHeight: 1.15,
              maxWidth: '850px',
              margin: '0 auto 18px',
            }}
          >
            Your next opportunity <span style={{ color: '#0284C7' }}>starts here.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#5E6C84',
              maxWidth: '680px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            Official ECELL recruitment examination &amp; skill assessment portal. 
            20 questions. 15 minutes. 11 departments.
          </p>

          {/* Primary Action Callouts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '48px',
            }}
          >
            <Link
              href="/ecell/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 36px',
                background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                color: '#FFFFFF',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1.05rem',
                textDecoration: 'none',
                boxShadow: '0 12px 30px -4px rgba(18, 51, 107, 0.35)',
                transition: 'transform 0.2s ease',
              }}
            >
              Enter Assessment Portal
              <ArrowRight size={20} />
            </Link>

            <Link
              href="/launching-soon"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '15px 28px',
                background: '#FFFFFF',
                color: '#12336B',
                border: '1.5px solid #E4E2DC',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(18, 51, 107, 0.05)',
              }}
            >
              Platform Launch Nov 16
            </Link>
          </div>

          {/* Examination Key Specs Card */}
          <div
            style={{
              maxWidth: '820px',
              margin: '0 auto',
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1.5px solid #E4E2DC',
              boxShadow: '0 16px 36px -6px rgba(18, 51, 107, 0.10)',
              padding: '24px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '20px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#EEF4FC',
                  color: '#12336B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8993A4', textTransform: 'uppercase' }}>
                  Duration
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0A1B38' }}>15 Minutes</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#EEF4FC',
                  color: '#12336B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8993A4', textTransform: 'uppercase' }}>
                  Structure
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0A1B38' }}>20 MCQs (1 Track)</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#EEF4FC',
                  color: '#12336B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8993A4', textTransform: 'uppercase' }}>
                  Attempts
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0A1B38' }}>Single Attempt</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8993A4', textTransform: 'uppercase' }}>
                  Proctored
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803D' }}>Anti-Cheat V2</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. The 11 Participating Departments */}
        <section
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '30px 24px 60px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '8px',
              }}
            >
              11 Official Recruitment Tracks
            </h2>
            <p style={{ color: '#5E6C84', fontSize: '0.92rem' }}>
              Candidates select one track upon logging in. Questions are tailored specifically to your chosen domain.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {[
              { code: 'TECHNICAL', name: 'Technical', desc: 'Software, web development, infra & architectures' },
              { code: 'DESIGN', name: 'Design', desc: 'Graphic design, UI/UX, typography & visual identity' },
              { code: 'MARKETING', name: 'Marketing & Outreach', desc: 'Campaign strategies, conversion funnels & branding' },
              { code: 'EVENTS', name: 'Event Management', desc: 'Planning, scheduling, speaker management & rundowns' },
              { code: 'CONTENT_MEDIA', name: 'Content & Media', desc: 'Editorial writing, storytelling & social calendars' },
              { code: 'VIDEOGRAPHY', name: 'Videography', desc: 'Production, composition, editing & sound engineering' },
              { code: 'INCUBATION', name: 'Incubation & Innovation', desc: 'Venture validation, mentoring, prototyping & pitch decks' },
              { code: 'PR_HR', name: 'PR & HR', desc: 'Public relations, institutional culture & onboarding' },
              { code: 'SPONSORSHIP', name: 'Sponsorship', desc: 'Corporate outreach, pitch kits & deliverable tracking' },
              { code: 'LOGISTICS', name: 'Logistics & Operations', desc: 'Venue management, equipment tracking & supplies' },
              { code: 'OFFSTAGE', name: 'Off-Stage', desc: 'Backstage readiness, prop cues & performer coordination' },
            ].map((dept) => (
              <div
                key={dept.code}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1.5px solid #E4E2DC',
                  padding: '16px 18px',
                  boxShadow: '0 4px 12px rgba(18, 51, 107, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                    {dept.code}
                  </span>
                  <CheckCircle2 size={15} color="#15803D" />
                </div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0A1B38', marginBottom: '4px' }}>
                  {dept.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5E6C84', lineHeight: 1.4 }}>
                  {dept.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Full STRUCT SaaS Suite (Coming Nov 16) */}
        <section
          style={{
            maxWidth: '1100px',
            margin: '0 auto 60px',
            padding: '40px 32px',
            background: 'linear-gradient(135deg, #07152E 0%, #0A1B38 50%, #12336B 100%)',
            borderRadius: '24px',
            color: '#FFFFFF',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 36px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#38BDF8',
              }}
            >
              FULL PLATFORM LAUNCH &bull; NOV 16, 2026
            </span>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '2rem',
                fontWeight: 800,
                margin: '10px 0 12px',
                letterSpacing: '-0.5px',
              }}
            >
              The Enterprise Career Intelligence Platform
            </h2>
            <p style={{ color: '#DCE6F5', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Join the priority access waitlist to unlock our complete career preparation suite when we launch nationwide.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {[
              { icon: FileText, title: 'ATS Score Checker', desc: 'Real-time resume parse & parser scoring' },
              { icon: Sparkles, title: 'AI Resume Builder', desc: 'Executive layouts, bullet improver & exports' },
              { icon: BarChart3, title: 'Technical Assessments', desc: 'Anti-cheat skill benchmarks & certifications' },
              { icon: Layers, title: 'AI Mock Interviews', desc: 'Domain-specific voice & transcript evaluation' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  href="/launching-soon"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '20px 18px',
                    textDecoration: 'none',
                    color: '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={22} color="#38BDF8" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>{f.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#DCE6F5', lineHeight: 1.4 }}>{f.desc}</div>
                </Link>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              href="/launching-soon"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                background: '#0284C7',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.92rem',
                textDecoration: 'none',
              }}
            >
              Join Launch Waitlist &rarr;
            </Link>
          </div>
        </section>
      </main>

      {/* 5. Institutional Footer */}
      <footer className="ecell-footer">
        <div className="ecell-footer-inner">
          <div>
            <span style={{ fontWeight: 800, color: '#0A1B38' }}>STRUCT Assessment Suite &bull; ECELL Hiring 2026</span>
            <div style={{ fontSize: '0.78rem', color: '#8993A4', marginTop: '4px' }}>
              Proctored &amp; Encrypted Examination Environment &bull; Vishnu Educational Development
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/ecell/login" style={{ color: '#0A1B38', fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>
              Student Login
            </Link>
            <Link href="/admin/ecell" style={{ color: '#5E6C84', fontWeight: 600, textDecoration: 'none', fontSize: '0.84rem' }}>
              Admin Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

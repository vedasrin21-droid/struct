'use client';

import React, { useState } from 'react';

export type TaviMood = 'thinking' | 'encouraging' | 'helpful' | 'motivating' | 'friendly';

interface TaviCompanionProps {
  initialMood?: TaviMood;
  onCheckResumeClick?: () => void;
}

export function TaviCompanion({ initialMood = 'friendly', onCheckResumeClick }: TaviCompanionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState<TaviMood>(initialMood);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'checklist' | 'verbs'>('dialogue');
  const [copiedVerb, setCopiedVerb] = useState<string | null>(null);

  const moodData: Record<TaviMood, { label: string; quote: string; role: string; tag: string }> = {
    thinking: {
      label: 'Thinking',
      role: 'ATS Diagnostic Analyst',
      tag: 'SCAN_ACTIVE',
      quote: 'ATS parsers look for standard section headers (Experience, Education, Skills). Never hide contact info inside headers or footers, and keep columns simple.',
    },
    encouraging: {
      label: 'Encouraging',
      role: 'Confidence Booster',
      tag: 'PROGRESS_OPTIMAL',
      quote: 'You are on the right track! The strongest resumes focus on high-impact results rather than routine daily duties. Highlight what changed because of your work.',
    },
    helpful: {
      label: 'Helpful',
      role: 'Actionable Advice Specialist',
      tag: 'REWRITE_READY',
      quote: 'Apply the Google X-Y-Z formula to every experience line: "Accomplished [X], measured by [Y], by executing [Z]". It instantly converts passive text into leadership proof.',
    },
    motivating: {
      label: 'Motivating',
      role: 'Career Momentum Coach',
      tag: 'MOMENTUM_HIGH',
      quote: 'Hiring teams review candidates fast. Give them clear proof of impact within the first 10 lines. You have the skills — now let your resume reflect them!',
    },
    friendly: {
      label: 'Friendly',
      role: 'Your Career Companion',
      tag: 'TAVI_READY',
      quote: 'Hello! I am Tavi, your Talvyn career companion. I am here to help you navigate ATS filters, sharpen your bullets, and land interviews you deserve.',
    },
  };

  const checklistItems = [
    { id: 'c1', label: 'Single column or ATS-safe layout without tables or textboxes' },
    { id: 'c2', label: 'Every bullet point begins with an active past-tense verb' },
    { id: 'c3', label: 'Quantifiable metrics ($, %, hours, users) present in top achievements' },
    { id: 'c4', label: 'Core job description keywords reflected accurately in Skills' },
    { id: 'c5', label: 'Standard section headers (Experience, Education, Skills, Projects)' },
  ];
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const powerVerbs = [
    { cat: 'LEADERSHIP', words: ['Spearheaded', 'Orchestrated', 'Directed', 'Mobilized'] },
    { cat: 'ENGINEERING', words: ['Architected', 'Engineered', 'Optimized', 'Scaled'] },
    { cat: 'ANALYTICS', words: ['Benchmarked', 'Synthesized', 'Diagnosed', 'Formulated'] },
    { cat: 'DELIVERY', words: ['Accelerated', 'Implemented', 'Revamped', 'Streamlined'] },
  ];

  const handleCopyVerb = (verb: string) => {
    navigator.clipboard.writeText(verb);
    setCopiedVerb(verb);
    setTimeout(() => setCopiedVerb(null), 2000);
  };

  const activeMoodInfo = moodData[currentMood];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Expanded Companion Panel */}
      {isOpen ? (
        <div
          className="colour-morph-card"
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: '24px',
            background: 'linear-gradient(160deg, #FFFFFF 0%, #F5F3EE 100%)',
            boxShadow: '0 24px 56px -12px rgba(18, 51, 107, 0.28), 0 0 0 1px rgba(18, 51, 107, 0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            animation: 'floatSlow 10s ease-in-out infinite alternate',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #12336B 0%, #0A1B38 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`/tavi-avatar-${currentMood}.png`}
                  alt="Tavi"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Tavi
                  </span>
                  <span
                    className="tech-tag"
                    style={{
                      fontSize: '0.62rem',
                      padding: '2px 6px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#DCE6F5',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {activeMoodInfo.tag}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#DCE6F5', opacity: 0.85 }}>
                  {activeMoodInfo.role}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              CLOSE
            </button>
          </div>

          {/* Navigation Pill Switcher */}
          <div
            style={{
              display: 'flex',
              padding: '10px 14px',
              gap: '6px',
              background: '#EEF4FC',
              borderBottom: '1px solid var(--brand-border)',
            }}
          >
            {[
              { id: 'dialogue', label: 'Tavi Advice' },
              { id: 'checklist', label: 'ATS Checklist' },
              { id: 'verbs', label: 'Power Verbs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: activeTab === tab.id ? 700 : 600,
                  background: activeTab === tab.id ? '#12336B' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : 'var(--brand-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeTab === tab.id ? '0 2px 6px rgba(18, 51, 107, 0.2)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
            {activeTab === 'dialogue' && (
              <div>
                {/* Robot Mood Avatar & Speech */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: '16px',
                    background: '#FFFFFF',
                    padding: '14px',
                    borderRadius: '18px',
                    border: '1px solid var(--brand-border)',
                    boxShadow: 'var(--clay-inset)',
                  }}
                >
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: 'var(--brand-soft-blue-light)',
                      border: '1.5px solid var(--brand-soft-blue)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={`/tavi-avatar-${currentMood}.png`}
                      alt={activeMoodInfo.label}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                      MODE: {activeMoodInfo.label}
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--brand-text)', lineHeight: 1.45, marginTop: '4px' }}>
                      {activeMoodInfo.quote}
                    </p>
                  </div>
                </div>

                {/* Mood Switcher Pills */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select Tavi State:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {(['thinking', 'encouraging', 'helpful', 'motivating', 'friendly'] as TaviMood[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setCurrentMood(m)}
                        style={{
                          padding: '6px 2px',
                          borderRadius: '8px',
                          border: currentMood === m ? '1.5px solid var(--brand-primary)' : '1px solid var(--brand-border)',
                          background: currentMood === m ? 'var(--brand-soft-blue)' : '#FFFFFF',
                          color: currentMood === m ? 'var(--brand-primary)' : 'var(--brand-text-muted)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Action Shortcut */}
                {onCheckResumeClick && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onCheckResumeClick();
                    }}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    Run ATS Resume Check
                  </button>
                )}
              </div>
            )}

            {activeTab === 'checklist' && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pre-Submission ATS Audit:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {checklistItems.map((item) => {
                    const isDone = !!checkedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: isDone ? 'var(--accent-green-bg)' : '#FFFFFF',
                          border: isDone ? '1px solid var(--accent-green-border)' : '1px solid var(--brand-border)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isDone ? '2px solid var(--accent-green)' : '1.5px solid var(--brand-text-light)',
                            background: isDone ? 'var(--accent-green)' : 'transparent',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          {isDone ? '✓' : ''}
                        </div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: isDone ? 'var(--accent-green)' : 'var(--brand-text)',
                            textDecoration: isDone ? 'line-through' : 'none',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'verbs' && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  High-Impact Power Verbs (Click to Copy):
                </div>
                {copiedVerb && (
                  <div
                    style={{
                      padding: '6px 12px',
                      background: 'var(--accent-green-bg)',
                      color: 'var(--accent-green)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      marginBottom: '10px',
                      textAlign: 'center',
                      border: '1px solid var(--accent-green-border)',
                    }}
                  >
                    COPIED &quot;{copiedVerb}&quot; TO CLIPBOARD
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {powerVerbs.map((group) => (
                    <div key={group.cat}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--brand-primary)', marginBottom: '4px', letterSpacing: '0.5px' }}>
                        {group.cat}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {group.words.map((w) => (
                          <button
                            key={w}
                            onClick={() => handleCopyVerb(w)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              border: '1px solid var(--brand-border)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--brand-dark)',
                              cursor: 'pointer',
                              boxShadow: 'var(--clay-pill)',
                            }}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed Floating Companion Trigger */
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 18px 8px 8px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #12336B 0%, #0A1B38 100%)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 16px 36px -6px rgba(18, 51, 107, 0.4), 0 0 0 1px rgba(18, 51, 107, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="tavi-floating-btn"
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#FFFFFF',
              border: '2px solid rgba(220, 230, 245, 0.9)',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <img
              src="/tavi-avatar-friendly.png"
              alt="Tavi Bot"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#15803D',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '-0.2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Ask Tavi</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#DCE6F5',
                  fontWeight: 800,
                }}
              >
                AI
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#DCE6F5', opacity: 0.85 }}>
              Career Companion
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

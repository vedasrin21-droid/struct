'use client';

import React, { useState, useRef } from 'react';
import {
  ResumeData,
  WorkExperienceItem,
  EducationItem,
  ProjectItem,
  CertificationItem,
  ResumeSectionKey,
  AnalysisResult,
} from '@/types';
import { parseResumeToBuilderData } from '@/lib/parser';

interface ResumeBuilderProps {
  initialAnalysis?: AnalysisResult | null;
  onBackToResults?: () => void;
  onBackToChecker?: () => void;
}

export function ResumeBuilder({
  initialAnalysis,
  onBackToResults,
  onBackToChecker,
}: ResumeBuilderProps) {
  // Initialize resume data from analysis or blank template
  const [resumeData, setResumeData] = useState<ResumeData>(() =>
    parseResumeToBuilderData(initialAnalysis?.rawResumeText || '', initialAnalysis)
  );

  const [activeLayout, setActiveLayout] = useState<'classic' | 'modern'>('classic');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [activeSection, setActiveSection] = useState<string>('contact');
  const [skillInput, setSkillInput] = useState<string>('');

  // Suggestions drawer modal state
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const resumePrintRef = useRef<HTMLDivElement>(null);

  // ---------------- Handlers ----------------

  const handlePrint = () => {
    // Add printable class to body temporarily or trigger window.print
    window.print();
  };

  const updateContact = (field: keyof ResumeData['contact'], val: string) => {
    setResumeData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: val },
    }));
  };

  // Section Ordering
  const moveSection = (index: number, direction: 'up' | 'down') => {
    setResumeData(prev => {
      const order = [...prev.sectionOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      order[index] = order[targetIndex];
      order[targetIndex] = temp;
      return { ...prev, sectionOrder: order };
    });
  };

  const toggleSectionVisibility = (key: ResumeSectionKey) => {
    setResumeData(prev => ({
      ...prev,
      visibleSections: {
        ...prev.visibleSections,
        [key]: !prev.visibleSections[key],
      },
    }));
  };

  // Work Experience Handlers
  const addExperience = () => {
    const newItem: WorkExperienceItem = {
      id: `exp-${Date.now()}`,
      title: 'New Position',
      company: 'Organization Name',
      location: 'City, State',
      startDate: '2023',
      endDate: 'Present',
      isCurrent: true,
      bullets: ['Describe your core achievements and quantified impact here.'],
    };
    setResumeData(prev => ({
      ...prev,
      experience: [newItem, ...prev.experience],
    }));
  };

  const updateExperience = (index: number, field: keyof WorkExperienceItem, val: WorkExperienceItem[keyof WorkExperienceItem]) => {
    setResumeData(prev => {
      const list = [...prev.experience];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, experience: list };
    });
  };

  const removeExperience = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addExperienceBullet = (jobIndex: number) => {
    setResumeData(prev => {
      const list = [...prev.experience];
      list[jobIndex].bullets = [...list[jobIndex].bullets, 'Quantified contribution or key deliverable.'];
      return { ...prev, experience: list };
    });
  };

  const updateExperienceBullet = (jobIndex: number, bulletIndex: number, val: string) => {
    setResumeData(prev => {
      const list = [...prev.experience];
      const bullets = [...list[jobIndex].bullets];
      bullets[bulletIndex] = val;
      list[jobIndex].bullets = bullets;
      return { ...prev, experience: list };
    });
  };

  const removeExperienceBullet = (jobIndex: number, bulletIndex: number) => {
    setResumeData(prev => {
      const list = [...prev.experience];
      list[jobIndex].bullets = list[jobIndex].bullets.filter((_, i) => i !== bulletIndex);
      return { ...prev, experience: list };
    });
  };

  // Education Handlers
  const addEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      degree: 'Bachelor of Science',
      field: 'Your Major',
      institution: 'University Name',
      location: 'City, State',
      gradYear: '2022',
      details: '',
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newItem],
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, val: string) => {
    setResumeData(prev => {
      const list = [...prev.education];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, education: list };
    });
  };

  const removeEducation = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Skills Handlers
  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !resumeData.skills.includes(trimmed)) {
      setResumeData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  // Projects Handlers
  const addProject = () => {
    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: 'Project Name',
      role: 'Role / Contribution',
      technologies: 'Technologies Used',
      link: '',
      bullets: ['Describe measurable outcome or technical implementation.'],
    };
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, newItem],
    }));
  };

  const updateProject = (index: number, field: keyof ProjectItem, val: ProjectItem[keyof ProjectItem]) => {
    setResumeData(prev => {
      const list = [...prev.projects];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, projects: list };
    });
  };

  const removeProject = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // Certifications Handlers
  const addCertification = () => {
    const newItem: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: 'Certification Title',
      issuer: 'Issuing Organization',
      issueDate: '2023',
      url: '',
    };
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, newItem],
    }));
  };

  const updateCertification = (index: number, field: keyof CertificationItem, val: string) => {
    setResumeData(prev => {
      const list = [...prev.certifications];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, certifications: list };
    });
  };

  const removeCertification = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  // Apply Coach Suggestion
  const handleApplySummarySuggestion = () => {
    if (initialAnalysis?.summarySuggestion?.suggestedSummary) {
      setResumeData(prev => ({
        ...prev,
        summary: initialAnalysis.summarySuggestion!.suggestedSummary,
      }));
    }
  };

  const handleApplyBulletSuggestion = (jobIndex: number, text: string) => {
    setResumeData(prev => {
      const list = [...prev.experience];
      if (list[jobIndex]) {
        list[jobIndex].bullets = [...list[jobIndex].bullets, text];
      }
      return { ...prev, experience: list };
    });
  };

  return (
    <div
      id="resume-builder-container"
      style={{
        minHeight: '100vh',
        background: 'var(--brand-bg)',
        paddingBottom: '80px',
      }}
    >
      {/* Top Application Bar */}
      <div
        className="no-print"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--brand-border)',
          position: 'sticky',
          top: '76px',
          zIndex: 40,
          padding: '14px 24px',
          boxShadow: '0 4px 16px rgba(10, 27, 56, 0.04)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: 0,
          }}
        >
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBackToResults && (
              <button
                onClick={onBackToResults}
                className="btn btn-secondary btn-sm"
                title="Return to the Diagnostic Report"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Diagnostic Results</span>
              </button>
            )}
            {onBackToChecker && (
              <button
                onClick={onBackToChecker}
                className="btn btn-secondary btn-sm"
              >
                <span>Upload New</span>
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-dark)' }}>
                TALVYN Resume Builder
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)' }}>
                ATS-Optimized Formatting &bull; Selectable Text Export
              </span>
            </div>
          </div>

          {/* Center: Layout Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-text-muted)' }}>
              Layout:
            </span>
            <button
              onClick={() => setActiveLayout('classic')}
              className={`btn btn-sm ${activeLayout === 'classic' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Classic Executive
            </button>
            <button
              onClick={() => setActiveLayout('modern')}
              className={`btn btn-sm ${activeLayout === 'modern' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Modern Clean
            </button>
          </div>

          {/* Right Action: Findings Drawer & PDF Print */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {initialAnalysis && (
              <button
                onClick={() => setIsSuggestionsOpen(true)}
                className="btn btn-soft btn-sm"
                style={{ fontWeight: 700 }}
              >
                <span>✨ Coach Findings ({initialAnalysis.bulletSuggestions.length})</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Download ATS PDF</span>
            </button>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div
          className="mobile-view-toggle"
          style={{
            display: 'none',
            marginTop: '12px',
            borderTop: '1px solid var(--brand-border)',
            paddingTop: '10px',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setMobileTab('editor')}
            className={`btn btn-sm ${mobileTab === 'editor' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
          >
            Edit Content
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`btn btn-sm ${mobileTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
          >
            Live Preview
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="container" style={{ marginTop: '28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
          className="builder-grid"
        >
          {/* ================= LEFT COLUMN: THE ACCORDION EDITOR ================= */}
          <div
            className={`editor-column no-print ${mobileTab === 'preview' ? 'mobile-hidden' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Quick Banner: Data Grounding Notice */}
            <div
              className="clay-inset"
              style={{
                padding: '14px 18px',
                background: '#FAF9F6',
                borderLeft: '4px solid var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--brand-dark)' }}>
                🔒 <strong>Grounding Integrity:</strong> All content is derived strictly from your input. Review and edit verified metrics before exporting.
              </div>
            </div>

            {/* 1. Contact Details Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'contact' ? '' : 'contact')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    1. Contact &amp; Header Information
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Critical identifiers that ATS scanners extract for recruiter databases.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'contact' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'contact' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', paddingTop: '8px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Full Name</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.fullName}
                      onChange={e => updateContact('fullName', e.target.value)}
                      placeholder="e.g. Alexandra Chen"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Target Title / Role</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.targetRole}
                      onChange={e => updateContact('targetRole', e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      className="clay-input"
                      value={resumeData.contact.email}
                      onChange={e => updateContact('email', e.target.value)}
                      placeholder="alex.chen@email.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.phone}
                      onChange={e => updateContact('phone', e.target.value)}
                      placeholder="(555) 019-2834"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Location (City, State / Remote)</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.location}
                      onChange={e => updateContact('location', e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>LinkedIn Profile URL</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.linkedin}
                      onChange={e => updateContact('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/alexandrachen"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>GitHub / Portfolio Link</label>
                    <input
                      type="text"
                      className="clay-input"
                      value={resumeData.contact.website}
                      onChange={e => updateContact('website', e.target.value)}
                      placeholder="https://github.com/alexandrachen"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Professional Summary Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'summary' ? '' : 'summary')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    2. Professional Summary
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Concise 3-sentence executive positioning hook.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'summary' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'summary' && (
                <div>
                  {initialAnalysis?.summarySuggestion && (
                    <div
                      style={{
                        background: 'var(--brand-soft-blue-light)',
                        border: '1px solid var(--brand-soft-blue)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                        💡 Coach suggestion tailored to your target competencies is available.
                      </span>
                      <button
                        type="button"
                        onClick={handleApplySummarySuggestion}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      >
                        Insert Coach Summary
                      </button>
                    </div>
                  )}

                  <textarea
                    className="clay-textarea"
                    rows={4}
                    value={resumeData.summary}
                    onChange={e => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Enter your targeted executive summary..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)' }}>
                      {resumeData.summary.length} characters &bull; ~{resumeData.summary.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Work Experience Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'experience' ? '' : 'experience')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    3. Work Experience ({resumeData.experience.length})
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Reverse-chronological employment history with measurable impact.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'experience' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'experience' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {resumeData.experience.map((job, jobIdx) => (
                    <div
                      key={job.id}
                      className="clay-inset"
                      style={{
                        padding: '18px',
                        background: '#FFFFFF',
                        border: '1.5px solid var(--brand-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                          Role #{jobIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExperience(jobIdx)}
                          className="btn btn-sm"
                          style={{
                            background: '#FEE2E2',
                            color: '#991B1B',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                          }}
                        >
                          Remove Role
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>Job Title</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            value={job.title}
                            onChange={e => updateExperience(jobIdx, 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>Company</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            value={job.company}
                            onChange={e => updateExperience(jobIdx, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>Location</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            value={job.location}
                            onChange={e => updateExperience(jobIdx, 'location', e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>Dates</label>
                            <input
                              type="text"
                              className="clay-input"
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                              value={`${job.startDate} - ${job.endDate}`}
                              onChange={e => {
                                const parts = e.target.value.split('-');
                                updateExperience(jobIdx, 'startDate', parts[0]?.trim() || '');
                                updateExperience(jobIdx, 'endDate', parts[1]?.trim() || 'Present');
                              }}
                              placeholder="2021 - Present"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bullets List */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                            Achievement Statements &bull; Google X-Y-Z Formula
                          </label>
                          <button
                            type="button"
                            onClick={() => addExperienceBullet(jobIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--brand-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Add Bullet
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {job.bullets.map((bullet, bulletIdx) => (
                            <div key={bulletIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--brand-text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                                &bull;
                              </span>
                              <textarea
                                className="clay-textarea"
                                rows={2}
                                style={{
                                  fontSize: '0.84rem',
                                  padding: '8px 10px',
                                  minHeight: '48px',
                                  lineHeight: 1.4,
                                }}
                                value={bullet}
                                onChange={e => updateExperienceBullet(jobIdx, bulletIdx, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeExperienceBullet(jobIdx, bulletIdx)}
                                title="Delete bullet"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  padding: '4px',
                                }}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExperience}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', borderStyle: 'dashed' }}
                  >
                    + Add Work Experience Entry
                  </button>
                </div>
              )}
            </div>

            {/* 4. Education Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'education' ? '' : 'education')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    4. Education ({resumeData.education.length})
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Academic degrees, institutions, and honors.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'education' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {resumeData.education.map((edu, eduIdx) => (
                    <div
                      key={edu.id}
                      className="clay-inset"
                      style={{
                        padding: '16px',
                        background: '#FFFFFF',
                        border: '1.5px solid var(--brand-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Degree #{eduIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeEducation(eduIdx)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Degree &amp; Major</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={`${edu.degree} in ${edu.field}`}
                            onChange={e => {
                              const val = e.target.value;
                              const parts = val.split(' in ');
                              updateEducation(eduIdx, 'degree', parts[0] || val);
                              updateEducation(eduIdx, 'field', parts[1] || '');
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Institution Name</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={edu.institution}
                            onChange={e => updateEducation(eduIdx, 'institution', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Graduation Year</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={edu.gradYear}
                            onChange={e => updateEducation(eduIdx, 'gradYear', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Honors / Notes</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={edu.details || ''}
                            onChange={e => updateEducation(eduIdx, 'details', e.target.value)}
                            placeholder="e.g. Magna Cum Laude, GPA 3.8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEducation}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', borderStyle: 'dashed' }}
                  >
                    + Add Education Entry
                  </button>
                </div>
              )}
            </div>

            {/* 5. Skills & Competencies Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'skills' ? '' : 'skills')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    5. Skills &amp; Competencies ({resumeData.skills.length})
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Industry keywords matching recruiter search queries.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'skills' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'skills' && (
                <div>
                  {/* Skill Add Input */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      className="clay-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill(skillInput);
                        }
                      }}
                      placeholder="Type a skill and press Enter..."
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(skillInput)}
                      className="btn btn-primary btn-sm"
                    >
                      Add
                    </button>
                  </div>

                  {/* Skills Tag Cloud */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {resumeData.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="pill pill-primary"
                        style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            lineHeight: 1,
                          }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Missing Keywords Quick-Add If Available */}
                  {initialAnalysis?.keywords.missingKeywords && initialAnalysis.keywords.missingKeywords.length > 0 && initialAnalysis.hasJobDescription && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--brand-border)' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                        Quick-add missing target job keywords:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {initialAnalysis.keywords.missingKeywords.slice(0, 8).map((kw, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSkill(kw)}
                            style={{
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              color: '#92400E',
                              borderRadius: '9999px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Projects Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'projects' ? '' : 'projects')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    6. Key Projects ({resumeData.projects.length})
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    Tangible technical portfolio demonstrations.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'projects' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {resumeData.projects.map((proj, pIdx) => (
                    <div
                      key={proj.id}
                      className="clay-inset"
                      style={{ padding: '16px', background: '#FFFFFF', border: '1.5px solid var(--brand-border)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Project #{pIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeProject(pIdx)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Project Title</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={proj.name}
                            onChange={e => updateProject(pIdx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Technologies</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={proj.technologies}
                            onChange={e => updateProject(pIdx, 'technologies', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>Description / Bullet</label>
                        <textarea
                          className="clay-textarea"
                          rows={2}
                          style={{ fontSize: '0.82rem', padding: '6px 10px', minHeight: '44px' }}
                          value={proj.bullets.join('\n')}
                          onChange={e => updateProject(pIdx, 'bullets', e.target.value.split('\n'))}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addProject}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', borderStyle: 'dashed' }}
                  >
                    + Add Project Entry
                  </button>
                </div>
              )}
            </div>

            {/* 7. Certifications Section */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveSection(activeSection === 'certifications' ? '' : 'certifications')}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-dark)', margin: 0 }}>
                    7. Certifications &amp; Credentials ({resumeData.certifications.length})
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                    External accreditations and verifiable credentials.
                  </p>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--brand-text-muted)' }}>
                  {activeSection === 'certifications' ? '▲' : '▼'}
                </span>
              </div>

              {activeSection === 'certifications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {resumeData.certifications.map((cert, cIdx) => (
                    <div
                      key={cert.id}
                      className="clay-inset"
                      style={{ padding: '14px', background: '#FFFFFF', border: '1.5px solid var(--brand-border)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Credential #{cIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeCertification(cIdx)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Certification Name</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={cert.name}
                            onChange={e => updateCertification(cIdx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Issuer &amp; Year</label>
                          <input
                            type="text"
                            className="clay-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={`${cert.issuer} (${cert.issueDate})`}
                            onChange={e => {
                              const match = e.target.value.match(/(.*?)\s*\((.*?)\)/);
                              if (match) {
                                updateCertification(cIdx, 'issuer', match[1].trim());
                                updateCertification(cIdx, 'issueDate', match[2].trim());
                              } else {
                                updateCertification(cIdx, 'issuer', e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCertification}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', borderStyle: 'dashed' }}
                  >
                    + Add Certification Entry
                  </button>
                </div>
              )}
            </div>

            {/* 8. Section Ordering & Visibility */}
            <div className="clay-card-static" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '8px' }}>
                Section Organization &amp; Order
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--brand-text-muted)', marginBottom: '14px' }}>
                Reorder or toggle sections to tailor the presentation hierarchy.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resumeData.sectionOrder.map((secKey, idx) => (
                  <div
                    key={secKey}
                    className="clay-inset"
                    style={{
                      padding: '10px 14px',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={resumeData.visibleSections[secKey]}
                        onChange={() => toggleSectionVisibility(secKey)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {secKey}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        style={{
                          background: 'var(--brand-card)',
                          border: '1px solid var(--brand-border)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.4 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === resumeData.sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        style={{
                          background: 'var(--brand-card)',
                          border: '1px solid var(--brand-border)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          cursor: idx === resumeData.sectionOrder.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === resumeData.sectionOrder.length - 1 ? 0.4 : 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: LIVE RESUME PREVIEW SHEET ================= */}
          <div
            className={`preview-column ${mobileTab === 'editor' ? 'mobile-hidden' : ''}`}
            style={{
              position: 'sticky',
              top: '150px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Sheet Container */}
            <div
              id="resume-print-area"
              ref={resumePrintRef}
              className={`resume-sheet ${activeLayout === 'classic' ? 'layout-classic' : 'layout-modern'}`}
              style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 12px 36px rgba(10, 27, 56, 0.12), 0 2px 8px rgba(10, 27, 56, 0.06)',
                border: '1px solid #D8D6CE',
                padding: '44px 48px',
                color: '#111827',
                fontSize: '9.5pt',
                lineHeight: 1.5,
                fontFamily: activeLayout === 'classic' ? "'Georgia', 'Times New Roman', serif" : "'Plus Jakarta Sans', -apple-system, sans-serif",
                minHeight: '750px',
                userSelect: 'text',
              }}
            >
              {/* HEADER SECTION */}
              <div
                style={{
                  textAlign: activeLayout === 'classic' ? 'center' : 'left',
                  borderBottom: activeLayout === 'classic' ? '1.5px solid #1F2937' : '2.5px solid #12336B',
                  paddingBottom: '14px',
                  marginBottom: '16px',
                }}
              >
                <h1
                  style={{
                    fontSize: '20pt',
                    fontWeight: 800,
                    color: activeLayout === 'classic' ? '#111827' : '#12336B',
                    letterSpacing: '-0.3px',
                    margin: 0,
                    textTransform: activeLayout === 'classic' ? 'uppercase' : 'none',
                  }}
                >
                  {resumeData.contact.fullName || 'Candidate Name'}
                </h1>
                {resumeData.contact.targetRole && (
                  <div
                    style={{
                      fontSize: '11pt',
                      fontWeight: 600,
                      color: '#4B5563',
                      marginTop: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {resumeData.contact.targetRole}
                  </div>
                )}
                {/* Contact Line */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: activeLayout === 'classic' ? 'center' : 'flex-start',
                    gap: '12px',
                    fontSize: '8.8pt',
                    color: '#4B5563',
                    marginTop: '8px',
                  }}
                >
                  {resumeData.contact.email && <span>{resumeData.contact.email}</span>}
                  {resumeData.contact.phone && <span>&bull; {resumeData.contact.phone}</span>}
                  {resumeData.contact.location && <span>&bull; {resumeData.contact.location}</span>}
                  {resumeData.contact.linkedin && (
                    <span>
                      &bull;{' '}
                      <a
                        href={resumeData.contact.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#1E40AF', textDecoration: 'none' }}
                      >
                        {resumeData.contact.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </span>
                  )}
                  {resumeData.contact.website && (
                    <span>
                      &bull;{' '}
                      <a
                        href={resumeData.contact.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#1E40AF', textDecoration: 'none' }}
                      >
                        {resumeData.contact.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </span>
                  )}
                </div>
              </div>

              {/* DYNAMIC SECTIONS IN ORDER */}
              {resumeData.sectionOrder.map(secKey => {
                if (!resumeData.visibleSections[secKey]) return null;

                if (secKey === 'summary' && resumeData.summary.trim()) {
                  return (
                    <div key="sec-summary" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '6px',
                        }}
                      >
                        Professional Summary
                      </div>
                      <p style={{ margin: 0, color: '#374151', textAlign: 'justify' }}>
                        {resumeData.summary}
                      </p>
                    </div>
                  );
                }

                if (secKey === 'experience' && resumeData.experience.length > 0) {
                  return (
                    <div key="sec-experience" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '8px',
                        }}
                      >
                        Work Experience
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {resumeData.experience.map(job => (
                          <div key={job.id} style={{ pageBreakInside: 'avoid' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '10pt', color: '#111827' }}>
                                {job.title} &mdash; <span style={{ fontWeight: 600, color: '#374151' }}>{job.company}</span>
                              </strong>
                              <span style={{ fontSize: '8.8pt', color: '#4B5563', whiteSpace: 'nowrap' }}>
                                {job.startDate} &ndash; {job.endDate}
                              </span>
                            </div>
                            <div style={{ fontSize: '8.5pt', color: '#6B7280', fontStyle: 'italic', marginBottom: '4px' }}>
                              {job.location}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151' }}>
                              {job.bullets.map((b, bIdx) => (
                                <li key={bIdx} style={{ marginBottom: '3px' }}>
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (secKey === 'education' && resumeData.education.length > 0) {
                  return (
                    <div key="sec-education" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '8px',
                        }}
                      >
                        Education
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {resumeData.education.map(edu => (
                          <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div>
                              <strong style={{ fontSize: '9.8pt', color: '#111827' }}>
                                {edu.degree} in {edu.field}
                              </strong>
                              <span style={{ color: '#4B5563' }}> &bull; {edu.institution}</span>
                              {edu.details && <span style={{ color: '#6B7280', fontSize: '8.5pt' }}> ({edu.details})</span>}
                            </div>
                            <span style={{ fontSize: '8.8pt', color: '#4B5563', whiteSpace: 'nowrap' }}>
                              {edu.gradYear}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (secKey === 'skills' && resumeData.skills.length > 0) {
                  return (
                    <div key="sec-skills" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '6px',
                        }}
                      >
                        Skills &amp; Competencies
                      </div>
                      <div style={{ color: '#374151', fontSize: '9.2pt', lineHeight: 1.6 }}>
                        <strong>Core Competencies:</strong> {resumeData.skills.join(' • ')}
                      </div>
                    </div>
                  );
                }

                if (secKey === 'projects' && resumeData.projects.length > 0) {
                  return (
                    <div key="sec-projects" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '8px',
                        }}
                      >
                        Key Projects
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {resumeData.projects.map(proj => (
                          <div key={proj.id} style={{ pageBreakInside: 'avoid' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '9.8pt', color: '#111827' }}>
                                {proj.name}
                              </strong>
                              {proj.link && (
                                <a
                                  href={proj.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#1E40AF', fontSize: '8.5pt', textDecoration: 'none' }}
                                >
                                  {proj.link.replace(/^https?:\/\//, '')}
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: '8.5pt', color: '#4B5563', fontStyle: 'italic', marginBottom: '2px' }}>
                              Technologies: {proj.technologies}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151' }}>
                              {proj.bullets.map((b, idx) => (
                                <li key={idx} style={{ marginBottom: '2px' }}>
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (secKey === 'certifications' && resumeData.certifications.length > 0) {
                  return (
                    <div key="sec-certifications" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 700,
                          color: activeLayout === 'classic' ? '#111827' : '#12336B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          borderBottom: activeLayout === 'classic' ? '1px solid #D1D5DB' : '1.5px solid #E5E7EB',
                          paddingBottom: '2px',
                          marginBottom: '6px',
                        }}
                      >
                        Certifications &amp; Credentials
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {resumeData.certifications.map(cert => (
                          <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#111827', fontWeight: 600 }}>
                              {cert.name} &mdash; <span style={{ fontWeight: 400, color: '#4B5563' }}>{cert.issuer}</span>
                            </span>
                            <span style={{ fontSize: '8.8pt', color: '#4B5563' }}>{cert.issueDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= COACH SUGGESTIONS DRAWER MODAL ================= */}
      {isSuggestionsOpen && initialAnalysis && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(10, 27, 56, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsSuggestionsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              background: '#FFFFFF',
              boxShadow: 'var(--clay-elevated)',
              overflowY: 'auto',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-dark)', margin: 0 }}>
                  ✨ Coach Diagnostic Suggestions
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)', margin: 0 }}>
                  Review and customize suggestions before applying them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestionsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--brand-text-muted)',
                }}
              >
                &times;
              </button>
            </div>

            {/* Suggested Summary Card */}
            {initialAnalysis.summarySuggestion && (
              <div
                className="clay-inset"
                style={{ padding: '16px', background: 'var(--brand-card-subtle)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                    Executive Summary Rewrite
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplySummarySuggestion();
                      setIsSuggestionsOpen(false);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                  >
                    Apply to Resume
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--brand-dark)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  &ldquo;{initialAnalysis.summarySuggestion.suggestedSummary}&rdquo;
                </p>
              </div>
            )}

            {/* Suggested Bullets List */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-dark)', marginBottom: '12px' }}>
                Quantified Bullet Rewrites ({initialAnalysis.bulletSuggestions.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {initialAnalysis.bulletSuggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    className="clay-inset"
                    style={{ padding: '14px', background: '#FFFFFF', border: '1px solid var(--brand-border)' }}
                  >
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: '4px' }}>
                      Statement #{idx + 1}
                    </div>

                    {/* Original */}
                    <div style={{ fontSize: '0.8rem', color: '#991B1B', marginBottom: '8px', background: '#FEF2F2', padding: '6px 10px', borderRadius: '6px' }}>
                      <strong>Original:</strong> &ldquo;{item.original}&rdquo;
                    </div>

                    {/* Upgraded */}
                    <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600, marginBottom: '10px', background: '#F0FDF4', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong>Upgraded:</strong> &ldquo;{item.improved}&rdquo;
                    </div>

                    {/* Apply Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--brand-text-muted)' }}>
                        Add to role:
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {resumeData.experience.map((job, jobIdx) => (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => {
                              handleApplyBulletSuggestion(jobIdx, item.improved);
                              setIsSuggestionsOpen(false);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          >
                            + Role #{jobIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS for Builder & Print Rules */}
      <style jsx global>{`
        @media print {
          /* Hide all application elements */
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, footer, .no-print, .mobile-view-toggle, .editor-column, .btn, .results-section, .hero-section {
            display: none !important;
          }
          #resume-builder-container {
            background: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .builder-grid {
            display: block !important;
          }
          .preview-column {
            position: static !important;
            top: 0 !important;
            display: block !important;
            width: 100% !important;
          }
          #resume-print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            font-size: 10pt !important;
          }
          #resume-print-area > div {
            break-inside: auto;
          }
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
        }

        @media (max-width: 900px) {
          .builder-grid {
            grid-template-columns: 1fr !important;
          }
          .mobile-view-toggle {
            display: flex !important;
          }
          .mobile-hidden {
            display: none !important;
          }
          .preview-column {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}

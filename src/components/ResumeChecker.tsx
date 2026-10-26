'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { AnalysisResult, ExperienceLevel } from '@/types';

interface ResumeCheckerProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export function ResumeChecker({ onAnalysisComplete }: ResumeCheckerProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [targetJobTitle, setTargetJobTitle] = useState<string>('');
  const [targetJobDescription, setTargetJobDescription] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('mid');
  
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const lowerName = selectedFile.name.toLowerCase();
    const isValidType = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValidType) {
      setError('Please upload a valid PDF (.pdf), Microsoft Word (.docx), or plain text (.txt) document.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'upload' && !file) {
      setError('Please select or drag-and-drop a resume document (.pdf or .docx).');
      return;
    }

    if (activeTab === 'paste' && pastedText.trim().split(/\s+/).length < 30) {
      setError('Please paste your full resume text (at least 30 words required for meaningful analysis).');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Extracting resume structure and text content...');

    try {
      const formData = new FormData();
      if (activeTab === 'upload' && file) {
        formData.append('resumeFile', file);
      } else {
        formData.append('resumeText', pastedText);
      }

      formData.append('targetJobTitle', targetJobTitle);
      formData.append('targetJobDescription', targetJobDescription);
      formData.append('experienceLevel', experienceLevel);

      // Multi-step progress simulation for executive polish
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Running deterministic ATS readability & keyword checks...');
      }, 900);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep('Evaluating bullet point metrics and impact formulas...');
      }, 1900);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      let data: (AnalysisResult & { error?: string }) | null = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        // Non-JSON response (e.g. gateway error or server crash)
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
          (rawText && rawText.length < 150 ? rawText : 'An error occurred during analysis. Please verify your document and try again.')
        );
      }

      if (!data) {
        throw new Error('Received an invalid response format from the server. Please try again.');
      }

      onAnalysisComplete(data);
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong during analysis. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <section
      id="resume-checker"
      className="resume-checker-section"
      style={{
        padding: '60px 0 80px 0',
      }}
    >
      <div className="container" style={{ maxWidth: '860px' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--brand-dark)',
              letterSpacing: '-1px',
              marginBottom: '12px',
            }}
          >
            Analyze Your Resume
          </h2>
          <p style={{ color: 'var(--brand-text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Upload your resume or paste the content below. Add an optional job description for precise 1-to-1 keyword matching.
          </p>
        </div>

        {/* Upload Container Clay Card */}
        <div className="clay-card-static" style={{ padding: '36px 32px' }}>
          {/* Method Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--brand-card-subtle)',
              padding: '6px',
              borderRadius: '16px',
              boxShadow: 'var(--clay-inset)',
              marginBottom: '28px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.3px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'upload' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'upload' ? 'var(--brand-primary)' : 'var(--brand-text-muted)',
                boxShadow: activeTab === 'upload' ? 'var(--clay-card)' : 'none',
              }}
            >
              01 / DOCUMENT UPLOAD (PDF, DOCX)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.3px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'paste' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'paste' ? 'var(--brand-primary)' : 'var(--brand-text-muted)',
                boxShadow: activeTab === 'paste' ? 'var(--clay-card)' : 'none',
              }}
            >
              02 / PASTE RESUME TEXT
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tab 1: Upload Dropzone */}
            {activeTab === 'upload' && (
              <div style={{ marginBottom: '28px' }}>
                {!file ? (
                  <div
                    className={`dropzone-box ${isDragging ? 'drag-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <div style={{ marginBottom: '16px' }}>
                      <span className="tech-tag" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                        FILE DROPZONE &bull; PDF / DOCX
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--brand-dark)', marginBottom: '6px' }}>
                      Drag &amp; drop your resume here, or <span style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }}>browse</span>
                    </div>
                    <p style={{ color: 'var(--brand-text-muted)', fontSize: '0.86rem' }}>
                      Standard single-column PDF (.pdf) and Microsoft Word (.docx) &bull; Maximum file size 5 MB
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'var(--brand-card-subtle)',
                      border: '1.5px solid var(--brand-border)',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--clay-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'var(--brand-primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {file.name.endsWith('.pdf') ? 'PDF' : 'DOCX'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--brand-dark)', fontSize: '0.98rem' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--brand-text-muted)' }}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-red)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        padding: '8px 12px',
                        borderRadius: '8px',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Paste Text */}
            {activeTab === 'paste' && (
              <div style={{ marginBottom: '28px' }}>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--brand-dark)',
                    marginBottom: '8px',
                  }}
                >
                  Paste Full Resume Content
                </label>
                <textarea
                  className="clay-textarea"
                  rows={8}
                  placeholder="Paste your resume sections, work experience bullets, and skills here..."
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--brand-text-muted)' }}>
                    {pastedText.trim() ? `${pastedText.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                </div>
              </div>
            )}

            {/* Optional Target Job Info Section */}
            <div
              style={{
                borderTop: '1px solid var(--brand-border)',
                paddingTop: '24px',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                  Target Role Details (Recommended for 1-to-1 Matching)
                </span>
                <span className="pill pill-primary" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  Optional
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {/* Target Job Title */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: 'var(--brand-text)',
                      marginBottom: '6px',
                    }}
                  >
                    Target Job Title
                  </label>
                  <input
                    type="text"
                    className="clay-input"
                    placeholder="e.g. Senior Software Engineer, Product Manager"
                    value={targetJobTitle}
                    onChange={e => setTargetJobTitle(e.target.value)}
                  />
                </div>

                {/* Experience Level Selector */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: 'var(--brand-text)',
                      marginBottom: '6px',
                    }}
                  >
                    Experience Level
                  </label>
                  <select
                    className="clay-select"
                    value={experienceLevel}
                    onChange={e => setExperienceLevel(e.target.value as ExperienceLevel)}
                  >
                    <option value="entry">Entry-Level (0 - 2 years)</option>
                    <option value="mid">Mid-Level (3 - 5 years)</option>
                    <option value="senior">Senior-Level (6 - 10 years)</option>
                    <option value="lead">Lead / Executive (10+ years)</option>
                  </select>
                </div>
              </div>

              {/* Target Job Description */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    color: 'var(--brand-text)',
                    marginBottom: '6px',
                  }}
                >
                  Job Description or Key Requirements
                </label>
                <textarea
                  className="clay-textarea"
                  rows={4}
                  placeholder="Paste the target job description or requirements here to unlock keyword gap analysis and matching scores..."
                  value={targetJobDescription}
                  onChange={e => setTargetJobDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: 'var(--accent-red-bg)',
                  border: '1px solid var(--accent-red-border)',
                  color: 'var(--accent-red)',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Deterministic ATS Diagnostic Scanner Status Card (Active during loading) */}
            {isLoading && (
              <div
                className="colour-morph-card"
                style={{
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF4FC 100%)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: '#12336B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(18, 51, 107, 0.25)',
                    animation: 'spin 4s linear infinite',
                  }}
                >
                  ⚙️
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="tech-tag" style={{ background: '#12336B', color: '#FFFFFF', fontSize: '0.65rem' }}>
                      ATS DIAGNOSTIC ENGINE
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Diagnostic Parsing Active
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                    {loadingStep || 'Analyzing Document Layers &amp; Formats...'}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button & Progress State */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  opacity: isLoading ? 0.8 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                {isLoading ? (
                  <span>Processing ATS Scan...</span>
                ) : (
                  <span>Run Full ATS Diagnosis</span>
                )}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '20px',
                  marginTop: '18px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  <span className="status-pip" style={{ color: 'var(--accent-green)' }} />
                  <span style={{ fontWeight: 600 }}>Zero Persistence (In-Memory Only)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  <span className="status-pip" style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontWeight: 600 }}>Instant Diagnostic Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--brand-text-muted)' }}>
                  <span className="status-pip" style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontWeight: 600 }}>Deterministic ATS Verification</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}

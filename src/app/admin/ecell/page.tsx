'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

interface Metrics {
  totalStudents: number;
  inProgressAttempts: number;
  submittedAttempts: number;
  departmentBreakdown: { department: string; count: number }[];
  totalFeedback: number;
  avgOverallRating: number;
  avgNavigationRating: number;
  avgQualityRating: number;
  totalWaitlistSubscribers: number;
  examStatus: string;
  customPostExamQuestion: string;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  college: string;
  attemptStatus: string;
  attemptId?: string;
  score: number | null;
  submittedAt: number | null;
}

export default function AdminEcellPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'controls'>('overview');
  const [error, setError] = useState<string | null>(null);

  const [examStatus, setExamStatus] = useState<string>('published');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [savingControls, setSavingControls] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const qParams = new URLSearchParams();
      if (searchQuery) qParams.set('q', searchQuery);
      if (selectedDept && selectedDept !== 'ALL') qParams.set('department', selectedDept);

      const [metricsRes, studentsRes] = await Promise.all([
        fetch('/api/admin/ecell/metrics'),
        fetch(`/api/admin/ecell/students?${qParams.toString()}`),
      ]);

      if (!metricsRes.ok) {
        if (metricsRes.status === 403 || metricsRes.status === 401) {
          router.push('/ecell/login');
          return;
        }
        throw new Error('Failed to load metrics');
      }

      const mData = await metricsRes.json();
      setMetrics(mData.metrics);
      setExamStatus(mData.metrics.examStatus);
      setCustomQuestion(mData.metrics.customPostExamQuestion);

      if (studentsRes.ok) {
        const sData = await studentsRes.json();
        setStudents(sData.students || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedDept]);

  const handleSaveControls = async () => {
    setSavingControls(true);
    try {
      const res = await fetch('/api/admin/ecell/exam-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: examStatus,
          customPostExamQuestion: customQuestion,
        }),
      });
      if (!res.ok) throw new Error('Failed to update configuration');
      await loadData();
      alert('Examination configuration updated.');
    } catch (err: any) {
      alert(err.message || 'Error saving controls');
    } finally {
      setSavingControls(false);
    }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);

    try {
      const lines = importText.trim().split('\n');
      const parsedStudents: any[] = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          const email = parts[0];
          const name = parts[1];
          const password = parts[2] || 'ecell2026';
          const department = parts[3] || '';
          const id = parts[4] || '';

          if (email.includes('@')) {
            parsedStudents.push({ email, name, password, department, id });
          }
        }
      }

      if (parsedStudents.length === 0) {
        throw new Error('No valid rows found. Format: email, name, password, department, id');
      }

      const res = await fetch('/api/admin/ecell/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudents }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult(`Successfully imported ${data.imported} student records.`);
      setImportText('');
      await loadData();
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const triggerExport = (type: 'results' | 'feedback' | 'waitlist') => {
    const deptParam = selectedDept !== 'ALL' ? `&department=${encodeURIComponent(selectedDept)}` : '';
    window.open(`/api/admin/ecell/export?type=${type}${deptParam}`, '_blank');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0A1B38',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#0284C7',
              borderRadius: '50%',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading ECELL Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--brand-bg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#0A1B38',
          color: '#FFFFFF',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 24px',
            height: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <StructLogo size={34} theme="dark" showText={true} subtitle="" />
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '3px 9px',
                borderRadius: '6px',
                background: 'rgba(2, 132, 199, 0.25)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              ECELL Admin Command Center
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={loadData}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh Data
            </button>
            <Link
              href="/"
              style={{
                fontSize: '0.82rem',
                color: '#94A3B8',
                textDecoration: 'none',
              }}
            >
              View Site
            </Link>
            <button
              onClick={() => {
                fetch('/api/assess/auth/logout', { method: 'POST' }).finally(() => router.push('/ecell/login'));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#F87171',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '36px 20px' }}>
        {/* Title & Exports */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '2rem',
                fontWeight: 800,
                color: '#0A1B38',
                letterSpacing: '-1px',
                margin: '0 0 6px',
              }}
            >
              ECELL Recruitment Operations
            </h1>
            <p style={{ fontSize: '0.92rem', color: '#5E6C84', margin: 0 }}>
              Live proctoring telemetry, student attempt verification, and CSV exports.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => triggerExport('results')}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: 'var(--clay-button-primary)',
              }}
            >
              Export Results CSV
            </button>
            <button
              onClick={() => triggerExport('feedback')}
              style={{
                padding: '10px 18px',
                backgroundColor: '#FFFFFF',
                color: '#0A1B38',
                border: '1.5px solid var(--brand-border)',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Export Feedback CSV
            </button>
            <button
              onClick={() => triggerExport('waitlist')}
              style={{
                padding: '10px 18px',
                backgroundColor: '#EEF4FC',
                color: '#12336B',
                border: '1px solid #DCE6F5',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Waitlist CSV
            </button>
          </div>
        </div>

        {/* Metrics Tiles */}
        {metrics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                padding: '22px 20px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8993A4', textTransform: 'uppercase' }}>
                Registered Students
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0A1B38', margin: '6px 0 2px' }}>
                {metrics.totalStudents}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#5E6C84' }}>Target: 620 candidates</div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                padding: '22px 20px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                In-Progress Active
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '6px 0 2px' }}>
                {metrics.inProgressAttempts}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#5E6C84' }}>Live countdowns</div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                padding: '22px 20px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase' }}>
                Completed Submissions
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)', margin: '6px 0 2px' }}>
                {metrics.submittedAttempts}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#5E6C84' }}>Locked & Graded</div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                padding: '22px 20px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                Feedback Count
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284C7', margin: '6px 0 2px' }}>
                {metrics.totalFeedback}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#5E6C84' }}>Avg: {metrics.avgOverallRating} / 5.0</div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                padding: '22px 20px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>
                Launch Waitlist
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366F1', margin: '6px 0 2px' }}>
                {metrics.totalWaitlistSubscribers}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#5E6C84' }}>Nov 16 Early Access</div>
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid var(--brand-border)', marginBottom: '24px' }}>
          {[
            { id: 'overview', label: 'Department Analytics' },
            { id: 'students', label: `Candidates (${students.length})` },
            { id: 'controls', label: 'Examination Controls' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #0284C7' : '3px solid transparent',
                color: activeTab === tab.id ? '#0A1B38' : '#5E6C84',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Department Analytics */}
        {activeTab === 'overview' && metrics && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid var(--brand-border)',
              boxShadow: 'var(--clay-card)',
              padding: '28px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '18px',
              }}
            >
              Attempts Breakdown by Department
            </h2>

            {metrics.departmentBreakdown.length === 0 ? (
              <p style={{ color: '#5E6C84', fontSize: '0.9rem' }}>No student attempts recorded yet.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {metrics.departmentBreakdown.map((d) => (
                  <div
                    key={d.department}
                    style={{
                      background: '#FAF9F6',
                      border: '1.5px solid #E4E2DC',
                      borderRadius: '12px',
                      padding: '16px 18px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0A1B38', textTransform: 'uppercase' }}>
                      {d.department}
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                      {d.count} candidates
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Candidates */}
        {activeTab === 'students' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '18px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, roll no, or phone..."
                  style={{
                    width: '300px',
                    padding: '11px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--brand-border)',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />

                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{
                    padding: '11px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--brand-border)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0A1B38',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Departments (11 Tracks)</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="DESIGN">Design</option>
                  <option value="MARKETING">Marketing & Outreach</option>
                  <option value="EVENTS">Event Management</option>
                  <option value="CONTENT_MEDIA">Content & Media</option>
                  <option value="VIDEOGRAPHY">Videography</option>
                  <option value="INCUBATION">Incubation & Innovation</option>
                  <option value="PR_HR">PR & HR</option>
                  <option value="SPONSORSHIP">Sponsorship</option>
                  <option value="LOGISTICS">Logistics & Operations</option>
                  <option value="OFFSTAGE">Off-Stage</option>
                </select>

                <button
                  onClick={() => triggerExport('results')}
                  style={{
                    padding: '11px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--brand-border)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#12336B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Export {selectedDept !== 'ALL' ? selectedDept : 'All'} CSV
                </button>
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: '11px 20px',
                  background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: 'var(--clay-button-primary)',
                }}
              >
                + Bulk Import Students (CSV)
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                border: '1.5px solid var(--brand-border)',
                boxShadow: 'var(--clay-card)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF9F6', borderBottom: '1.5px solid var(--brand-border)', color: '#5E6C84', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                    <th style={{ padding: '14px 18px' }}>Registration ID</th>
                    <th style={{ padding: '14px 18px' }}>Candidate Name</th>
                    <th style={{ padding: '14px 18px' }}>Email</th>
                    <th style={{ padding: '14px 18px' }}>Phone</th>
                    <th style={{ padding: '14px 18px' }}>Department</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px' }}>Score (/20)</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#8993A4' }}>
                        No candidate records found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#0A1B38' }}>{s.id}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0A1B38' }}>{s.name}</td>
                        <td style={{ padding: '14px 18px', color: '#5E6C84' }}>{s.email}</td>
                        <td style={{ padding: '14px 18px', color: '#5E6C84', fontSize: '0.82rem' }}>{s.phone || '—'}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0A1B38' }}>{s.department}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '100px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              backgroundColor:
                                s.attemptStatus === 'submitted'
                                  ? 'var(--accent-green-bg)'
                                  : s.attemptStatus === 'in_progress'
                                    ? 'var(--accent-amber-bg)'
                                    : '#F1F5F9',
                              color:
                                s.attemptStatus === 'submitted'
                                  ? 'var(--accent-green)'
                                  : s.attemptStatus === 'in_progress'
                                    ? 'var(--accent-amber)'
                                    : '#5E6C84',
                            }}
                          >
                            {s.attemptStatus === 'submitted' ? 'Submitted' : s.attemptStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0A1B38' }}>
                          {s.score !== null ? `${s.score} / 20 (${((s.score / 20) * 100).toFixed(0)}%)` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Controls */}
        {activeTab === 'controls' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid var(--brand-border)',
              boxShadow: 'var(--clay-card)',
              padding: '32px 28px',
              maxWidth: '640px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '20px',
              }}
            >
              Examination Availability Controls
            </h2>

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#0A1B38',
                  marginBottom: '8px',
                }}
              >
                Examination Status
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { id: 'published', label: 'Open (Accepting Attempts)' },
                  { id: 'closed', label: 'Closed (Halted)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setExamStatus(st.id)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: examStatus === st.id ? '2px solid #0A1B38' : '1.5px solid #E4E2DC',
                      backgroundColor: examStatus === st.id ? '#0A1B38' : '#FAF9F6',
                      color: examStatus === st.id ? '#FFFFFF' : '#0A1B38',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#0A1B38',
                  marginBottom: '8px',
                }}
              >
                Custom Post-Exam Question (Appears on Feedback Form)
              </label>
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g. Which initiative idea in your track are you most excited to pitch?"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: '#FAF9F6',
                  border: '1.5px solid #E4E2DC',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  color: '#0A1B38',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleSaveControls}
              disabled={savingControls}
              style={{
                padding: '13px 26px',
                background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: savingControls ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--clay-button-primary)',
              }}
            >
              {savingControls ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </main>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 27, 56, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1.5px solid var(--brand-border)',
              maxWidth: '520px',
              width: '100%',
              padding: '32px 28px',
              boxShadow: '0 24px 60px rgba(10, 27, 56, 0.3)',
            }}
          >
            <h3
              style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0A1B38',
                marginBottom: '6px',
              }}
            >
              Bulk Import Student Candidates
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#5E6C84', lineHeight: 1.5, marginBottom: '16px' }}>
              Paste comma-separated rows below. Format per line:<br />
              <code style={{ color: '#0284C7', background: '#EEF4FC', padding: '2px 6px', borderRadius: '4px' }}>
                email, name, password, department, registration_id
              </code>
            </p>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="rahul@college.edu, Rahul Sharma, pass123, TECH, 2026EC101&#10;priya@college.edu, Priya Patel, pass123, MARKETING, 2026EC102"
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '0.84rem',
                backgroundColor: '#FAF9F6',
                border: '1.5px solid #E4E2DC',
                borderRadius: '10px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '14px',
              }}
            />

            {importResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#EEF4FC',
                  color: '#12336B',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                {importResult}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E4E2DC',
                  backgroundColor: '#FFFFFF',
                  color: '#5E6C84',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleBulkImport}
                disabled={importing || !importText.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #07152E 0%, #12336B 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: importing || !importText.trim() ? 'not-allowed' : 'pointer',
                  opacity: importing || !importText.trim() ? 0.6 : 1,
                }}
              >
                {importing ? 'Importing...' : 'Upload & Create Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--brand-border)',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: '#8993A4',
        }}
      >
        STRUCT Assessment Suite &copy; 2026. Administrative console.
      </footer>
    </div>
  );
}

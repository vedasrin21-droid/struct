'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminConsolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'questions' | 'candidates' | 'security'>('overview');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab 1: Overview Data
  const [summary, setSummary] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);

  // Tab 2: Exams Data
  const [exams, setExams] = useState<any[]>([]);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    title: '',
    code: '',
    description: '',
    department: 'Technical',
    durationMinutes: 15,
    passMarks: 6.0,
    negativeMarkingEnabled: true,
    shuffleQuestions: true,
    instructions: '1. Duration is 15 minutes.\n2. Answers autosave automatically.\n3. Tab switches are logged.',
    randomizeFromCategory: 'ALL',
    randomCount: 10,
    assignDepartment: 'ALL',
    allowBackNavigation: true,
    showAnswerKey: true,
    enableFullscreen: true,
    enableAiDefense: true,
    enableAntiGoogle: true,
    randomQuestionCount: 0,
    mandatoryQuestionIds: [] as string[],
  });

  // Assign Students Modal Data
  const [selectedExamForAssign, setSelectedExamForAssign] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignCandidatesList, setAssignCandidatesList] = useState<any[]>([]);
  const [assignDepts, setAssignDepts] = useState<string[]>([]);
  const [assignColleges, setAssignColleges] = useState<string[]>([]);
  const [assignDeptFilter, setAssignDeptFilter] = useState('');
  const [assignCollegeFilter, setAssignCollegeFilter] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedAssignIds, setSelectedAssignIds] = useState<Set<string>>(new Set());

  // Tab 3: Question Bank Data
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [qCategory, setQCategory] = useState('');
  const [qDifficulty, setQDifficulty] = useState('');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showImportQModal, setShowImportQModal] = useState(false);
  const [csvQText, setCsvQText] = useState('');
  const [newQForm, setNewQForm] = useState({
    text: '',
    category: 'Engineering',
    difficulty: 'medium',
    marks: 1.0,
    negativeMarks: 0.25,
    explanation: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    isMandatory: false,
  });

  // Tab 4: Candidates Data
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showImportCandModal, setShowImportCandModal] = useState(false);
  const [csvCandText, setCsvCandText] = useState('');
  const [importReport, setImportReport] = useState<any>(null);
  const [newCandForm, setNewCandForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Engineering',
    college: '',
    assignExamId: '',
  });

  // Tab 5: Security Proctoring Events
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [secSeverity, setSecSeverity] = useState('');



  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadReports(),
      loadExams(),
      loadQuestions(),
      loadCandidates(),
      loadSecurityEvents(),
    ]);
    setLoading(false);
  };

  const loadReports = async () => {
    try {
      const res = await fetch('/api/assess/admin/reports');
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setLeaderboard(data.leaderboard || []);
        setDepartmentStats(data.departmentStats || []);
      }
    } catch {}
  };

  const loadExams = async () => {
    try {
      const res = await fetch('/api/assess/admin/exams');
      const data = await res.json();
      if (res.ok) setExams(data.exams || []);
    } catch {}
  };

  const loadQuestions = async () => {
    try {
      const params = new URLSearchParams();
      if (qSearch) params.append('search', qSearch);
      if (qCategory) params.append('category', qCategory);
      if (qDifficulty) params.append('difficulty', qDifficulty);

      const res = await fetch(`/api/assess/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setCategories(data.categories || []);
      }
    } catch {}
  };

  const loadCandidates = async () => {
    try {
      const res = await fetch('/api/assess/admin/candidates');
      const data = await res.json();
      if (res.ok) setCandidates(data.candidates || []);
    } catch {}
  };

  const loadSecurityEvents = async () => {
    try {
      const url = secSeverity
        ? `/api/assess/admin/security-events?severity=${secSeverity}`
        : '/api/assess/admin/security-events';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setSecurityEvents(data.events || []);
    } catch {}
  };

  // 1. Authenticate Admin
  useEffect(() => {
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || data.user.role !== 'admin') {
          router.push('/assess');
        } else {
          setAdminUser(data.user);
          loadAllData();
        }
      })
      .catch(() => router.push('/assess'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/assess/auth/logout', { method: 'POST' });
    router.push('/assess');
  };

  // Exam actions
  const handleToggleRelease = async (examId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/assess/admin/exams/${examId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        loadExams();
        loadReports();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateExamStatus = async (examId: string, nextStatus: 'draft' | 'published' | 'closed') => {
    try {
      const res = await fetch(`/api/assess/admin/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setSuccessMsg(`Exam status updated to ${nextStatus.toUpperCase()}`);
        loadExams();
      } else {
        const d = await res.json();
        setError(d.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assess/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create exam');

      setSuccessMsg(`Exam "${examForm.title}" created successfully!`);
      setShowCreateExamModal(false);
      loadExams();
      loadReports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Question actions
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assess/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add question');

      setSuccessMsg('Question successfully added to question bank');
      setShowAddQuestionModal(false);
      setNewQForm({
        text: '',
        category: 'Engineering',
        difficulty: 'medium',
        marks: 1.0,
        negativeMarks: 0.25,
        explanation: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        isMandatory: false,
      });
      loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Student Assignment Actions
  const openAssignModal = async (exam: any) => {
    setSelectedExamForAssign(exam);
    setShowAssignModal(true);
    setAssignLoading(true);
    setAssignDeptFilter('');
    setAssignCollegeFilter('');
    setAssignSearch('');
    try {
      const res = await fetch(`/api/assess/admin/exams/${exam.id}/assign`);
      const data = await res.json();
      if (res.ok) {
        setAssignCandidatesList(data.candidates || []);
        setAssignDepts(data.departments || []);
        setAssignColleges(data.colleges || []);
        const alreadyAssigned = new Set<string>();
        (data.candidates || []).forEach((c: any) => {
          if (c.isAssigned) alreadyAssigned.add(c.id);
        });
        setSelectedAssignIds(alreadyAssigned);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedExamForAssign) return;
    try {
      setAssignLoading(true);
      const res = await fetch(`/api/assess/admin/exams/${selectedExamForAssign.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: Array.from(selectedAssignIds),
          action: 'assign'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Student assignments updated for ${selectedExamForAssign.code}`);
        setShowAssignModal(false);
        loadExams();
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignDepartment = async (dept: string) => {
    if (!selectedExamForAssign) return;
    try {
      setAssignLoading(true);
      const res = await fetch(`/api/assess/admin/exams/${selectedExamForAssign.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dept, action: 'assign' })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Assigned all candidates in ${dept}`);
        openAssignModal(selectedExamForAssign);
        loadExams();
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/assess/admin/questions?id=${qId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete question');

      setSuccessMsg('Question deleted');
      loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportQuestionsCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assess/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvQText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'CSV import failed');

      setSuccessMsg(`Imported ${data.importedCount} questions successfully! (${data.errorsCount} errors)`);
      setShowImportQModal(false);
      setCsvQText('');
      loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Candidate actions
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assess/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create candidate');

      setSuccessMsg(`Candidate ${newCandForm.name} created successfully!`);
      setShowAddCandidateModal(false);
      setNewCandForm({ name: '', email: '', password: '', department: 'Engineering', college: '', assignExamId: '' });
      loadCandidates();
      loadReports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportCandidatesCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assess/admin/candidates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvCandText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'CSV import failed');

      setImportReport(data);
      setSuccessMsg(`Imported ${data.importedCount} candidates successfully!`);
      loadCandidates();
      loadReports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        background: '#0A1B38',
        color: '#FFFFFF',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1.1rem'
              }}>
                S
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>STRUCT</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#0284C7', color: '#FFF' }}>ADMIN CONSOLE</span>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {adminUser && (
              <span style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                Signed in as <strong>{adminUser.name}</strong> ({adminUser.email})
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-header (Tabs) */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', gap: '24px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Dashboard & Reports' },
            { id: 'exams', label: 'Examinations' },
            { id: 'questions', label: 'Question Bank' },
            { id: 'candidates', label: 'Candidates Roster' },
            { id: 'security', label: 'Proctoring Telemetry' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setError(null); setSuccessMsg(null); }}
              style={{
                padding: '16px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #0284C7' : '3px solid transparent',
                color: activeTab === tab.id ? '#0284C7' : '#64748B',
                fontWeight: activeTab === tab.id ? 700 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1360px', margin: '0 auto', padding: '28px 24px', width: '100%' }}>
        {/* Global Notifications */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>&times;</button>
          </div>
        )}
        {successMsg && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>&times;</button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '32px' }}>
              <div style={{ background: '#FFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Registered Candidates</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0A1B38', marginTop: '6px' }}>{summary?.totalCandidates ?? 0}</div>
              </div>
              <div style={{ background: '#FFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Configured Exams</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284C7', marginTop: '6px' }}>{summary?.totalExams ?? 0}</div>
              </div>
              <div style={{ background: '#FFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completed Submissions</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16A34A', marginTop: '6px' }}>{summary?.totalAttempts ?? 0}</div>
              </div>
              <div style={{ background: '#FFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Overall Pass Rate</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0A1B38', marginTop: '6px' }}>{summary?.passRate ?? 0}%</div>
              </div>
              <div style={{ background: '#FFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Proctor Security Signals</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D97706', marginTop: '6px' }}>{summary?.securityEventsCount ?? 0}</div>
              </div>
            </div>

            {/* Department Comparison Table */}
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>
                Department Performance Benchmark
              </h3>
              {departmentStats.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '0.88rem' }}>No department submissions recorded yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 14px' }}>Department</th>
                        <th style={{ padding: '10px 14px' }}>Candidates</th>
                        <th style={{ padding: '10px 14px' }}>Submissions</th>
                        <th style={{ padding: '10px 14px' }}>Average Score</th>
                        <th style={{ padding: '10px 14px' }}>Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentStats.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0A1B38' }}>{d.department}</td>
                          <td style={{ padding: '12px 14px' }}>{d.total_candidates}</td>
                          <td style={{ padding: '12px 14px' }}>{d.total_attempts}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{d.avg_score}</td>
                          <td style={{ padding: '12px 14px', color: d.pass_rate >= 60 ? '#15803D' : '#B91C1C', fontWeight: 700 }}>{d.pass_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Candidate Submissions Leaderboard */}
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>
                Ranked Submissions Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '0.88rem' }}>No candidate submissions completed yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 14px' }}>Rank</th>
                        <th style={{ padding: '10px 14px' }}>Candidate</th>
                        <th style={{ padding: '10px 14px' }}>Department</th>
                        <th style={{ padding: '10px 14px' }}>Exam Title</th>
                        <th style={{ padding: '10px 14px' }}>Score</th>
                        <th style={{ padding: '10px 14px' }}>Percentage</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px' }}>Violations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map(row => (
                        <tr key={row.attempt_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: row.rank <= 3 ? '#0284C7' : '#64748B' }}>
                            #{row.rank}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0A1B38' }}>{row.candidate_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.email}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>{row.department}</td>
                          <td style={{ padding: '12px 14px' }}>{row.exam_title}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700 }}>{row.score} / {row.total_marks}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{row.percentage}%</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: row.pass_status === 'passed' ? '#DCFCE7' : '#FEE2E2',
                              color: row.pass_status === 'passed' ? '#15803D' : '#991B1B',
                              textTransform: 'capitalize'
                            }}>
                              {row.pass_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ color: row.security_violations_count > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                              {row.security_violations_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EXAMS MANAGEMENT */}
        {activeTab === 'exams' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                  Active &amp; Configured Examinations
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Manage scheduled exams, configure test duration and negative marking, and publish official results.
                </p>
              </div>

              <button
                onClick={() => setShowCreateExamModal(true)}
                style={{
                  background: '#0A1B38',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                + Create New Examination
              </button>
            </div>

            {/* Exams Table */}
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '10px 14px' }}>Exam Code &amp; Title</th>
                      <th style={{ padding: '10px 14px' }}>Department</th>
                      <th style={{ padding: '10px 14px' }}>Duration</th>
                      <th style={{ padding: '10px 14px' }}>Questions</th>
                      <th style={{ padding: '10px 14px' }}>Candidates</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Results Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(ex => (
                      <tr key={ex.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                              {ex.code}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0A1B38' }}>{ex.title}</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                            Pass threshold: {ex.pass_marks} / {ex.total_marks} marks &bull; {ex.negative_marking_enabled ? 'Negative Marking' : 'No Negative Marks'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{ex.department}</td>
                        <td style={{ padding: '12px 14px' }}>{ex.duration_minutes}m</td>
                        <td style={{ padding: '12px 14px' }}>{ex.questions_count} Qs</td>
                        <td style={{ padding: '12px 14px' }}>{ex.candidates_count} Assigned</td>
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={ex.status}
                            onChange={e => handleUpdateExamStatus(ex.id, e.target.value as any)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              border: '1px solid #CBD5E1',
                              background: ex.status === 'published' ? '#DCFCE7' : ex.status === 'closed' ? '#F1F5F9' : '#FEF3C7',
                              color: ex.status === 'published' ? '#15803D' : ex.status === 'closed' ? '#475569' : '#B45309',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            onClick={() => handleToggleRelease(ex.id, Boolean(ex.results_released))}
                            style={{
                              background: ex.results_released ? '#DCFCE7' : '#F1F5F9',
                              color: ex.results_released ? '#15803D' : '#64748B',
                              border: `1px solid ${ex.results_released ? '#86EFAC' : '#CBD5E1'}`,
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {ex.results_released ? 'Released (Public)' : 'Withheld (Draft)'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => openAssignModal(ex)}
                            style={{
                              background: '#0284C7',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginRight: '8px',
                              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                            }}
                          >
                            👥 Assign Students ({ex.candidates_count})
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                            {ex.attempts_count} Submissions
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                  Question Bank &amp; Categorization
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Manage institutional multiple-choice question repositories with solution explanations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowImportQModal(true)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Import CSV Questions
                </button>
                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  style={{
                    background: '#0A1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  + Add Question
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div style={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search question text or category..."
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
              <select
                value={qCategory}
                onChange={e => setQCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={qDifficulty}
                onChange={e => setQDifficulty(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button
                onClick={loadQuestions}
                style={{ background: '#0284C7', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Filter
              </button>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {q.category}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: q.difficulty === 'easy' ? '#DCFCE7' : q.difficulty === 'medium' ? '#FEF3C7' : '#FEE2E2',
                        color: q.difficulty === 'easy' ? '#15803D' : q.difficulty === 'medium' ? '#B45309' : '#991B1B'
                      }}>
                        {q.difficulty}
                      </span>
                      {q.is_mandatory ? (
                        <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ⭐ Mandatory
                        </span>
                      ) : null}
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        +{q.marks} / -{q.negative_marks} mark
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                    {idx + 1}. {q.text}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                    {q.options.map((opt: string, optIdx: number) => {
                      const isCorrect = optIdx === q.correct_option_index;
                      return (
                        <div
                          key={optIdx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: isCorrect ? '#F0FDF4' : '#F8FAFC',
                            border: `1px solid ${isCorrect ? '#86EFAC' : '#E2E8F0'}`,
                            fontSize: '0.82rem',
                            color: isCorrect ? '#166534' : '#334155',
                            fontWeight: isCorrect ? 700 : 400
                          }}
                        >
                          {['A', 'B', 'C', 'D'][optIdx]}. {opt} {isCorrect ? '✓' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', borderTop: '1px dashed #F1F5F9', paddingTop: '6px' }}>
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CANDIDATES ROSTER */}
        {activeTab === 'candidates' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                  Candidate Roster &amp; Cohort Management
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Create single accounts or bulk import candidate cohorts via CSV with row-level validation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href="/api/assess/admin/candidates/export"
                  download
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  Export CSV
                </a>
                <button
                  onClick={() => setShowImportCandModal(true)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Bulk Import CSV
                </button>
                <button
                  onClick={() => setShowAddCandidateModal(true)}
                  style={{
                    background: '#0A1B38',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  + Add Candidate
                </button>
              </div>
            </div>

            {/* Candidates Table */}
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '10px 14px' }}>Candidate Name</th>
                      <th style={{ padding: '10px 14px' }}>Email Address</th>
                      <th style={{ padding: '10px 14px' }}>Department</th>
                      <th style={{ padding: '10px 14px' }}>College / Org</th>
                      <th style={{ padding: '10px 14px' }}>Assigned Tests</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0A1B38' }}>{c.name}</td>
                        <td style={{ padding: '12px 14px' }}>{c.email}</td>
                        <td style={{ padding: '12px 14px' }}>{c.department}</td>
                        <td style={{ padding: '12px 14px', color: '#64748B' }}>{c.college || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{c.assigned_exams_count} Assigned</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: c.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                            color: c.status === 'active' ? '#15803D' : '#991B1B'
                          }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY PROCTORING TELEMETRY */}
        {activeTab === 'security' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                  Proctoring Telemetry &amp; Security Signals
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Signals recorded during candidate sessions (tab switches, fullscreen exits, window blur). Non-punitive review logs.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={secSeverity}
                  onChange={e => { setSecSeverity(e.target.value); setTimeout(loadSecurityEvents, 50); }}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="">All Severities</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="low">Low Severity</option>
                </select>
                <button
                  onClick={loadSecurityEvents}
                  style={{ background: '#0A1B38', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Refresh Log
                </button>
              </div>
            </div>

            {/* Events Table */}
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
              {securityEvents.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '0.88rem' }}>No security events recorded.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 14px' }}>Timestamp</th>
                        <th style={{ padding: '10px 14px' }}>Candidate</th>
                        <th style={{ padding: '10px 14px' }}>Exam</th>
                        <th style={{ padding: '10px 14px' }}>Signal Type</th>
                        <th style={{ padding: '10px 14px' }}>Severity</th>
                        <th style={{ padding: '10px 14px' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityEvents.map(ev => (
                        <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0A1B38' }}>{ev.candidate_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{ev.candidate_email}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>{ev.exam_title}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>
                            {ev.event_type}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: ev.severity === 'high' ? '#FEE2E2' : ev.severity === 'medium' ? '#FEF3C7' : '#F1F5F9',
                              color: ev.severity === 'high' ? '#991B1B' : ev.severity === 'medium' ? '#B45309' : '#475569',
                              textTransform: 'uppercase'
                            }}>
                              {ev.severity}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#475569' }}>
                            {ev.details || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: CREATE EXAM */}
        {showCreateExamModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>Create New Examination</h3>
              <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Exam Title</label>
                  <input
                    type="text" required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="e.g. Campus Recruitment Engineering Assessment 2026"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Unique Exam Code</label>
                    <input
                      type="text" required value={examForm.code} onChange={e => setExamForm({ ...examForm, code: e.target.value })}
                      placeholder="e.g. CAMPUS-2026-ENG"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                    <input
                      type="text" value={examForm.department} onChange={e => setExamForm({ ...examForm, department: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Duration (Minutes)</label>
                    <input
                      type="number" min="1" value={examForm.durationMinutes} onChange={e => setExamForm({ ...examForm, durationMinutes: parseInt(e.target.value, 10) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Pass Score Threshold</label>
                    <input
                      type="number" step="0.5" value={examForm.passMarks} onChange={e => setExamForm({ ...examForm, passMarks: parseFloat(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.negativeMarkingEnabled}
                      onChange={e => setExamForm({ ...examForm, negativeMarkingEnabled: e.target.checked })}
                    />
                    <span>Negative Marking (-0.25)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.shuffleQuestions}
                      onChange={e => setExamForm({ ...examForm, shuffleQuestions: e.target.checked })}
                    />
                    <span>Shuffle Question Order</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.allowBackNavigation}
                      onChange={e => setExamForm({ ...examForm, allowBackNavigation: e.target.checked })}
                    />
                    <span>Allow Previous Navigation</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.showAnswerKey}
                      onChange={e => setExamForm({ ...examForm, showAnswerKey: e.target.checked })}
                    />
                    <span>Reveal Answer Key on Release</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.enableFullscreen}
                      onChange={e => setExamForm({ ...examForm, enableFullscreen: e.target.checked })}
                    />
                    <span>Enforce Fullscreen Mode</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={examForm.enableAiDefense}
                      onChange={e => setExamForm({ ...examForm, enableAiDefense: e.target.checked })}
                    />
                    <span>Anti-AI Vision Protection</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', gridColumn: 'span 2', background: 'rgba(56, 189, 248, 0.08)', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                    <input
                      type="checkbox" checked={examForm.enableAntiGoogle}
                      onChange={e => setExamForm({ ...examForm, enableAntiGoogle: e.target.checked })}
                    />
                    <span style={{ fontWeight: 700, color: '#0369A1' }}>🛡️ Anti-Google &amp; Anti-Lens Shield (Adversarial Homoglyphs, Anti-OCR Lattice &amp; Search Poisoning)</span>
                  </label>
                </div>

                {/* Pool & Mandatory Questions Control */}
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>
                    Question Pool &amp; Randomization Limit
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#0284C7', marginBottom: '8px' }}>
                    Mandatory questions are always asked. Remaining slots are randomly drawn from unmandatory pool. (0 = all questions)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Questions to Ask:</label>
                    <input
                      type="number" min="0" value={examForm.randomQuestionCount}
                      onChange={e => setExamForm({ ...examForm, randomQuestionCount: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowCreateExamModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0A1B38', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Create Exam</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD QUESTION */}
        {showAddQuestionModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>Add Question to Bank</h3>
              <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Question Prompt</label>
                  <textarea
                    required rows={3} value={newQForm.text} onChange={e => setNewQForm({ ...newQForm, text: e.target.value })}
                    placeholder="Enter the full question prompt..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                    <input
                      type="text" required value={newQForm.category} onChange={e => setNewQForm({ ...newQForm, category: e.target.value })}
                      placeholder="e.g. Data Structures, React, SQL"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Difficulty</label>
                    <select
                      value={newQForm.difficulty} onChange={e => setNewQForm({ ...newQForm, difficulty: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* 4 Options */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Answer Options &amp; Solution Key</label>
                  {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={newQForm.correctOptionIndex === optIdx}
                        onChange={() => setNewQForm({ ...newQForm, correctOptionIndex: optIdx })}
                        title={`Select ${letter} as correct solution`}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', width: '20px' }}>{letter}.</span>
                      <input
                        type="text" required
                        value={newQForm.options[optIdx]}
                        onChange={e => {
                          const nextOpts = [...newQForm.options];
                          nextOpts[optIdx] = e.target.value;
                          setNewQForm({ ...newQForm, options: nextOpts });
                        }}
                        placeholder={`Option ${letter} text`}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    Click the radio button beside the correct solution option.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rationale / Explanation (Optional)</label>
                  <input
                    type="text" value={newQForm.explanation} onChange={e => setNewQForm({ ...newQForm, explanation: e.target.value })}
                    placeholder="Why this answer is correct (revealed after result release)"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer', background: '#FEF3C7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                  <input
                    type="checkbox"
                    checked={newQForm.isMandatory}
                    onChange={e => setNewQForm({ ...newQForm, isMandatory: e.target.checked })}
                  />
                  <span><strong>⭐ Mark as Mandatory Question</strong> (Must always be included for every candidate)</span>
                </label>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowAddQuestionModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0A1B38', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Save Question</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: IMPORT QUESTIONS CSV */}
        {showImportQModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>Import Questions via CSV</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '14px' }}>
                Required headers: <code>text,category,difficulty,option1,option2,option3,option4,correct,explanation</code>
              </p>
              <form onSubmit={handleImportQuestionsCsv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <textarea
                  rows={8} required value={csvQText} onChange={e => setCsvQText(e.target.value)}
                  placeholder={`text,category,difficulty,option1,option2,option3,option4,correct,explanation\n"What is 2+2?","Math","easy","3","4","5","6","2","Basic addition"`}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowImportQModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0A1B38', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Import CSV</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD CANDIDATE */}
        {showAddCandidateModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>Add Single Candidate</h3>
              <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Candidate Name</label>
                  <input
                    type="text" required value={newCandForm.name} onChange={e => setNewCandForm({ ...newCandForm, name: e.target.value })}
                    placeholder="e.g. Priya Patel"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <input
                    type="email" required value={newCandForm.email} onChange={e => setNewCandForm({ ...newCandForm, email: e.target.value })}
                    placeholder="priya@example.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Initial Password</label>
                  <input
                    type="password" required value={newCandForm.password} onChange={e => setNewCandForm({ ...newCandForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                    <input
                      type="text" value={newCandForm.department} onChange={e => setNewCandForm({ ...newCandForm, department: e.target.value })}
                      placeholder="Engineering"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>College / Org</label>
                    <input
                      type="text" value={newCandForm.college} onChange={e => setNewCandForm({ ...newCandForm, college: e.target.value })}
                      placeholder="e.g. Stanford University"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowAddCandidateModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0A1B38', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Create Candidate</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: IMPORT CANDIDATES CSV */}
        {showImportCandModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>Bulk Import Candidates via CSV</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '14px' }}>
                Required headers: <code>name,email,password,department,college</code>
              </p>
              <form onSubmit={handleImportCandidatesCsv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <textarea
                  rows={8} required value={csvCandText} onChange={e => setCsvCandText(e.target.value)}
                  placeholder={`name,email,password,department,college\n"Priya Patel","priya@example.com","PriyaPass123!","Engineering","IIT Bombay"\n"Rohan Sharma","rohan@example.com","RohanPass123!","Design","NID Ahmedabad"`}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />

                {importReport && (
                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', fontSize: '0.8rem', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 700, color: '#166534' }}>Imported: {importReport.importedCount} candidates</div>
                    {importReport.errorsCount > 0 && (
                      <div style={{ color: '#991B1B', marginTop: '4px' }}>
                        Errors ({importReport.errorsCount}):
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {importReport.errors.map((e: any, idx: number) => (
                            <li key={idx}>Row {e.row}: {e.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowImportCandModal(false); setImportReport(null); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}>Close</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0A1B38', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Import CSV Roster</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ASSIGN STUDENTS TO EXAM */}
        {showAssignModal && selectedExamForAssign && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 27, 56, 0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                      Assign Candidates to Assessment
                    </h3>
                    <div style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '4px' }}>
                      {selectedExamForAssign.title} &bull; <strong style={{ color: '#0284C7' }}>{selectedExamForAssign.code}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Department Quick Assign Buttons */}
              {assignDepts.length > 0 && (
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    Quick Assign by Department:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {assignDepts.map(dept => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => handleAssignDepartment(dept)}
                        style={{
                          background: '#E0F2FE',
                          color: '#0369A1',
                          border: '1px solid #BAE6FD',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Assign All {dept}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search student by name or email..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                />
                <select
                  value={assignDeptFilter}
                  onChange={e => setAssignDeptFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                >
                  <option value="">All Departments</option>
                  {assignDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={assignCollegeFilter}
                  onChange={e => setAssignCollegeFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                >
                  <option value="">All Colleges</option>
                  {assignColleges.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Candidate Selection List */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                {assignCandidatesList
                  .filter(c => {
                    const matchesSearch = !assignSearch || c.name.toLowerCase().includes(assignSearch.toLowerCase()) || c.email.toLowerCase().includes(assignSearch.toLowerCase());
                    const matchesDept = !assignDeptFilter || c.department === assignDeptFilter;
                    const matchesCol = !assignCollegeFilter || c.college === assignCollegeFilter;
                    return matchesSearch && matchesDept && matchesCol;
                  })
                  .map(c => {
                    const isSelected = selectedAssignIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          const next = new Set(selectedAssignIds);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          setSelectedAssignIds(next);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#F0F9FF' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{c.name}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{c.email} &bull; {c.department} {c.college ? `(${c.college})` : ''}</div>
                          </div>
                        </div>

                        <div>
                          {c.isAssigned ? (
                            <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                              Assigned
                            </span>
                          ) : (
                            <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                              Not Assigned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                  <strong>{selectedAssignIds.size}</strong> candidate(s) selected
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = new Set(assignCandidatesList.map(c => c.id));
                      setSelectedAssignIds(allIds);
                    }}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignIds(new Set())}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssignments}
                    disabled={assignLoading}
                    style={{
                      background: '#0A1B38',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: assignLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(10, 27, 56, 0.25)'
                    }}
                  >
                    {assignLoading ? 'Saving...' : 'Save Student Assignments'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

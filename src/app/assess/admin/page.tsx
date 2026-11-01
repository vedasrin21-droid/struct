'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminConsolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'questions' | 'candidates' | 'security' | 'organization'>('overview');
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
    authMode: 'exam_only' as 'exam_only' | 'clerk',
    accessScope: 'single' as 'single' | 'multiple',
    maxAttempts: 1,
  });

  // Tab 6: Organization Profile & Team Members
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [orgProfile, setOrgProfile] = useState<any>(null);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [batchCandCount, setBatchCandCount] = useState(10);
  const [batchCandDept, setBatchCandDept] = useState('Engineering');
  const [batchCandScope, setBatchCandScope] = useState<'single' | 'multiple'>('single');
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);

  // Organization Onboarding & Creation Modal
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [orgCreating, setOrgCreating] = useState(false);
  const [orgFormError, setOrgFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    domain: '',
    logoUrl: '',
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



  const loadOrgData = async (targetOrgId?: string) => {
    try {
      const orgQuery = targetOrgId ? `?orgId=${encodeURIComponent(targetOrgId)}` : (activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : '');
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/org/profile${orgQuery}`),
        fetch(`/api/org/members${orgQuery}`),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setHasOrg(Boolean(pData.hasOrg));
        setOrgProfile(pData.organization || null);
        setUserOrganizations(pData.userOrganizations || []);
        if (pData.activeOrgId) {
          setActiveOrgId(pData.activeOrgId);
        }
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setOrgMembers(mData.members || []);
      }
    } catch {}
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgForm(prev => ({
      ...prev,
      name: val,
      slug: slugTouched ? prev.slug : generateSlug(val),
    }));
  };

  const handleOrgSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setOrgForm(prev => ({
      ...prev,
      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgFormError(null);

    const name = orgForm.name.trim();
    if (!name || name.length < 2) {
      setOrgFormError('Organization name must be at least 2 characters long.');
      return;
    }

    setOrgCreating(true);
    try {
      const res = await fetch('/api/org/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: orgForm.slug.trim() || undefined,
          domain: orgForm.domain.trim() || undefined,
          logoUrl: orgForm.logoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      const created = data.organization;
      setSuccessMsg(`Organization "${created.name}" created successfully!`);
      setShowCreateOrgModal(false);
      setOrgForm({ name: '', slug: '', domain: '', logoUrl: '' });
      setSlugTouched(false);
      setActiveOrgId(created.id);
      await loadOrgData(created.id);
      setActiveTab('organization');
    } catch (err: any) {
      setOrgFormError(err.message);
    } finally {
      setOrgCreating(false);
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    setActiveOrgId(orgId);
    await loadOrgData(orgId);
    setSuccessMsg('Switched organization workspace.');
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadReports(),
      loadExams(),
      loadQuestions(),
      loadCandidates(),
      loadSecurityEvents(),
      loadOrgData(),
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

  const handleGenerateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/org/candidates/generate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: batchCandCount,
          department: batchCandDept,
          accessScope: batchCandScope,
          examId: exams[0]?.id || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate credentials');
      setGeneratedBatch(data.candidates || []);
      setSuccessMsg(`Successfully generated ${data.count} Mode B candidate credentials!`);
      loadCandidates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
          orgId: activeOrgId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      setSuccessMsg(`Added team member ${newMemberEmail} (${newMemberRole})`);
      setNewMemberEmail('');
      loadOrgData(activeOrgId || undefined);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 1. Authenticate Admin
  useEffect(() => {
    fetch('/api/assess/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || (data.user.role !== 'admin' && data.user.role !== 'super_admin')) {
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {hasOrg && userOrganizations.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>WORKSPACE:</span>
                <select
                  value={activeOrgId || ''}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setOrgFormError(null);
                      setShowCreateOrgModal(true);
                    } else {
                      handleSwitchOrg(e.target.value);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {userOrganizations.map((o) => (
                    <option key={o.id} value={o.id} style={{ background: '#0A1B38', color: '#FFF' }}>
                      🏢 {o.name} ({o.role})
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" style={{ background: '#0284C7', color: '#FFF', fontWeight: 700 }}>
                    + Create New Organization...
                  </option>
                </select>
              </div>
            )}

            {hasOrg === false && (
              <button
                onClick={() => {
                  setOrgFormError(null);
                  setShowCreateOrgModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
                }}
              >
                + Set Up Organization
              </button>
            )}

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
            { id: 'organization', label: 'Organization & Team' },
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
            {hasOrg === false && (
              <div style={{
                background: 'linear-gradient(135deg, #0A1B38 0%, #1E3A8A 100%)',
                borderRadius: '16px',
                padding: '22px 26px',
                marginBottom: '28px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '18px',
                boxShadow: '0 8px 24px rgba(10, 27, 56, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ maxWidth: '720px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700, marginBottom: '8px' }}>
                    <span>✨</span> STRUCT ENTERPRISE SETUP
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px', color: '#FFFFFF' }}>
                    Set up your organization workspace
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>
                    Create an organization to activate multi-tenant isolation, invite team admins, configure custom institutional domains, and provision candidate rosters.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setOrgFormError(null);
                      setShowCreateOrgModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px 20px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Set Up Organization Now
                  </button>
                </div>
              </div>
            )}

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

        {/* TAB 6: ORGANIZATION & TEAM */}
        {activeTab === 'organization' && (
          <div>
            {!hasOrg ? (
              /* ONBOARDING WELCOME SCREEN */
              <div style={{ maxWidth: '880px', margin: '20px auto 40px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                  padding: '48px 40px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                    color: '#FFFFFF',
                    fontSize: '1.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)'
                  }}>
                    🏢
                  </div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 10px' }}>
                    Set Up Your Organization Workspace
                  </h2>
                  <p style={{ fontSize: '0.98rem', color: '#64748B', maxWidth: '620px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                    You haven&apos;t joined or created an organization workspace yet. Establish your institutional workspace to unlock enterprise assessment controls, configure multi-tenant isolation, invite team admins, and manage candidate rosters.
                  </p>

                  <button
                    onClick={() => {
                      setOrgFormError(null);
                      setShowCreateOrgModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 32px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(2, 132, 199, 0.35)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    + Create Organization Workspace
                  </button>

                  {/* Feature Highlights Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px',
                    marginTop: '48px',
                    textAlign: 'left'
                  }}>
                    <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>🛡️</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0A1B38', marginBottom: '6px' }}>
                        Multi-Tenant Isolation
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                        All candidate telemetry, question banks, and examinations are cryptographically walled under your tenant boundary.
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>👥</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0A1B38', marginBottom: '6px' }}>
                        Team RBAC Governance
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                        Invite co-examiners and department administrators with granular role permissions and team seat controls.
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>🌐</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0A1B38', marginBottom: '6px' }}>
                        Branded Portal &amp; Domain
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                        Map institutional custom domains and display white-labeled logos across exams and verified scorecards.
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>⚡</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0A1B38', marginBottom: '6px' }}>
                        Candidate Roster Batching
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                        Instantly provision Mode B exam credentials with mandatory first-login password rotation.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE ORGANIZATION DASHBOARD */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1B38', margin: 0 }}>
                      Organization Profile &amp; Governance
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                      Manage enterprise workspace settings, administrative team seats, and candidate credential batches.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {userOrganizations.length > 1 && (
                      <select
                        value={activeOrgId || ''}
                        onChange={(e) => {
                          if (e.target.value === '__CREATE_NEW__') {
                            setOrgFormError(null);
                            setShowCreateOrgModal(true);
                          } else {
                            handleSwitchOrg(e.target.value);
                          }
                        }}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.86rem',
                          fontWeight: 600,
                          color: '#0F172A',
                          cursor: 'pointer'
                        }}
                      >
                        {userOrganizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            🏢 {o.name} ({o.role})
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => {
                        setOrgFormError(null);
                        setShowCreateOrgModal(true);
                      }}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      + New Organization
                    </button>
                    <button
                      onClick={() => loadOrgData(activeOrgId || undefined)}
                      style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 14px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Org Profile Header Card */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                  <div style={{ background: '#FFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {orgProfile?.logo_url ? (
                      <img
                        src={orgProfile.logo_url}
                        alt="Org Logo"
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'contain', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                        onError={(e) => { (e.target as any).style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800 }}>
                        {(orgProfile?.name || 'O').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Workspace Name</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginTop: '4px' }}>
                        {orgProfile?.name || 'Enterprise Workspace'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#0284C7', marginTop: '2px' }}>
                        Slug: <code>{orgProfile?.slug || 'default'}</code>
                        {orgProfile?.domain && <span style={{ color: '#64748B', marginLeft: '8px' }}>• {orgProfile.domain}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#FFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Subscription Tier</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A', marginTop: '6px' }}>
                      {(orgProfile?.plan_tier || 'recruit_pro').toUpperCase().replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '4px' }}>
                      Multi-tenant assessment isolation active
                    </div>
                  </div>

                  <div style={{ background: '#FFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Team Members</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', marginTop: '6px' }}>
                      {orgMembers.length} Active Admins
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '4px' }}>
                      Role-based access control enabled
                    </div>
                  </div>
                </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Member Management */}
              <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0A1B38', marginBottom: '16px' }}>
                  Administrative Team Seats
                </h3>
                <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                  <input
                    type="email" required placeholder="colleague@institution.com"
                    value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  />
                  <select
                    value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as any)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button type="submit" style={{ padding: '8px 16px', background: '#0A1B38', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                    + Add
                  </button>
                </form>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                        <th style={{ padding: '8px 12px' }}>User</th>
                        <th style={{ padding: '8px 12px' }}>Role</th>
                        <th style={{ padding: '8px 12px' }}>Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgMembers.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{m.user_name || m.user_email}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{m.user_email}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: m.role === 'owner' ? '#FEF3C7' : '#E0F2FE', color: m.role === 'owner' ? '#B45309' : '#0369A1' }}>
                              {m.role.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#64748B' }}>
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mode B Candidate Credential Generator */}
              <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0A1B38', marginBottom: '8px' }}>
                  ⚡ Mode B Candidate Credential Generator
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
                  Generate secure, temporary login credentials with mandatory first-login password rotation. Exam-only credentials are isolated from general platform products.
                </p>

                <form onSubmit={handleGenerateCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Batch Size (Count)</label>
                      <input
                        type="number" min="1" max="100" value={batchCandCount}
                        onChange={e => setBatchCandCount(parseInt(e.target.value, 10) || 1)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                      <input
                        type="text" value={batchCandDept}
                        onChange={e => setBatchCandDept(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Access Scope</label>
                    <select
                      value={batchCandScope} onChange={e => setBatchCandScope(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    >
                      <option value="single">Single Assessment (Locked strictly to assigned exam)</option>
                      <option value="multiple">Multiple Assigned Assessments</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{ padding: '10px 18px', background: '#0284C7', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginTop: '6px' }}
                  >
                    Generate {batchCandCount} Exam-Only Credentials
                  </button>
                </form>

                {generatedBatch.length > 0 && (
                  <div style={{ marginTop: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                        ✓ Generated {generatedBatch.length} Credentials
                      </span>
                      <button
                        onClick={() => {
                          const csv = 'Email,TemporaryPassword,Department,Scope\n' + generatedBatch.map(c => `"${c.email}","${c.tempPassword}","${c.department}","${c.accessScope}"`).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `credentials_batch_${Date.now()}.csv`;
                          a.click();
                        }}
                        style={{ background: '#0A1B38', color: '#FFF', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Download CSV
                      </button>
                    </div>
                    <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {generatedBatch.slice(0, 5).map((c, i) => (
                        <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid #E2E8F0' }}>
                          <strong>{c.email}</strong> — Password: <code>{c.tempPassword}</code>
                        </div>
                      ))}
                      {generatedBatch.length > 5 && (
                        <div style={{ color: '#64748B', paddingTop: '4px' }}>...and {generatedBatch.length - 5} more in downloaded CSV</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Candidate Auth Mode</label>
                    <select
                      value={examForm.authMode}
                      onChange={e => setExamForm({ ...examForm, authMode: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    >
                      <option value="exam_only">Mode B: Exam-Only Token</option>
                      <option value="clerk">Mode A: Clerk Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Access Scope</label>
                    <select
                      value={examForm.accessScope}
                      onChange={e => setExamForm({ ...examForm, accessScope: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    >
                      <option value="single">Single Assessment Only</option>
                      <option value="multiple">Multiple Assessments</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Max Attempts</label>
                    <input
                      type="number" min="1" max="10"
                      value={examForm.maxAttempts}
                      onChange={e => setExamForm({ ...examForm, maxAttempts: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
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
        {/* MODAL: CREATE / ONBOARD ORGANIZATION */}
        {showCreateOrgModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 27, 56, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0'
            }}>
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #0A1B38 0%, #1E293B 100%)',
                padding: '24px 28px',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STRUCT Enterprise Onboarding
                  </div>
                  <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 800 }}>
                    Create Organization Workspace
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!orgCreating) {
                      setShowCreateOrgModal(false);
                      setOrgFormError(null);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#FFFFFF',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: orgCreating ? 'not-allowed' : 'pointer',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateOrganization} style={{ padding: '28px' }}>
                {orgFormError && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.85rem',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⚠️</span>
                    <span>{orgFormError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                      Organization Name <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation or Stanford University"
                      value={orgForm.name}
                      onChange={handleOrgNameChange}
                      disabled={orgCreating}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                      Workspace URL Slug <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#F8FAFC'
                    }}>
                      <span style={{ padding: '10px 12px', fontSize: '0.85rem', color: '#64748B', background: '#F1F5F9', borderRight: '1px solid #CBD5E1', whiteSpace: 'nowrap' }}>
                        struct.careers/org/
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="acme-corp"
                        value={orgForm.slug}
                        onChange={handleOrgSlugChange}
                        disabled={orgCreating}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: 'none',
                          fontSize: '0.9rem',
                          outline: 'none',
                          background: '#FFFFFF'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Unique alphanumeric slug. Used for candidate portal access and multi-tenant isolation.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                      Institutional Domain <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748B' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. acme.edu or assessment.acme.com"
                      value={orgForm.domain}
                      onChange={e => setOrgForm({ ...orgForm, domain: e.target.value })}
                      disabled={orgCreating}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Whitelisted institutional email domain or custom URL mapping.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                      Logo URL <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748B' }}>(Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://acme.com/assets/logo.png"
                      value={orgForm.logoUrl}
                      onChange={e => setOrgForm({ ...orgForm, logoUrl: e.target.value })}
                      disabled={orgCreating}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Public image URL to display on candidate test views and custom reports.
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!orgCreating) {
                        setShowCreateOrgModal(false);
                        setOrgFormError(null);
                      }
                    }}
                    disabled={orgCreating}
                    style={{
                      padding: '10px 18px',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: orgCreating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={orgCreating}
                    style={{
                      padding: '10px 22px',
                      background: orgCreating ? '#94A3B8' : '#0284C7',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      cursor: orgCreating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    {orgCreating ? (
                      <>
                        <span>⏳</span>
                        <span>Creating Workspace...</span>
                      </>
                    ) : (
                      'Create Organization Workspace'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

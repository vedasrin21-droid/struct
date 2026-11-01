'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalCandidates: number;
  totalExams: number;
  totalAttempts: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  totalRevenueInr: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  status: string;
  created_at: number;
}

interface PromoRow {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number;
  current_uses: number;
  expires_at: number | null;
  is_active: number;
}

interface AuditRow {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address: string;
  created_at: number;
  user_email?: string;
  user_name?: string;
}

export default function SuperAdminPortal() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'promos' | 'audit'>('metrics');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Promo modal state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 20,
    maxUses: 100,
  });

  const loadData = async () => {
    try {
      // 1. Stats
      const resStats = await fetch('/api/superadmin/stats');
      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data.stats);
      } else if (resStats.status === 403) {
        setError('Super Administrator session required. Please authenticate as platform owner.');
      }

      // 2. Users
      const resUsers = await fetch('/api/superadmin/users');
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data.users || []);
      }

      // 3. Promos
      const resPromos = await fetch('/api/superadmin/promos');
      if (resPromos.ok) {
        const data = await resPromos.json();
        setPromos(data.promos || []);
      }

      // 4. Audit Logs
      const resAudit = await fetch('/api/superadmin/audit');
      if (resAudit.ok) {
        const data = await resAudit.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load console data');
    }
  };

  useEffect(() => {
    let ignore = false;
    async function startFetching() {
      try {
        const resStats = await fetch('/api/superadmin/stats');
        if (resStats.ok) {
          const data = await resStats.json();
          if (!ignore) setStats(data.stats);
        } else if (resStats.status === 403) {
          if (!ignore) setError('Super Administrator session required. Please authenticate as platform owner.');
        }

        const resUsers = await fetch('/api/superadmin/users');
        if (resUsers.ok) {
          const data = await resUsers.json();
          if (!ignore) setUsers(data.users || []);
        }

        const resPromos = await fetch('/api/superadmin/promos');
        if (resPromos.ok) {
          const data = await resPromos.json();
          if (!ignore) setPromos(data.promos || []);
        }

        const resAudit = await fetch('/api/superadmin/audit');
        if (resAudit.ok) {
          const data = await resAudit.json();
          if (!ignore) setAuditLogs(data.logs || []);
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message || 'Failed to load console data');
      }
    }
    startFetching();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setActionMsg(`User status updated to ${nextStatus}.`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create promo code');
      setActionMsg(`Promo code ${promoForm.code.toUpperCase()} successfully activated.`);
      setShowPromoModal(false);
      setPromoForm({ code: '', discountType: 'percent', discountValue: 20, maxUses: 100 });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #1e293b', paddingBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                SUPER ADMIN
              </span>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                STRUCT Master Control Portal
              </h1>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 0' }}>
              Platform management, organization multi-tenancy, billing, promo codes, and telemetry.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              href="/assess/admin"
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              Org Admin Console &rarr;
            </Link>
            <Link
              href="/"
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              Public Home &rarr;
            </Link>
          </div>
        </div>

        {/* Action / Error Alerts */}
        {actionMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {actionMsg}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1e293b', marginBottom: 24 }}>
          {[
            { id: 'metrics', label: 'Platform Metrics' },
            { id: 'users', label: 'User Directory' },
            { id: 'promos', label: 'Promo Codes' },
            { id: 'audit', label: 'Audit Trail' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Platform Metrics */}
        {activeTab === 'metrics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total Platform Users', value: stats?.totalUsers ?? '—', color: '#38bdf8' },
                { label: 'Exam Candidates', value: stats?.totalCandidates ?? '—', color: '#818cf8' },
                { label: 'Assessments Created', value: stats?.totalExams ?? '—', color: '#34d399' },
                { label: 'Total Attempts Completed', value: stats?.totalAttempts ?? '—', color: '#fbbf24' },
                { label: 'Registered Organizations', value: stats?.totalOrganizations ?? '—', color: '#c084fc' },
                { label: 'Active Subscriptions', value: stats?.activeSubscriptions ?? '—', color: '#f472b6' },
                { label: 'Gross Revenue (INR)', value: stats ? `₹${stats.totalRevenueInr.toLocaleString()}` : '—', color: '#10b981' },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: '#131d31',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: '20px 18px',
                  }}
                >
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#131d31', border: '1px solid #1e293b', borderRadius: 10, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>System Architecture & Security Posture</h3>
              <ul style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
                <li>Dual candidate identity isolation (Mode A Clerk verified accounts vs. Mode B test credentials).</li>
                <li>Cloudflare R2 private S3-compatible storage with time-limited signed download tokens.</li>
                <li>Transactional email with Resend API (Mode B fake email domains automatically suppressed).</li>
                <li>Dual database engine (PostgreSQL connection pool for production, local WAL SQLite for zero-config offline tests).</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && (
          <div style={{ background: '#131d31', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '14px 16px' }}>Name / Email</th>
                  <th style={{ padding: '14px 16px' }}>Role</th>
                  <th style={{ padding: '14px 16px' }}>Department</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: u.role === 'super_admin' ? '#f87171' : u.role === 'admin' ? '#60a5fa' : '#94a3b8',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{u.department || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        color: u.status === 'active' ? '#34d399' : '#f87171',
                        fontSize: 13,
                        fontWeight: 600,
                      }}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.email !== 'admin@struct.careers' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          style={{
                            background: u.status === 'active' ? '#ef4444' : '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Promo Codes */}
        {activeTab === 'promos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Active Platform Discount Codes</h2>
              <button
                onClick={() => setShowPromoModal(true)}
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Create Promo Code
              </button>
            </div>

            <div style={{ background: '#131d31', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 16px' }}>Code</th>
                    <th style={{ padding: '14px 16px' }}>Discount</th>
                    <th style={{ padding: '14px 16px' }}>Redemptions</th>
                    <th style={{ padding: '14px 16px' }}>Expires</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                        No promo codes created yet. Click &quot;+ Create Promo Code&quot; above.
                      </td>
                    </tr>
                  ) : (
                    promos.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#38bdf8' }}>{p.code}</td>
                        <td style={{ padding: '14px 16px', color: '#f1f5f9' }}>
                          {p.discount_type === 'percent' ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{p.current_uses} / {p.max_uses}</td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                          {p.expires_at ? new Date(Number(p.expires_at)).toLocaleDateString() : 'Never'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: p.is_active ? '#34d399' : '#f87171', fontWeight: 600 }}>
                            {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>System Security &amp; Audit Trail</h3>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
                  Immutable chronological log of administrative modifications, candidate generation, and exams.
                </p>
              </div>
              <button
                onClick={loadData}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Refresh Logs
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                    <th style={{ padding: '12px 16px' }}>Actor</th>
                    <th style={{ padding: '12px 16px' }}>Target</th>
                    <th style={{ padding: '12px 16px' }}>Details / Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(Number(log.created_at)).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: log.action.includes('delete') || log.action.includes('reset') || log.action.includes('suspend')
                              ? 'rgba(239, 68, 68, 0.15)'
                              : log.action.includes('create') || log.action.includes('publish')
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(56, 189, 248, 0.15)',
                            color: log.action.includes('delete') || log.action.includes('reset') || log.action.includes('suspend')
                              ? '#f87171'
                              : log.action.includes('create') || log.action.includes('publish')
                              ? '#34d399'
                              : '#38bdf8',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                          <div style={{ fontWeight: 600 }}>{log.user_name || log.user_email || 'System'}</div>
                          {log.user_email && log.user_name && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>{log.user_email}</div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{log.target_type}</div>
                          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{log.target_id || '—'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', maxWidth: 360, wordBreak: 'break-word', fontFamily: 'monospace', fontSize: 12 }}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Promo Modal */}
        {showPromoModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 28, width: 420 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Create New Promo Code</h3>
              <form onSubmit={handleCreatePromo}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Promo Code (e.g. LAUNCH50)</label>
                  <input
                    type="text"
                    required
                    value={promoForm.code}
                    onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Type</label>
                    <select
                      value={promoForm.discountType}
                      onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (₹ INR)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Value</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={promoForm.discountValue}
                      onChange={e => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Max Uses</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={promoForm.maxUses}
                    onChange={e => setPromoForm({ ...promoForm, maxUses: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowPromoModal(false)}
                    style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save & Activate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

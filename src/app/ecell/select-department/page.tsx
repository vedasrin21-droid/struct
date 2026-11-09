'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructLogo } from '@/components/StructLogo';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  order_index: number;
}

export default function SelectDepartmentPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/ecell/me');
        if (!meRes.ok) {
          if (meRes.status === 401) {
            router.push('/ecell/login');
            return;
          }
          throw new Error('Failed to load profile');
        }
        const meData = await meRes.json();

        if (meData.attempt) {
          if (meData.attempt.status === 'submitted') {
            router.push('/ecell/completed');
            return;
          } else if (meData.attempt.status === 'in_progress') {
            router.push(`/ecell/exam/${meData.attempt.id}`);
            return;
          }
        }

        if (meData.student.department) {
          setSelectedDept(meData.student.department);
        }

        const deptRes = await fetch('/api/ecell/departments');
        if (!deptRes.ok) throw new Error('Failed to fetch departments');
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      } catch (err: any) {
        setError(err.message || 'Error initializing department selection.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const handleContinue = async () => {
    if (!selectedDept || !confirmed) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/ecell/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: selectedDept }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save department selection');
      }

      router.push('/ecell/instructions');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm department.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ecell-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#0A1B38' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #DCE6F5',
              borderTopColor: '#0284C7',
              borderRadius: '50%',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading active departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ecell-page-wrapper">
      {/* Header */}
      <header className="ecell-navbar">
        <div className="ecell-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <StructLogo size={36} subtitle="Assessment Suite" />
            </Link>
            <span style={{ height: '18px', width: '1px', backgroundColor: '#E2E8F0' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284C7' }}>
              Step 1 of 3: Track Selection
            </span>
          </div>

          <Link href="/ecell/dashboard" className="ecell-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="ecell-container-wide">
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div className="ecell-tag-pill" style={{ marginBottom: '12px' }}>
              <span className="ecell-dot-indicator"></span>
              Department Track Selection
            </div>
            <h1 className="ecell-heading-hero">Choose your department.</h1>
            <p className="ecell-text-body">
              Select the department for which you are appearing in the ECELL recruitment examination.
            </p>
          </div>

          {error && <div className="ecell-banner-error">{error}</div>}

          {/* Department Cards Grid */}
          <div className="ecell-dept-grid">
            {departments.map((dept) => {
              const isSelected = selectedDept === dept.code;
              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.code)}
                  className={`ecell-dept-card ${isSelected ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 className="ecell-dept-name">{dept.name}</h3>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #0284C7' : '2px solid #CBD5E1',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <p className="ecell-dept-desc">{dept.description}</p>
                </div>
              );
            })}
          </div>

          {/* Important Notice */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '14px',
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #FDE68A',
              color: '#92400E',
              marginBottom: '26px',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>
              Important Selection Notice
            </div>
            <div style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
              Please select carefully. Once you begin the examination, your department selection cannot be changed.
              You are permitted to write only one department examination.
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '28px',
              cursor: 'pointer',
            }}
            onClick={() => setConfirmed(!confirmed)}
          >
            <input
              type="checkbox"
              id="confirmDept"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                marginTop: '3px',
                cursor: 'pointer',
                accentColor: '#12336B',
              }}
            />
            <label
              htmlFor="confirmDept"
              style={{
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#0A1B38',
                cursor: 'pointer',
                lineHeight: 1.45,
              }}
            >
              I confirm that I have selected my intended department and understand that this selection is final.
            </label>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href="/ecell/dashboard" className="ecell-btn-secondary">
              Cancel
            </Link>
            <button
              onClick={handleContinue}
              disabled={!selectedDept || !confirmed || submitting}
              className="ecell-btn-primary"
              style={{ width: 'auto', minWidth: '220px' }}
            >
              {submitting ? 'Confirming...' : 'Continue to Instructions \u2192'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="ecell-footer">
        STRUCT Assessment Suite &copy; 2026. All rights reserved. ECELL Official Recruitment Engine.
      </footer>
    </div>
  );
}

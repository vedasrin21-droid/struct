import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Administrative privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'results';
    const dept = searchParams.get('department')?.trim().toUpperCase();
    const db = getDb();

    if (type === 'results') {
      let querySql = `
        SELECT u.id as student_id, u.name, u.email, u.phone, u.college,
               a.id as attempt_id, a.department, a.status as attempt_status,
               a.score, a.max_score, a.pass_status,
               a.start_time, a.submitted_at
        FROM attempts a
        JOIN users u ON a.candidate_id = u.id
        WHERE a.exam_id = $1
      `;
      const params: any[] = [ECELL_EXAM_ID];

      if (dept && dept !== 'ALL') {
        params.push(dept);
        querySql += ` AND UPPER(a.department) = $2`;
      }

      querySql += ` ORDER BY a.department ASC, a.score DESC NULLS LAST, a.submitted_at DESC NULLS LAST`;

      const results = await db.query(querySql, params);

      const headers = [
        'Student ID',
        'Name',
        'Email',
        'Phone',
        'College',
        'Department',
        'Status',
        'Score (out of 20)',
        'Max Score',
        'Percentage',
        'Result',
        'Start Time',
        'Submitted Time',
      ];

      const rows = results.rows.map((r) => {
        const scoreVal = r.score !== null ? Number(r.score) : 0;
        const maxVal = r.max_score !== null ? Number(r.max_score) : 20;
        const pct = maxVal > 0 ? ((scoreVal / maxVal) * 100).toFixed(1) + '%' : '0%';

        return [
          escapeCsvCell(r.student_id),
          escapeCsvCell(r.name),
          escapeCsvCell(r.email),
          escapeCsvCell(r.phone || ''),
          escapeCsvCell(r.college),
          escapeCsvCell(r.department),
          escapeCsvCell(r.attempt_status),
          escapeCsvCell(r.score !== null ? r.score : ''),
          escapeCsvCell(maxVal),
          escapeCsvCell(pct),
          escapeCsvCell(r.pass_status || ''),
          escapeCsvCell(r.start_time ? new Date(Number(r.start_time)).toLocaleString('en-IN') : ''),
          escapeCsvCell(r.submitted_at ? new Date(Number(r.submitted_at)).toLocaleString('en-IN') : ''),
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ecell_results_${dept || 'all'}_${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'feedback') {
      const results = await db.query(
        `SELECT candidate_name, candidate_email, department, overall_rating,
                navigation_rating, question_quality_rating, difficulty_level,
                technical_issues, liked_aspects, improvement_suggestions,
                would_recommend, marketing_consent, custom_question_response, created_at
         FROM exam_feedback
         WHERE exam_id = $1
         ORDER BY created_at DESC`,
        [ECELL_EXAM_ID]
      );

      const headers = [
        'Candidate Name',
        'Candidate Email',
        'Department',
        'Overall Rating',
        'Navigation Rating',
        'Question Quality',
        'Difficulty',
        'Technical Issues',
        'Liked Aspects',
        'Improvement Suggestions',
        'Would Recommend',
        'Launch Notify Consent',
        'Custom Prompt Response',
        'Submission Timestamp',
      ];

      const rows = results.rows.map((r) => [
        escapeCsvCell(r.candidate_name),
        escapeCsvCell(r.candidate_email),
        escapeCsvCell(r.department),
        escapeCsvCell(r.overall_rating),
        escapeCsvCell(r.navigation_rating),
        escapeCsvCell(r.question_quality_rating),
        escapeCsvCell(r.difficulty_level),
        escapeCsvCell(r.technical_issues),
        escapeCsvCell(r.liked_aspects),
        escapeCsvCell(r.improvement_suggestions),
        escapeCsvCell(r.would_recommend),
        escapeCsvCell(r.marketing_consent ? 'Yes' : 'No'),
        escapeCsvCell(r.custom_question_response),
        escapeCsvCell(r.created_at ? new Date(r.created_at).toISOString() : ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ecell_feedback_${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'waitlist') {
      const results = await db.query(
        `SELECT id, email, name, college, source, created_at FROM waitlist_subscribers ORDER BY created_at DESC`
      );

      const headers = ['Subscriber ID', 'Email', 'Name', 'College', 'Source', 'Joined At'];
      const rows = results.rows.map((r) => [
        escapeCsvCell(r.id),
        escapeCsvCell(r.email),
        escapeCsvCell(r.name),
        escapeCsvCell(r.college),
        escapeCsvCell(r.source),
        escapeCsvCell(r.created_at ? new Date(Number(r.created_at)).toISOString() : ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="struct_waitlist_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type requested' }, { status: 400 });
  } catch (error: any) {
    console.error('[Admin ECELL Export Error]', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}

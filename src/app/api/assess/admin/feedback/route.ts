import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getDb();
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    const examId = url.searchParams.get('examId');

    let query = `
      SELECT 
        fb.id, fb.exam_id, e.title as exam_title,
        fb.candidate_email, fb.candidate_name,
        fb.overall_rating, fb.navigation_rating,
        fb.technical_issues, fb.liked_aspects,
        fb.improvement_suggestions, fb.would_recommend,
        fb.marketing_consent, fb.created_at
      FROM exam_feedback fb
      LEFT JOIN exams e ON e.id = fb.exam_id
    `;
    const params: any[] = [];

    if (examId) {
      params.push(examId);
      query += ` WHERE fb.exam_id = $1`;
    }

    query += ` ORDER BY fb.created_at DESC`;

    const result = await db.query<any>(query, params);
    const feedbackList = result.rows;

    if (format === 'csv') {
      const rows = [
        ['ID', 'Exam Title', 'Candidate Name', 'Candidate Email', 'Overall (1-5)', 'Navigation (1-5)', 'Technical Issues', 'Liked Aspects', 'Improvements', 'Would Recommend', 'Marketing Consent', 'Submitted At']
      ];

      for (const item of feedbackList) {
        rows.push([
          `"${item.id}"`,
          `"${(item.exam_title || item.exam_id || '').replace(/"/g, '""')}"`,
          `"${(item.candidate_name || '').replace(/"/g, '""')}"`,
          `"${(item.candidate_email || '').replace(/"/g, '""')}"`,
          String(item.overall_rating),
          String(item.navigation_rating),
          `"${(item.technical_issues || '').replace(/"/g, '""')}"`,
          `"${(item.liked_aspects || '').replace(/"/g, '""')}"`,
          `"${(item.improvement_suggestions || '').replace(/"/g, '""')}"`,
          `"${item.would_recommend}"`,
          item.marketing_consent ? 'Yes' : 'No',
          `"${new Date(item.created_at).toISOString()}"`
        ]);
      }

      const csvContent = rows.map(r => r.join(',')).join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="STRUCT_Exam_Feedback_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Unauthorized or server error' },
      { status: err.status || 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();

    const {
      examId,
      attemptId,
      overallRating,
      navigationRating,
      technicalIssues,
      likedAspects,
      improvementSuggestions,
      wouldRecommend,
      marketingConsent,
      email: fallbackEmail,
      name: fallbackName,
    } = body;

    const candidateEmail = user?.email || fallbackEmail?.trim();
    const candidateName = user?.name || fallbackName?.trim() || '';

    if (!examId || !overallRating || !navigationRating) {
      return NextResponse.json(
        { success: false, error: 'Missing required feedback ratings (overall rating and navigation rating are required).' },
        { status: 400 }
      );
    }

    if (!candidateEmail) {
      return NextResponse.json(
        { success: false, error: 'Candidate email could not be determined. Please provide your email address.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const feedbackId = `fb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await db.query(
      `INSERT INTO exam_feedback (
        id, exam_id, attempt_id, candidate_email, candidate_name,
        overall_rating, navigation_rating, technical_issues,
        liked_aspects, improvement_suggestions, would_recommend,
        marketing_consent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        feedbackId,
        examId,
        attemptId || null,
        candidateEmail.toLowerCase(),
        candidateName,
        Number(overallRating),
        Number(navigationRating),
        technicalIssues || 'none',
        likedAspects || '',
        improvementSuggestions || '',
        wouldRecommend || 'yes',
        Boolean(marketingConsent),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your examination feedback has been recorded successfully.',
      feedbackId,
    });
  } catch (err: any) {
    console.error('Error saving exam feedback:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}

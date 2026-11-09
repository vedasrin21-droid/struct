import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';
import crypto from 'node:crypto';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();

    const db = getDb();
    const now = Date.now();

    const candidateEmail = user?.email || body.candidateEmail || 'student@ecell.in';
    const candidateName = user?.name || body.candidateName || 'Candidate';
    const attemptId = body.attemptId || '';
    const department = body.department || user?.department || '';

    const overallRating = Math.max(1, Math.min(5, Number(body.overallRating || 5)));
    const navigationRating = Math.max(1, Math.min(5, Number(body.navigationRating || 5)));
    const questionQualityRating = Math.max(1, Math.min(5, Number(body.questionQualityRating || 5)));
    const difficultyLevel = body.difficultyLevel || 'moderate';
    const technicalIssues = (body.technicalIssues || 'None').slice(0, 100);
    const likedAspects = body.likedAspects || '';
    const improvementSuggestions = body.improvementSuggestions || '';
    const wouldRecommend = body.wouldRecommend || 'Yes';
    const marketingConsent = Boolean(body.marketingConsent);
    const customPrompt = body.customQuestionPrompt || '';
    const customResponse = body.customQuestionResponse || '';

    const feedbackId = 'fb_' + crypto.randomUUID();

    // 1. Save feedback record
    await db.execute(
      `INSERT INTO exam_feedback (
        id, exam_id, attempt_id, candidate_email, candidate_name,
        overall_rating, navigation_rating, technical_issues, liked_aspects,
        improvement_suggestions, would_recommend, marketing_consent,
        custom_question_prompt, custom_question_response,
        question_quality_rating, difficulty_level, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        feedbackId,
        ECELL_EXAM_ID,
        attemptId,
        candidateEmail,
        candidateName,
        overallRating,
        navigationRating,
        technicalIssues,
        likedAspects,
        improvementSuggestions,
        wouldRecommend,
        marketingConsent,
        customPrompt,
        customResponse,
        questionQualityRating,
        difficultyLevel,
        department,
      ]
    );

    // 2. If student opted in for launch notifications / early career access, add to waitlist
    if (marketingConsent && candidateEmail) {
      try {
        await db.execute(
          `INSERT INTO waitlist_subscribers (
            id, email, name, college, source, created_at
          ) VALUES ($1, $2, $3, $4, 'ecell_feedback', $5)
          ON CONFLICT (LOWER(email)) DO NOTHING`,
          [
            'wtl_' + crypto.randomUUID(),
            candidateEmail.trim().toLowerCase(),
            candidateName,
            user?.college || '',
            now,
          ]
        );
      } catch (waitlistErr) {
        console.warn('[ECELL Feedback] Waitlist insert non-fatal warning:', waitlistErr);
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl: '/launching-soon',
      message: 'Feedback submitted successfully. Thank you for participating.',
    });
  } catch (error: any) {
    console.error('[ECELL Feedback Save Error]', error);
    // Never crash or disrupt candidate flow - return success to ensure smooth navigation to launch page
    return NextResponse.json({
      success: true,
      redirectUrl: '/launching-soon',
      warning: 'Feedback received with non-blocking audit note.',
    });
  }
}

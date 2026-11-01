import { NextRequest, NextResponse } from 'next/server';
import { analyzeResumeDeterministically } from '@/lib/scoring';
import { enhanceWithAiIfAvailable } from '@/lib/ai';
import { ExperienceLevel } from '@/types';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { resolveEntitlementIdentity } from '@/lib/payments/guestAuth';
import {
  reserveEntitlement,
  settleEntitlementReservation,
  releaseEntitlementReservation,
  heartbeatReservation,
  isReservationActive,
  getEntitlementBalance,
  HEARTBEAT_INTERVAL_MS,
  markOperationActive,
  markOperationComplete,
  isOperationActive,
} from '@/lib/payments/service';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let resumeText = '';
    let fileName = 'resume-text';
    let targetJobTitle = '';
    let targetJobDescription = '';
    let experienceLevel: ExperienceLevel = 'mid';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('resumeFile') as File | null;
      const textInput = (formData.get('resumeText') as string) || '';
      targetJobTitle = ((formData.get('targetJobTitle') as string) || '').trim();
      targetJobDescription = ((formData.get('targetJobDescription') as string) || '').trim();
      experienceLevel = ((formData.get('experienceLevel') as string) || 'mid') as ExperienceLevel;

      if (file && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: 'File size exceeds the 5 MB limit. Please upload a smaller document.' },
            { status: 400 }
          );
        }

        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.pdf')) {
          try {
            const parser = new PDFParse({ data: buffer });
            const parsed = await parser.getText();
            resumeText = parsed.text || '';
            await parser.destroy();
          } catch (pdfErr) {
            console.error('PDF parsing error:', pdfErr);
            return NextResponse.json(
              { error: 'Could not extract text from this PDF. It may be password-protected or contain only scanned images.' },
              { status: 422 }
            );
          }
        } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          try {
            const result = await mammoth.extractRawText({ buffer });
            resumeText = result.value || '';
          } catch (docxErr) {
            console.error('DOCX parsing error:', docxErr);
            return NextResponse.json(
              { error: 'Could not read DOCX file. Please make sure the file is not corrupted.' },
              { status: 422 }
            );
          }
        } else if (lowerName.endsWith('.txt')) {
          resumeText = buffer.toString('utf-8');
        } else {
          return NextResponse.json(
            { error: 'Unsupported file format. Please upload a PDF (.pdf), Word document (.docx), or plain text (.txt).' },
            { status: 400 }
          );
        }
      } else if (textInput.trim().length > 0) {
        resumeText = textInput.trim();
        fileName = 'pasted-resume.txt';
      } else {
        return NextResponse.json(
          { error: 'Please upload a resume file (PDF/DOCX) or paste your resume text.' },
          { status: 400 }
        );
      }
    } else {
      // JSON body support
      const body = await req.json();
      resumeText = body.resumeText || '';
      fileName = body.fileName || 'pasted-resume.txt';
      targetJobTitle = (body.targetJobTitle || '').trim();
      targetJobDescription = (body.targetJobDescription || '').trim();
      experienceLevel = (body.experienceLevel || 'mid') as ExperienceLevel;
    }

    // Validate extracted text
    const words = resumeText.trim().split(/\s+/).filter(Boolean);
    if (words.length < 30) {
      const isScannedOrEmpty = words.length === 0;
      return NextResponse.json(
        {
          error: isScannedOrEmpty
            ? 'No readable text could be extracted from this document. It appears to be an image-only or scanned PDF without an embedded text layer. Please upload a PDF with selectable text, a DOCX file, or paste your resume text directly.'
            : `Extracted resume text is too brief (${words.length} words detected). Please provide a complete resume document containing your work history, skills, and education.`,
        },
        { status: 422 }
      );
    }

    // 1. Deterministic Scoring & Matching (Always free for all visitors)
    const deterministicResult = analyzeResumeDeterministically(
      resumeText,
      targetJobTitle,
      targetJobDescription,
      experienceLevel,
      fileName
    );

    // 2. Entitlement Gating for AI Enhancement: Atomically reserve 1 credit before expensive AI invocation
    const identity = await resolveEntitlementIdentity(req);
    let reservationSuccess = false;

    const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key') || '';
    const operationRefId = idempotencyKey ? `idem_${idempotencyKey.slice(0, 64)}` : deterministicResult.id;

    // Cross-instance concurrency guard: reject duplicate parallel calls for the exact same in-flight operation
    if (isOperationActive(operationRefId) || (await isReservationActive(operationRefId))) {
      return NextResponse.json(
        {
          error: 'REQUEST_IN_FLIGHT',
          message: 'An analysis is currently processing for this request. Please wait for it to complete.',
        },
        { status: 409 }
      );
    }

    if (identity) {
      const reserveRes = await reserveEntitlement({
        email: identity.email,
        featureType: 'resume_ai_usage',
        referenceId: operationRefId,
      });
      reservationSuccess = reserveRes.success;
    }

    // If caller has no active credits / reservation failed, return full deterministic report with upgrade offer
    if (!reservationSuccess) {
      return NextResponse.json({
        ...deterministicResult,
        entitlement: {
          hasAccess: false,
          consumed: false,
          remainingUsages: 0,
          upgradeOffer: {
            productId: 'resume_ai_pack_49',
            name: 'Resume AI Enhancement (2 Usages)',
            priceRupees: 49,
            amountPaise: 4900,
          },
        },
      }, { status: 200 });
    }

    // 3. Credit is atomically reserved. Mark active in-flight and attempt AI Enhancement Layer
    markOperationActive(operationRefId, identity!.email);

    // Heartbeat timer maintains durable database lease during long-running AI requests
    const heartbeatTimer = setInterval(async () => {
      try {
        await heartbeatReservation({ referenceId: operationRefId });
      } catch (hbErr) {
        console.warn('[Talvyn API] Heartbeat warning:', hbErr);
      }
    }, HEARTBEAT_INTERVAL_MS);

    let finalResult;
    try {
      finalResult = await enhanceWithAiIfAvailable({
        resumeText,
        targetJobTitle,
        targetJobDescription,
        deterministicResult,
      });
    } catch (aiErr) {
      console.error('[Talvyn API] Unexpected AI error during generation:', aiErr);
      // Release reservation on uncaught error
      const releaseRes = await releaseEntitlementReservation({
        email: identity!.email,
        featureType: 'resume_ai_usage',
        referenceId: operationRefId,
      });

      return NextResponse.json({
        ...deterministicResult,
        entitlement: {
          hasAccess: true,
          consumed: false,
          remainingUsages: releaseRes.remainingBalance,
          notice: 'AI provider error. Your usage credit was not consumed.',
          email: identity!.email,
        },
      }, { status: 200 });
    } finally {
      clearInterval(heartbeatTimer);
      markOperationComplete(operationRefId);
    }

    // 4. Settle reservation if AI enhancement succeeded
    if (finalResult && finalResult.isAiEnhanced) {
      try {
        const settleRes = await settleEntitlementReservation({
          email: identity!.email,
          featureType: 'resume_ai_usage',
          referenceId: operationRefId,
        });

        return NextResponse.json({
          ...finalResult,
          entitlement: {
            hasAccess: true,
            consumed: true,
            remainingUsages: settleRes.remainingBalance,
            email: identity!.email,
          },
        }, { status: 200 });
      } catch (settleErr: any) {
        console.warn('[Talvyn API] Settlement failed because reservation was released:', settleErr?.message);
        // CRITICAL INVARIANT: A successful AI operation must NEVER return a paid result after credit was released/recovered!
        const currentBal = await getEntitlementBalance(identity!.email, 'resume_ai_usage');
        return NextResponse.json({
          ...deterministicResult,
          entitlement: {
            hasAccess: false,
            consumed: false,
            remainingUsages: currentBal.remainingBalance,
            notice: 'Your analysis session reservation expired and was refunded to your balance. Your credit was not consumed. Please retry.',
            email: identity!.email,
          },
        }, { status: 200 });
      }
    }

    // 5. If AI failed, timed out, or fell back to deterministic, release reserved credit back to user
    const releaseRes = await releaseEntitlementReservation({
      email: identity!.email,
      featureType: 'resume_ai_usage',
      referenceId: operationRefId,
    });

    return NextResponse.json({
      ...deterministicResult,
      entitlement: {
        hasAccess: true,
        consumed: false,
        remainingUsages: releaseRes.remainingBalance,
        notice: 'AI provider temporarily unavailable. Your usage credit was not consumed.',
        email: identity!.email,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Talvyn API] Unexpected analysis error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the resume. Please try again.' },
      { status: 500 }
    );
  }
}


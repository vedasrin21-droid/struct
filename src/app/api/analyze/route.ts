import { NextRequest, NextResponse } from 'next/server';
import { analyzeResumeDeterministically } from '@/lib/scoring';
import { enhanceWithAiIfAvailable } from '@/lib/ai';
import { ExperienceLevel } from '@/types';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

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

    // 1. Deterministic Scoring & Matching
    const deterministicResult = analyzeResumeDeterministically(
      resumeText,
      targetJobTitle,
      targetJobDescription,
      experienceLevel,
      fileName
    );

    // 2. AI Enhancement Layer (falls back cleanly if no key or API error)
    const finalResult = await enhanceWithAiIfAvailable({
      resumeText,
      targetJobTitle,
      targetJobDescription,
      deterministicResult,
    });

    // Zero persistence: Nothing is saved to disk or database
    return NextResponse.json(finalResult, { status: 200 });
  } catch (error: unknown) {
    console.error('[Talvyn API] Unexpected analysis error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the resume. Please try again.' },
      { status: 500 }
    );
  }
}

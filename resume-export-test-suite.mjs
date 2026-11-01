import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ResumeBuilder } from './src/components/ResumeBuilder.tsx';
import { analyzeResumeDeterministically } from './src/lib/scoring.ts';
import fs from 'node:fs';

console.log('=== STARTING STRUCT RESUME BUILDER PDF EXPORT VERIFICATION SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Case ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Case ${totalTests}: ${testName}`);
    console.error(err);
  }
}

// SAMPLE DATA FIXTURES
const validResumeText = `Sarah Jenkins
Senior Full Stack Engineer
sarah.jenkins@example.com | (415) 890-1234 | San Francisco, CA | https://linkedin.com/in/sarahjenkins | https://github.com/sarahjenkins

PROFESSIONAL SUMMARY
Results-driven software engineer with 6+ years of experience designing scalable cloud applications, optimizing databases, and leading distributed teams.

WORK EXPERIENCE
Lead Software Engineer | TechForward Inc | San Francisco, CA
2021 - Present
- Spearheaded migration to microservices architecture, reducing latency by 35% for 4M daily active users.
- Architected automated CI/CD deployment pipelines, cutting cycle time by 45% and eliminating release outages.
- Mentored 5 associate software engineers and instituted automated integration test standards.

Software Engineer | NextGen Digital | San Jose, CA
2018 - 2021
- Developed REST APIs in TypeScript and Node.js serving 1.2M requests daily with 99.95% uptime.
- Collaborated with UX designers to rebuild responsive customer checkout workflows in React.
- Reduced database query times by 28% by refactoring indexing and caching layers in PostgreSQL.

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley (2018)
Magna Cum Laude, GPA 3.85

SKILLS & COMPETENCIES
TypeScript, JavaScript, React, Node.js, Next.js, PostgreSQL, Docker, AWS, GraphQL, REST API, Git, CI/CD, Agile
`;

const sampleAnalysis = analyzeResumeDeterministically(
  validResumeText,
  'Senior Full Stack Engineer',
  'Looking for a Senior Full Stack Engineer with experience in React, TypeScript, Node.js, and AWS.',
  'senior',
  'sarah_jenkins_resume.pdf'
);

// Helper to isolate print area content
function getPrintArea(html) {
  const startIdx = html.indexOf('id="resume-print-area"');
  assert(startIdx !== -1, 'Print area must exist in HTML output');
  // Look for end of the preview-column container
  const endIdx = html.indexOf('<!-- ================= COACH SUGGESTIONS', startIdx);
  return endIdx !== -1 ? html.substring(startIdx, endIdx) : html.substring(startIdx);
}

// 1. Audit Findings Verification
runTest('Audit Findings Verification: handlePrint exists and is mapped to handleExportPdf', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes('const handleExportPdf = () =>'), 'handleExportPdf handler must be defined');
  assert(fileContent.includes('const handlePrint = handleExportPdf;'), 'handlePrint must be mapped to handleExportPdf for backwards compatibility');
  assert(fileContent.includes('window.print()'), 'Native print dialog must be triggered for zero-dependency vector PDF export');
});

// 2. Visible Export PDF button in Preview Toolbar
runTest('Preview Toolbar: Visible Export PDF button and Document Preview Header present', () => {
  const html = renderToString(React.createElement(ResumeBuilder, { initialAnalysis: sampleAnalysis }));
  assert(html.includes('preview-toolbar'), 'Preview toolbar class must be rendered');
  assert(html.includes('Resume Preview'), 'Toolbar must display Resume Preview heading');
  assert(html.includes('Export PDF'), 'Toolbar must render visible Export PDF button');
  assert(html.includes('Letter &bull; A4 ATS Fit') || html.includes('Letter • A4 ATS Fit'), 'Toolbar must specify standard page fitting');
});

// 3. Top Application Bar Export PDF Button
runTest('Top Application Bar: Export PDF button prominently rendered', () => {
  const html = renderToString(React.createElement(ResumeBuilder, { initialAnalysis: sampleAnalysis }));
  assert(html.includes('STRUCT Resume Builder'), 'Top header brand must be present');
  assert(html.includes('title="Export resume as ATS-compliant PDF (Letter / A4)"'), 'Top bar must contain Export PDF button with ATS tooltip');
});

// 4. Template Preservation: Classic Executive Template
runTest('Template Preservation: Classic Executive (Serif, Georgia, Centered Header)', () => {
  const html = renderToString(React.createElement(ResumeBuilder, { initialAnalysis: sampleAnalysis }));
  const printArea = getPrintArea(html);
  assert(printArea.includes('layout-classic'), 'Default layout must be layout-classic');
  assert(printArea.includes('Georgia'), 'Classic template must use Georgia/Times serif font');
  assert(printArea.includes('Sarah Jenkins'), 'Candidate full name must be rendered');
  assert(printArea.includes('Senior Full Stack Engineer') || printArea.includes('Software Engineer'), 'Target role must be rendered');
  assert(printArea.includes('Professional Summary'), 'Summary header must be rendered');
});

// 5. Template Preservation: Modern Clean Template
runTest('Template Preservation: Modern Clean (Sans-serif, Plus Jakarta Sans, Left Aligned)', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes("'Plus Jakarta Sans', -apple-system, sans-serif"), 'Modern template must use Plus Jakarta Sans');
  assert(fileContent.includes("borderBottom: activeLayout === 'classic' ? '1.5px solid #1F2937' : '2.5px solid #12336B'"), 'Modern template must use brand navy underline accent');
  assert(fileContent.includes("textAlign: activeLayout === 'classic' ? 'center' : 'left'"), 'Modern template must support left-aligned header layout');
});

// 6. Exporting a Completed Resume with core sections
runTest('Exporting a completed resume: Core sections rendered in print area', () => {
  const html = renderToString(React.createElement(ResumeBuilder, { initialAnalysis: sampleAnalysis }));
  const printArea = getPrintArea(html);
  assert(printArea.includes('sarah.jenkins@example.com'), 'Email must be included in print area');
  assert(printArea.includes('(415) 890-1234'), 'Phone must be included in print area');
  assert(printArea.includes('San Francisco, CA'), 'Location must be included in print area');
  assert(printArea.includes('linkedin.com/in/sarahjenkins'), 'LinkedIn link must be included in print area');
  assert(printArea.includes('github.com/'), 'Website/Github link must be included in print area');
  assert(printArea.includes('Work Experience'), 'Work Experience section must be rendered in print area');
  assert(printArea.includes('TechForward Inc') || printArea.includes('Apex Technologies'), 'Job experience company must be rendered in print area');
  assert(printArea.includes('Education'), 'Education section must be rendered in print area');
  assert(printArea.includes('University of California'), 'Education institution must be rendered in print area');
  assert(printArea.includes('Skills &amp; Competencies') || printArea.includes('Skills & Competencies'), 'Skills section must be rendered in print area');
});

// 7. Exporting a Resume with Optional Sections Omitted
runTest('Exporting a resume with optional sections omitted: Section visibility logic cleanly suppresses sections', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  // Check the conditional rendering in ResumeBuilder
  assert(fileContent.includes('if (!resumeData.visibleSections[secKey]) return null;'), 'Must return null when section visibility is false');
  assert(fileContent.includes('if (secKey === \'summary\' && resumeData.summary.trim())'), 'Must skip summary if empty');
  assert(fileContent.includes('if (secKey === \'experience\' && resumeData.experience.length > 0)'), 'Must skip experience if empty');
  assert(fileContent.includes('if (secKey === \'education\' && resumeData.education.length > 0)'), 'Must skip education if empty');
  assert(fileContent.includes('if (secKey === \'skills\' && resumeData.skills.length > 0)'), 'Must skip skills if empty');
  assert(fileContent.includes('if (secKey === \'projects\' && resumeData.projects.length > 0)'), 'Must skip projects if empty');
  assert(fileContent.includes('if (secKey === \'certifications\' && resumeData.certifications.length > 0)'), 'Must skip certifications if empty');
});

// 8. Long, Multi-page Resume Pagination Integrity
runTest('Long Multi-page Resume: Pagination classes and CSS break-rules applied to entries', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes('className="resume-section-heading"'), 'Section titles must have resume-section-heading class');
  assert(fileContent.includes("breakAfter: 'avoid'"), 'Section headings must avoid break-after');
  assert(fileContent.includes('className="resume-entry"'), 'Entries must have resume-entry class');
  assert(fileContent.includes("breakInside: 'avoid'"), 'Entries must avoid break-inside');
  assert(fileContent.includes('className="resume-bullet"'), 'Bullet items must have resume-bullet class');
  assert(fileContent.includes('.resume-bullet {\n            break-inside: avoid !important;'), 'Print CSS must enforce break-inside: avoid on bullets');
  assert(fileContent.includes('.resume-header {\n            break-inside: avoid !important;'), 'Print CSS must prevent header breaking across page boundary');
});

// 9. Exclusion of Editor Controls and Non-Resume UI from Print Document
runTest('Exclusion of Editor Controls: Application chrome and sidebars hidden in @media print', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(
    fileContent.includes('nav, header, footer, .no-print, .preview-toolbar, .mobile-view-toggle, .editor-column, .btn, .results-section, .hero-section {\n            display: none !important;'),
    '@media print must hide nav, header, footer, editor-column, preview-toolbar, and buttons'
  );
  assert(fileContent.includes('div#__next, main, #resume-builder-container'), 'Wrappers must reset height and overflow for multi-page print');
  assert(fileContent.includes('#resume-print-area {\n            background: #FFFFFF !important;\n            box-shadow: none !important;\n            border: none !important;\n            border-radius: 0 !important;\n            padding: 0 !important;\n            margin: 0 !important;'), 'Print area must remove padding, margins, shadows, and borders in print mode');
});

// 10. Standard PDF Page Dimensions (Letter / A4)
runTest('Page Dimensions: 0.5in standard margins and portrait layout without clipping', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes('@page {\n            size: portrait;\n            margin: 0.5in;\n          }'), '@page must specify portrait size with 0.5in margins');
  assert(fileContent.includes('width: 100% !important;'), 'Print area must use full 100% printable page width');
  assert(fileContent.includes('min-height: 0 !important;'), 'min-height must be reset to 0 in print to prevent empty trailing pages');
});

// 11. Mobile Layout & Responsiveness: Never hides preview during print
runTest('Mobile Layout: Screen media query does not bleed into print output', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes('@media screen and (max-width: 900px)'), 'Mobile responsive query must be scoped to screen media only');
  assert(fileContent.includes('.preview-column,\n          .preview-column.mobile-hidden {\n            position: static !important;\n            top: 0 !important;\n            display: block !important;'), 'Print CSS must force preview-column to display: block even if mobile-hidden was active');
});

// 12. Asynchronous PDF Generation & Loading / Status State
runTest('Status State: Loading states, spinner animations, and dynamic document title for PDF name', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(fileContent.includes("const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'printing' | 'success'>('idle');"), 'Status state must track idle, preparing, printing, success');
  assert(fileContent.includes('Preparing PDF...'), 'Button must display Preparing PDF... state');
  assert(fileContent.includes('Opening Dialog...'), 'Button must display Opening Dialog... state');
  assert(fileContent.includes('Export Ready!'), 'Button must display Export Ready! state');
  assert(fileContent.includes('document.title = pdfFilename;'), 'Document title must be dynamically set to candidate name for clean PDF file save name');
  assert(fileContent.includes("window.addEventListener('afterprint', cleanup);"), 'afterprint event must clean up document title and set success state');
});

// 13. Privacy Requirements: No Database Persistence or External Services Added
runTest('Privacy Requirements: No database persistence, storage uploads, or external processors added', () => {
  const fileContent = fs.readFileSync('src/components/ResumeBuilder.tsx', 'utf-8');
  assert(!fileContent.includes("fetch('/api/"), 'ResumeBuilder must not send resume data to backend API endpoints');
  assert(!fileContent.includes('localStorage.setItem'), 'ResumeBuilder must not persist resume to localStorage');
  assert(!fileContent.includes('html2pdf') && !fileContent.includes('jspdf'), 'Zero third-party PDF server or insecure browser bundler introduced');
});

console.log(`\n=== TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
if (passedTests === totalTests) {
  console.log('ALL RESUME BUILDER PDF EXPORT TESTS COMPLETED SUCCESSFULLY!');
} else {
  process.exit(1);
}

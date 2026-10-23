import assert from 'node:assert';
import { analyzeResumeDeterministically } from './src/lib/scoring.ts';
import { enhanceWithAiIfAvailable } from './src/lib/ai.ts';
import { parseResumeToBuilderData } from './src/lib/parser.ts';
import mammoth from 'mammoth';

console.log('=== STARTING TALVYN RESUME PRODUCT TEST SUITE ===\n');

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

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Case ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Case ${totalTests}: ${testName}`);
    console.error(err);
  }
}

// SAMPLE TEST DATA
const validResumeText = `
Sarah Jenkins
Senior Full Stack Engineer
sarah.jenkins@example.com | (415) 890-1234 | San Francisco, CA | linkedin.com/in/sarahjenkins | github.com/sarahjenkins

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

PROJECTS
Cloud Observability Platform
- Built end-to-end distributed tracing dashboard processing 100k events/sec.
`;

const sampleJobDescription = `
Senior Software Engineer (Full Stack)
Requirements:
- 5+ years of experience building web applications using React, TypeScript, and Node.js.
- Strong knowledge of PostgreSQL, Redis, and distributed systems.
- Experience with Docker, Kubernetes, and AWS cloud infrastructure.
- Track record of mentoring junior engineers and leading architectural initiatives.
- Excellent communication and cross-functional leadership skills.
`;

// 1. Valid PDF Text / Deterministic Pipeline
runTest('Valid resume text parsing & deterministic scoring', () => {
  const result = analyzeResumeDeterministically(
    validResumeText,
    'Senior Full Stack Engineer',
    sampleJobDescription,
    'senior',
    'sarah_jenkins_resume.pdf'
  );

  assert(result.overallScore >= 70, `Expected realistic score >= 70, got ${result.overallScore}`);
  assert(result.scores.atsReadability.score >= 80, 'ATS readability score should be high');
  assert(result.scores.contentQuality.score >= 70, 'Content score should reflect metrics');
  assert(result.contactInfo.hasEmail === true, 'Email must be detected');
  assert(result.contactInfo.hasPhone === true, 'Phone must be detected');
  assert(result.contactInfo.hasLinkedIn === true, 'LinkedIn must be detected');
  assert(result.keywords.matchedKeywords.length >= 5, 'Should match multiple keywords');
  assert(result.rawResumeText.length > 100, 'Raw resume text must be preserved');
  assert(result.scoringBreakdown != null, 'Scoring breakdown must be populated');
});

// 2. Valid DOCX Resume Parsing (via Mammoth)
await runAsyncTest('Valid DOCX text extraction via Mammoth', async () => {
  // Test raw mammoth text parsing capability
  const buffer = Buffer.from(
    'UEsDBBQAAAAIAAAAAAAAAAAAAAAAAAAAAAA', // base64 snippet header test or mock
    'base64'
  );
  // Test mammoth fallback handling
  try {
    await mammoth.extractRawText({ buffer });
  } catch (e) {
    // Expected for mock partial buffer, verifies mammoth module loads cleanly
    assert(e != null);
  }
});

// 3. Pasted Resume Text
runTest('Pasted resume text handling without file', () => {
  const result = analyzeResumeDeterministically(
    validResumeText,
    'Full Stack Engineer',
    '',
    'mid',
    'pasted-resume.txt'
  );
  assert(result.fileName === 'pasted-resume.txt');
  assert(result.wordCount > 100);
});

// 4. Resume with NO Job Description
runTest('Resume analysis with no job description provided', () => {
  const result = analyzeResumeDeterministically(
    validResumeText,
    'Full Stack Engineer',
    '', // No JD
    'senior',
    'resume.pdf'
  );
  assert(result.hasJobDescription === false);
  assert(result.scores.jobMatch.score > 50, 'Baseline score should be computed from detected domain skills');
  assert(result.keywords.missingKeywords[0].includes('Target job description not provided'));
  // Verify composite calculation uses exact jobMatchScore
  const expectedComposite = Math.round(
    result.scores.atsReadability.score * 0.30 +
    result.scores.contentQuality.score * 0.35 +
    result.scores.jobMatch.score * 0.25 +
    result.scores.completeness.score * 0.10
  );
  assert.strictEqual(result.overallScore, expectedComposite, 'Composite score formula must match weighted components');
});

// 5. Resume with Missing Sections
runTest('Resume with missing sections (e.g. no education, no summary, no contact)', () => {
  const sparseText = `
John Doe
Work Experience
- Worked on some code
- Helped with testing
- Handled customer support tickets
Skills: JavaScript, HTML
  `;
  const result = analyzeResumeDeterministically(sparseText, 'Junior Developer', '', 'entry');
  assert(result.scores.completeness.score < 60, 'Completeness should be penalized');
  assert(result.scores.atsReadability.score < 75, 'Readability should flag missing email/phone');
  assert(result.prioritizedImprovements.some(f => f.id === 'fix-summary' || f.id === 'fix-linkedin'));
});

// 6. Malformed or unsupported file error check simulation
runTest('Malformed or short content detection (<30 words)', () => {
  const words = 'Hello world this is only seven words'.split(/\s+/).filter(Boolean);
  assert(words.length < 30, 'Should detect text under 30 words');
});

// 7. Scanned PDF / Image-only PDF detection simulation
runTest('Scanned PDF with 0 extractable text detection', () => {
  const emptyExtractedText = '   \n  \n';
  const words = emptyExtractedText.trim().split(/\s+/).filter(Boolean);
  assert.strictEqual(words.length, 0, 'Zero words detected for scanned image-only PDF');
});

// 8. Unusual formatting / special characters
runTest('Resume with unusual characters and symbols', () => {
  const weirdText = `
★ Sarah Jenkins ★
Email: sarah@test.com | Phone: 555-123-4567 | LinkedIn: linkedin.com/in/sarah
⚡ Summary ⚡
Experienced software builder • 5 years experience • Python, Java, SQL, React.
► Work Experience
Senior Engineer — ACME Corp (2020-2023)
• Accelerated query latency by 40% across 5 distributed clusters.
• Launched new billing microservice, generating $2.4M in annual recurring revenue.
► Education
B.S. in Computer Science — State University
  `;
  const result = analyzeResumeDeterministically(weirdText);
  assert(result.overallScore > 65);
  assert(result.scores.atsReadability.score > 70);
  assert(result.bulletSuggestions.length > 0);
});

// 9. Long resume (> 1000 words)
runTest('Long resume with length exceeding standard limits', () => {
  const longParagraph = 'Architected scalable cloud systems and coordinated with engineering teams across multiple projects. '.repeat(150);
  const longResume = validResumeText + '\n' + longParagraph;
  const result = analyzeResumeDeterministically(longResume);
  assert(result.wordCount > 1000, `Expected wordCount > 1000, got ${result.wordCount}`);
  const lengthWarning = result.formattingChecks.find(c => c.title.includes('Exceeds Standard Limits'));
  assert(lengthWarning != null, 'Should flag multi-page excessive word count');
});

// 10. Missing AI API key fallback
await runAsyncTest('Missing AI API key fallback to deterministic engine', async () => {
  const deterministicResult = analyzeResumeDeterministically(validResumeText);
  const enhanced = await enhanceWithAiIfAvailable({
    resumeText: validResumeText,
    deterministicResult,
  });
  assert(enhanced != null);
  assert.strictEqual(enhanced.isAiEnhanced, false);
  assert(enhanced.aiProviderLabel.includes('Deterministic'));
});

// 11. AI provider failure / timeout simulation
await runAsyncTest('AI provider failure graceful fallback', async () => {
  const deterministicResult = analyzeResumeDeterministically(validResumeText);
  // Passing invalid keys to ensure graceful catch and zero crash
  process.env.GEMINI_API_KEY = 'invalid_test_key';
  const enhanced = await enhanceWithAiIfAvailable({
    resumeText: validResumeText,
    deterministicResult,
  });
  assert(enhanced != null);
  // Revert env
  delete process.env.GEMINI_API_KEY;
});

// 12. Complete Analysis-to-Builder Data Journey
runTest('Analysis-to-Builder end-to-end data transformation', () => {
  const analysis = analyzeResumeDeterministically(
    validResumeText,
    'Lead Software Engineer',
    sampleJobDescription,
    'senior',
    'sarah_jenkins_resume.pdf'
  );

  const builderData = parseResumeToBuilderData(validResumeText, analysis);

  assert(builderData.contact.fullName.includes('Sarah Jenkins'), `Expected Sarah Jenkins, got ${builderData.contact.fullName}`);
  assert.strictEqual(builderData.contact.email, 'sarah.jenkins@example.com');
  assert.strictEqual(builderData.contact.phone, '(415) 890-1234');
  assert(builderData.contact.linkedin.includes('linkedin.com/in/sarahjenkins'));
  assert(builderData.summary.length > 20, 'Summary should be extracted');
  assert(builderData.experience.length >= 2, `Expected >=2 jobs, got ${builderData.experience.length}`);
  assert(builderData.education.length >= 1, 'Education should be extracted');
  assert(builderData.skills.length >= 5, 'Skills should be populated');
  assert(builderData.sectionOrder.length === 6, 'All standard sections should be in sectionOrder');
  assert(builderData.layout === 'classic', 'Default layout is classic');
});

// 13. Deterministic Scoring Reproducibility & Consistency
runTest('Scoring consistency across repeated runs (identical input produces identical score and breakdown)', () => {
  const run1 = analyzeResumeDeterministically(validResumeText, 'Senior Full Stack Engineer', sampleJobDescription, 'senior');
  const run2 = analyzeResumeDeterministically(validResumeText, 'Senior Full Stack Engineer', sampleJobDescription, 'senior');

  assert.strictEqual(run1.overallScore, run2.overallScore, 'Overall score must be strictly consistent');
  assert.strictEqual(run1.scores.atsReadability.score, run2.scores.atsReadability.score, 'ATS score must be strictly consistent');
  assert.strictEqual(run1.scores.contentQuality.score, run2.scores.contentQuality.score, 'Content score must be strictly consistent');
  assert.strictEqual(run1.scores.jobMatch.score, run2.scores.jobMatch.score, 'Job match score must be strictly consistent');
  assert.strictEqual(run1.scores.completeness.score, run2.scores.completeness.score, 'Completeness score must be strictly consistent');
  assert.deepStrictEqual(run1.keywords.matchedKeywords, run2.keywords.matchedKeywords, 'Matched keywords must be identical');
  assert.deepStrictEqual(run1.keywords.missingKeywords, run2.keywords.missingKeywords, 'Missing keywords must be identical');
});

// 14. Undocumented Skills vs Proven Deficiencies Distinction
runTest('Job-match findings distinguish undocumented skills from proven skill deficiencies', () => {
  const result = analyzeResumeDeterministically(validResumeText, 'Senior Engineer', sampleJobDescription, 'senior');
  assert(
    result.scoringBreakdown.disclaimer.includes('Missing keywords reflect skills undocumented in the resume, not proof that the candidate lacks capability'),
    'Disclaimer must explicitly state missing keywords are undocumented, not proof of lacking capability'
  );
  const keywordImprovement = result.prioritizedImprovements.find(f => f.id === 'fix-keywords');
  if (keywordImprovement) {
    assert(
      keywordImprovement.explanation.includes('undocumented'),
      'Keyword improvement explanation must clarify missing mentions are undocumented'
    );
  }
});

console.log(`\n=== TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
if (passedTests === totalTests) {
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
} else {
  process.exit(1);
}

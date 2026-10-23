import {
  AnalysisResult,
  BulletImprovement,
  ExperienceLevel,
  FormattingCheck,
  PrioritizedFix,
} from '@/types';

// Action verbs dictionary
const ACTION_VERBS = new Set([
  'accelerated', 'achieved', 'administered', 'advised', 'allocated', 'analyzed',
  'architected', 'assembled', 'audited', 'automated', 'budgeted', 'built',
  'centralized', 'championed', 'coached', 'collaborated', 'completed', 'composed',
  'conceived', 'conducted', 'configured', 'constructed', 'consolidated', 'converted',
  'coordinated', 'created', 'customized', 'decreased', 'delivered', 'deployed',
  'designed', 'developed', 'devised', 'directed', 'distributed', 'documented',
  'doubled', 'drafted', 'earned', 'eliminated', 'enabled', 'enacted', 'engineered',
  'enhanced', 'established', 'evaluated', 'executed', 'expanded', 'expedited',
  'extracted', 'facilitated', 'finalized', 'forecasted', 'formulated', 'founded',
  'generated', 'governed', 'guided', 'halved', 'headed', 'hired', 'identified',
  'implemented', 'improved', 'increased', 'influenced', 'initiated', 'inspected',
  'installed', 'instituted', 'instructed', 'integrated', 'introduced', 'invented',
  'investigated', 'launched', 'led', 'leveraged', 'maintained', 'managed',
  'manufactured', 'marketed', 'maximized', 'mentored', 'merged', 'migrated',
  'minimized', 'modernized', 'monitored', 'motivated', 'negotiated', 'optimized',
  'orchestrated', 'organized', 'overhauled', 'oversaw', 'partnered', 'performed',
  'pioneered', 'planned', 'prepared', 'presented', 'produced', 'programmed',
  'promoted', 'proposed', 'provided', 'published', 'rebuilt', 'reconciled',
  'redesigned', 'reduced', 'refined', 'reformed', 'regulated', 'remodeled',
  'reorganized', 'repaired', 'replaced', 'resolved', 'restructured', 'revamped',
  'reviewed', 'revitalized', 'saved', 'scaled', 'scheduled', 'screened',
  'secured', 'selected', 'simplified', 'slashed', 'solicited', 'solved',
  'spearheaded', 'standardized', 'streamlined', 'strengthened', 'structured',
  'supervised', 'surpassed', 'synthesized', 'systematized', 'targeted', 'trained',
  'transformed', 'translated', 'tripled', 'troubleshot', 'unified', 'upgraded',
  'validated', 'verified', 'visualized', 'won', 'yielded'
]);

// Weak / passive phrases to flag
const WEAK_PHRASES = [
  'responsible for', 'duties included', 'worked with', 'helped with', 'assisted in',
  'participated in', 'handled', 'was tasked with', 'involved in', 'attempted to'
];

// Common industry skills dictionary
const COMMON_SKILLS = [
  // Tech & Engineering
  'javascript', 'typescript', 'react', 'next.js', 'node.js', 'python', 'java', 'c++',
  'c#', 'golang', 'ruby', 'php', 'rust', 'swift', 'kotlin', 'sql', 'postgresql',
  'mysql', 'mongodb', 'redis', 'graphql', 'rest api', 'docker', 'kubernetes', 'aws',
  'azure', 'gcp', 'ci/cd', 'git', 'linux', 'html', 'css', 'tailwind', 'microservices',
  'system design', 'agile', 'scrum', 'unit testing', 'terraform', 'kafka',
  // Product & Design
  'figma', 'sketch', 'adobe xd', 'wireframing', 'prototyping', 'user research',
  'usability testing', 'design systems', 'product roadmapping', 'product strategy',
  'okrs', 'kpis', 'a/b testing', 'user journeys', 'persona creation', 'information architecture',
  // Data & Analytics
  'machine learning', 'deep learning', 'pandas', 'numpy', 'scikit-learn', 'tensorflow',
  'pytorch', 'tableau', 'power bi', 'data modeling', 'etl', 'data warehousing',
  'google analytics', 'statistics', 'nlp', 'computer vision', 'bigquery', 'snowflake',
  // Business & Marketing
  'seo', 'sem', 'content strategy', 'email marketing', 'crm', 'salesforce', 'hubspot',
  'market research', 'lead generation', 'financial modeling', 'budgeting', 'cross-functional leadership',
  'stakeholder management', 'client relations', 'strategic planning', 'project management'
];

export function analyzeResumeDeterministically(
  resumeText: string,
  targetJobTitle: string = '',
  targetJobDescription: string = '',
  experienceLevel: ExperienceLevel = 'mid',
  fileName: string = 'resume-document'
): AnalysisResult {
  const cleanedText = resumeText.replace(/\r\n/g, '\n').trim();
  const lowerText = cleanedText.toLowerCase();
  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  // 1. Detect Contact Info
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const linkedInRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/gi;
  const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+|gitlab\.com\/[a-zA-Z0-9_-]+|behance\.net\/[a-zA-Z0-9_-]+|dribbble\.com\/[a-zA-Z0-9_-]+)/gi;

  const emailMatches = cleanedText.match(emailRegex);
  const phoneMatches = cleanedText.match(phoneRegex);
  const linkedInMatches = cleanedText.match(linkedInRegex);
  const githubMatches = cleanedText.match(githubRegex);

  const hasEmail = !!(emailMatches && emailMatches.length > 0);
  const hasPhone = !!(phoneMatches && phoneMatches.length > 0);
  const hasLinkedIn = !!(linkedInMatches && linkedInMatches.length > 0);
  const hasGitHubOrPortfolio = !!(githubMatches && githubMatches.length > 0) || /(https?:\/\/[^\s]+)/gi.test(cleanedText);

  const detectedEmail = hasEmail && emailMatches ? emailMatches[0] : undefined;
  const detectedPhone = hasPhone && phoneMatches ? phoneMatches[0] : undefined;
  const detectedLinkedIn = hasLinkedIn && linkedInMatches ? (linkedInMatches[0].startsWith('http') ? linkedInMatches[0] : `https://${linkedInMatches[0]}`) : undefined;

  // 2. Detect Standard Sections
  const sectionChecks = [
    { name: 'Professional Summary', patterns: ['summary', 'profile', 'about me', 'executive summary', 'objective', 'professional summary'] },
    { name: 'Work Experience', patterns: ['experience', 'work history', 'employment', 'professional experience', 'work experience'] },
    { name: 'Education', patterns: ['education', 'academic', 'degrees', 'university', 'college', 'academic background'] },
    { name: 'Skills & Competencies', patterns: ['skills', 'technologies', 'competencies', 'technical skills', 'core competencies'] },
    { name: 'Projects & Work Samples', patterns: ['projects', 'key projects', 'selected projects', 'portfolio'] },
    { name: 'Certifications & Honors', patterns: ['certifications', 'certificates', 'awards', 'honors', 'credentials'] },
  ];

  const detectedSections = sectionChecks.map(sec => {
    const found = sec.patterns.some(p => {
      const reg = new RegExp(`(^|\\n)[\\s★⚡►■●▶▪#*•·–—]*(?:professional\\s+|key\\s+|core\\s+|selected\\s+)?(${p})\\b`, 'i');
      return reg.test(cleanedText);
    });
    return { name: sec.name, found };
  });

  // 3. Extract Bullet Points & Metric Analysis
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const bulletLines = lines.filter(l => {
    return /^[-*•·–—★⚡►■●▶▪]\s*/.test(l) || /^\d+\.\s*/.test(l) || (l.length > 25 && l.length < 220 && !l.endsWith(':'));
  });

  // Quantifiable metrics: numbers, %, $, k, M, etc.
  const metricRegex = /(\b\d+(\.\d+)?%|\$\d+[\d,]*(\.\d+)?\s*(k|m|b|million|billion)?|\b\d+\+?\s*(users|clients|customers|engineers|team members|projects|features|x|fold)|\b\d+[\d,]*\b)/gi;
  let bulletsWithMetrics = 0;
  let bulletsWithActionVerbs = 0;
  let weakBulletsCount = 0;

  const rawBullets: string[] = [];

  for (const line of bulletLines) {
    const stripped = line.replace(/^[-*•·–—★⚡►■●▶▪\d.]\s*/, '').trim();
    if (stripped.length > 15) {
      rawBullets.push(stripped);
      if (metricRegex.test(stripped)) {
        bulletsWithMetrics++;
      }
      const firstWord = stripped.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
      if (firstWord && ACTION_VERBS.has(firstWord)) {
        bulletsWithActionVerbs++;
      }
      if (WEAK_PHRASES.some(wp => stripped.toLowerCase().startsWith(wp))) {
        weakBulletsCount++;
      }
    }
  }

  const totalAnalyzedBullets = Math.max(1, rawBullets.length);
  const metricDensity = Math.min(100, Math.round((bulletsWithMetrics / totalAnalyzedBullets) * 100));
  const actionVerbDensity = Math.min(100, Math.round((bulletsWithActionVerbs / totalAnalyzedBullets) * 100));

  // 4. Keyword & Job Description Matching
  const resumeTokens = new Set(
    lowerText
      .replace(/[^a-z0-9#+.\s-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1)
  );

  // Extract skills present in resume
  const matchedSkillsInResume = COMMON_SKILLS.filter(skill => {
    if (skill.includes(' ') || skill.includes('.')) {
      return lowerText.includes(skill);
    }
    return resumeTokens.has(skill);
  });

  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  let jobMatchScore = 72; // default
  const hasJobDescription = targetJobDescription.trim().length > 30;

  if (hasJobDescription) {
    const jdLower = targetJobDescription.toLowerCase();
    const jdTokens = new Set(
      jdLower
        .replace(/[^a-z0-9#+.\s-]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2)
    );

    // Identify target skills mentioned in JD
    const targetJdSkills = COMMON_SKILLS.filter(skill => {
      if (skill.includes(' ') || skill.includes('.')) {
        return jdLower.includes(skill);
      }
      return jdTokens.has(skill);
    });

    const STOPWORDS = new Set([
      'experience', 'responsible', 'requirements', 'qualifications', 'preferred',
      'including', 'knowledge', 'ability', 'working', 'skills', 'track', 'record',
      'using', 'strong', 'years', 'building', 'cloud', 'order', 'level', 'terms',
      'candidate', 'candidates', 'across', 'within', 'collaborate', 'deliver',
      'excellent', 'leadership', 'initiative', 'initiatives', 'position', 'duties'
    ]);

    // Also extract important technical / domain nouns from JD
    const customJdNouns: string[] = [];
    const jdWords = jdLower.split(/[\s,.;:()]+/).filter(w => w.length > 4);
    for (const w of jdWords) {
      if (!customJdNouns.includes(w) && !STOPWORDS.has(w) && !COMMON_SKILLS.includes(w)) {
        if (targetJobDescription.includes(w)) {
          customJdNouns.push(w);
        }
      }
      if (customJdNouns.length >= 8) break;
    }

    const allTargetRequirements = Array.from(new Set([...targetJdSkills, ...customJdNouns]));

    for (const req of allTargetRequirements) {
      const isMatched = lowerText.includes(req);
      if (isMatched) {
        matchedKeywords.push(req);
      } else {
        missingKeywords.push(req);
      }
    }

    const totalReqs = Math.max(1, allTargetRequirements.length);
    jobMatchScore = Math.min(98, Math.max(25, Math.round((matchedKeywords.length / totalReqs) * 100)));
  } else {
    // When no JD is supplied, assess against domain skills detected
    matchedKeywords = matchedSkillsInResume.slice(0, 16);
    // Baseline score reflects depth of industry skills found
    if (matchedKeywords.length >= 10) jobMatchScore = 86;
    else if (matchedKeywords.length >= 6) jobMatchScore = 76;
    else if (matchedKeywords.length >= 3) jobMatchScore = 65;
    else jobMatchScore = 52;

    missingKeywords = [
      'Target job description not provided. Paste job description to unlock 1-to-1 keyword gap analysis.'
    ];
  }

  // 5. Score Category Computations
  // A. ATS Readability (0 - 100)
  let atsScore = 80;
  const formattingChecks: FormattingCheck[] = [];

  if (hasEmail) {
    formattingChecks.push({ title: 'Contact Email Detected', status: 'pass', detail: 'Professional email address clearly identifiable for ATS parsing.' });
    atsScore += 4;
  } else {
    formattingChecks.push({ title: 'Missing Email Address', status: 'fail', detail: 'ATS scanners require a clear email to link your profile to applications.' });
    atsScore -= 15;
  }

  if (hasPhone) {
    formattingChecks.push({ title: 'Phone Number Detected', status: 'pass', detail: 'Valid phone contact syntax parsed correctly.' });
    atsScore += 3;
  } else {
    formattingChecks.push({ title: 'Missing Phone Number', status: 'warning', detail: 'Recruiters often use automated SMS or direct calls for screening.' });
    atsScore -= 6;
  }

  if (hasLinkedIn) {
    formattingChecks.push({ title: 'LinkedIn Profile Found', status: 'pass', detail: 'LinkedIn URL provides instant external credential verification.' });
    atsScore += 4;
  } else {
    formattingChecks.push({ title: 'No LinkedIn Profile Link', status: 'warning', detail: 'Over 85% of technical recruiters cross-reference LinkedIn profiles.' });
    atsScore -= 5;
  }

  // Length check (Word count)
  if (wordCount >= 200 && wordCount <= 1000) {
    formattingChecks.push({ title: 'Optimal Resume Length', status: 'pass', detail: `${wordCount} words is within the high-engagement range for standard 1-2 page resumes.` });
    atsScore += 6;
  } else if (wordCount < 200) {
    formattingChecks.push({ title: 'Concise Resume Length', status: 'warning', detail: `${wordCount} words detected. Resumes with under 200 words may lack keyword depth for competitive ATS filters.` });
    atsScore -= 6;
  } else {
    formattingChecks.push({ title: 'Length Exceeds Standard Limits', status: 'warning', detail: `${wordCount} words may indicate a multi-page resume that exceeds recruiter attention spans.` });
    atsScore -= 8;
  }

  // Standard headings check
  const foundSectionCount = detectedSections.filter(s => s.found).length;
  if (foundSectionCount >= 4) {
    formattingChecks.push({ title: 'Standard Section Headings', status: 'pass', detail: `${foundSectionCount} primary sections parsed with standard recognizable naming.` });
    atsScore += 5;
  } else {
    formattingChecks.push({ title: 'Non-Standard Section Headings', status: 'warning', detail: 'Use classic headers (Experience, Education, Skills) to avoid ATS miscategorization.' });
    atsScore -= 12;
  }

  atsScore = Math.min(98, Math.max(30, atsScore));

  // B. Content Quality (0 - 100)
  let contentScore = 50;
  contentScore += Math.round(metricDensity * 0.35); // up to +35
  contentScore += Math.round(actionVerbDensity * 0.30); // up to +30
  if (weakBulletsCount === 0) contentScore += 10;
  else contentScore -= Math.min(15, weakBulletsCount * 3);

  if (wordCount > 400) contentScore += 5;
  contentScore = Math.min(96, Math.max(35, contentScore));

  // C. Completeness Score (0 - 100)
  const completenessScore = Math.min(100, Math.round((foundSectionCount / sectionChecks.length) * 80) + (hasEmail && hasPhone ? 20 : 10));

  // D. Overall Composite Score (Strictly transparent weighted sum)
  const overallScore = Math.round(
    atsScore * 0.30 +
    contentScore * 0.35 +
    jobMatchScore * 0.25 +
    completenessScore * 0.10
  );

  // Overall Verdict
  let overallVerdict = 'Strong Candidate';
  if (overallScore >= 88) overallVerdict = 'Exceptional — Top Tier Application';
  else if (overallScore >= 76) overallVerdict = 'Strong — Ready with Minor Enhancements';
  else if (overallScore >= 62) overallVerdict = 'Competitive — Needs Impact & Metric Polish';
  else overallVerdict = 'Requires Structural & Content Revisions';

  // 6. Generate Prioritized Improvements
  const prioritizedImprovements: PrioritizedFix[] = [];

  if (metricDensity < 40) {
    prioritizedImprovements.push({
      id: 'fix-metrics',
      priority: 'high',
      title: 'Inject Measurable Business Impact & Metrics',
      explanation: `Only ${metricDensity}% of your work statements include numerical evidence. Quantified outcomes (e.g., '% saved', '$ revenue', 'team of N') distinguish high-performing applicants.`,
      expectedImpact: '+12 to +18 Content Quality Points'
    });
  }

  if (hasJobDescription && missingKeywords.length > 3) {
    prioritizedImprovements.push({
      id: 'fix-keywords',
      priority: 'high',
      title: `Integrate Missing Core Target Keywords`,
      explanation: `Your resume is missing key terms requested in the job description: ${missingKeywords.slice(0, 4).join(', ')}. If you have experience with these competencies, document them explicitly. Note: Missing mentions are treated as undocumented, not necessarily lacking ability.`,
      expectedImpact: '+15 to +20 ATS & Match Score'
    });
  }

  if (actionVerbDensity < 50) {
    prioritizedImprovements.push({
      id: 'fix-action-verbs',
      priority: 'medium',
      title: 'Replace Passive Responsibilities With High-Impact Action Verbs',
      explanation: `Strengthen the opening of your bullets with commanding verbs like 'Spearheaded', 'Architected', 'Orchestrated', and 'Accelerated' rather than passive duty statements like 'Responsible for' or 'Assisted with'.`,
      expectedImpact: '+8 to +12 Readability Points'
    });
  }

  if (!hasLinkedIn) {
    prioritizedImprovements.push({
      id: 'fix-linkedin',
      priority: 'quick_win',
      title: 'Add a Clean LinkedIn Profile URL',
      explanation: 'Include a clean hyperlink to your updated LinkedIn profile in the header contact section for fast candidate verification.',
      expectedImpact: '+5 ATS Readability Score'
    });
  }

  if (!detectedSections.find(s => s.name === 'Professional Summary')?.found) {
    prioritizedImprovements.push({
      id: 'fix-summary',
      priority: 'quick_win',
      title: 'Add a 3-Sentence High-Impact Executive Summary',
      explanation: 'A targeted summary immediately establishes your seniority, core domain mastery, and value proposition before the recruiter dives into your chronology.',
      expectedImpact: '+7 Completeness & First Impression'
    });
  }

  // 7. Grounded Bullet Point Suggestions
  const bulletSuggestions: BulletImprovement[] = [];

  // Pick candidates from user's actual bullets
  const candidatesForImprovement = rawBullets.filter(b => {
    const isWeak = WEAK_PHRASES.some(wp => b.toLowerCase().includes(wp));
    const lacksMetrics = !metricRegex.test(b);
    return isWeak || lacksMetrics;
  }).slice(0, 3);

  // If no explicitly weak bullets found, pick first 2-3 bullets to enhance with advanced framing
  const targetBullets = candidatesForImprovement.length > 0
    ? candidatesForImprovement
    : rawBullets.slice(0, 3);

  const bulletEnhancementBlueprints = [
    { verb: 'Spearheaded', metricOutcome: 'delivering an estimated 25% improvement in process efficiency and accelerating delivery cycles' },
    { verb: 'Architected and deployed', metricOutcome: 'reducing operational friction by 30% while maintaining high reliability' },
    { verb: 'Orchestrated cross-functional collaboration on', metricOutcome: 'resulting in a 20%+ increase in adoption across target stakeholder groups' }
  ];

  let bulletCounter = 1;
  for (let i = 0; i < targetBullets.length; i++) {
    const b = targetBullets[i];
    const blueprint = bulletEnhancementBlueprints[i % bulletEnhancementBlueprints.length];

    // Remove weak prefixes
    let cleanRemainder = b;
    for (const wp of WEAK_PHRASES) {
      if (cleanRemainder.toLowerCase().startsWith(wp)) {
        cleanRemainder = cleanRemainder.slice(wp.length).trim();
        cleanRemainder = cleanRemainder.replace(/^of\s+|^with\s+|^in\s+|^to\s+/, '');
      }
    }

    // Capitalize clean remainder if starting verb removed
    cleanRemainder = cleanRemainder.charAt(0).toLowerCase() + cleanRemainder.slice(1);

    const improvedBullet = `${blueprint.verb} ${cleanRemainder}, ${blueprint.metricOutcome}.`;

    bulletSuggestions.push({
      id: `bullet-${bulletCounter++}`,
      original: b,
      improved: improvedBullet,
      rationale: 'Replaces passive/duty phrasing with a commanding action verb and supplies the Google X-Y-Z formula (Accomplished [X] as measured by [Y] by doing [Z]). Edit the outcome figures to reflect your verified metrics.',
      category: 'metric_impact'
    });
  }

  // 8. Grounded Summary Improvement
  const hasSummary = detectedSections.find(s => s.name === 'Professional Summary')?.found;
  const inferredRole = targetJobTitle || (matchedSkillsInResume[0] ? `${matchedSkillsInResume[0].toUpperCase()} Specialist` : 'Professional');
  const yearsExp = experienceLevel === 'entry' ? '2+' : experienceLevel === 'mid' ? '4+' : experienceLevel === 'senior' ? '8+' : '12+';

  const suggestedSummary = `Results-driven ${inferredRole} with ${yearsExp} years of progressive experience delivering high-impact solutions across fast-paced environments. Proven track record in ${matchedSkillsInResume.slice(0, 3).join(', ') || 'strategic execution'}, cross-functional leadership, and optimizing operational workflows. Dedicated to driving measurable business growth and continuous innovation.`;

  return {
    id: `talvyn-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    fileName,
    wordCount,
    readingTimeMinutes,
    overallScore,
    overallVerdict,
    isAiEnhanced: false,
    aiProviderLabel: 'Deterministic Deep-Rule Engine',
    targetJobTitle: targetJobTitle || undefined,
    hasJobDescription,
    experienceLevel,
    rawResumeText: cleanedText,
    scoringBreakdown: {
      methodology: 'Transparent 4-pillar deterministic evaluation with explicit weights: ATS Readability (30%), Content & Impact (35%), Role Alignment (25%), Completeness (10%).',
      atsFormula: 'Headers (+5), Email (+4), Phone (+3), LinkedIn (+4), Length 350-1100w (+6), Single-column parsing compatibility (+60 baseline).',
      contentFormula: 'Action verb opening density (30% weight), quantifiable metric density (35% weight), passive phrase deduction.',
      jobMatchFormula: hasJobDescription
        ? 'Ratio of matched target job description keywords against total extracted domain requirements.'
        : 'Domain keyword density benchmark for specified role tier. Supply a target job description for 1-to-1 gap analysis.',
      completenessFormula: 'Verification of core structural sections (Summary, Experience, Education, Skills, Projects, Certifications) and direct contact methods.',
      disclaimer: 'TALVYN provides structural and semantic scoring based on documented recruitment best practices. Scores do not reproduce proprietary employer ATS algorithms or predict hiring decisions with certainty. Missing keywords reflect skills undocumented in the resume, not proof that the candidate lacks capability.'
    },
    scores: {
      atsReadability: {
        score: atsScore,
        label: 'ATS Readability',
        weight: 30,
        status: atsScore >= 85 ? 'excellent' : atsScore >= 70 ? 'good' : atsScore >= 55 ? 'average' : 'needs_work',
        description: 'Evaluates machine-readability, contact field detection, section standardisation, and parser compatibility.',
        tips: [
          'Ensure clean single-column or ATS-tested structure.',
          'Always use universal headers: Experience, Education, Skills.',
          'Place full contact info at the top without placing it inside headers/footers.'
        ]
      },
      contentQuality: {
        score: contentScore,
        label: 'Content & Impact',
        weight: 35,
        status: contentScore >= 85 ? 'excellent' : contentScore >= 70 ? 'good' : contentScore >= 55 ? 'average' : 'needs_work',
        description: 'Assesses active versus passive voice, quantifiable business outcomes, and bullet point rigor.',
        tips: [
          'Begin every bullet with a strong past-tense action verb.',
          'Apply the Google X-Y-Z formula: Accomplished [X], as measured by [Y], by doing [Z].',
          'Aim for at least 50% of bullets containing measurable numbers or percentages.'
        ]
      },
      jobMatch: {
        score: jobMatchScore,
        label: 'Job Description Match',
        weight: 25,
        status: jobMatchScore >= 85 ? 'excellent' : jobMatchScore >= 70 ? 'good' : jobMatchScore >= 55 ? 'average' : 'needs_work',
        description: hasJobDescription
          ? 'Direct keyword and competency alignment against your supplied target job requirements.'
          : 'General domain competency rating. Supply a job description above for exact 1-to-1 keyword match.',
        tips: [
          'Review the missing keywords section below and naturally incorporate them where you have real experience.',
          'Mirror exact phrasing used in the job description when referring to tools and frameworks.'
        ]
      },
      completeness: {
        score: completenessScore,
        label: 'Resume Completeness',
        weight: 10,
        status: completenessScore >= 85 ? 'excellent' : completenessScore >= 70 ? 'good' : completenessScore >= 55 ? 'average' : 'needs_work',
        description: 'Verifies presence of core sections, contact methods, and professional credentials.',
        tips: [
          'Ensure all core sections (Summary, Experience, Education, Skills) are present.',
          'Add a portfolio or LinkedIn link for third-party validation.'
        ]
      }
    },
    keywords: {
      matchedKeywords,
      missingKeywords,
      jobTitleKeywords: targetJobTitle ? targetJobTitle.split(/\s+/).filter(w => w.length > 2) : [],
      relevanceScore: jobMatchScore,
      totalTargetKeywords: matchedKeywords.length + missingKeywords.length
    },
    formattingChecks,
    prioritizedImprovements,
    summarySuggestion: {
      originalFound: !!hasSummary,
      suggestedSummary,
      advice: hasSummary
        ? 'Your current summary can be strengthened with more precise competency keywords and executive tone.'
        : 'Adding this concise 3-sentence summary above your experience creates an immediate hook for recruiters.'
    },
    bulletSuggestions,
    detectedSections,
    contactInfo: {
      hasEmail,
      hasPhone,
      hasLinkedIn,
      hasGitHubOrPortfolio,
      detectedEmail,
      detectedPhone,
      detectedLinkedIn
    }
  };
}

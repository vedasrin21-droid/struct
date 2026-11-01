export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';

export interface ScoreCategory {
  score: number; // 0 - 100
  label: string;
  weight: number;
  status: 'excellent' | 'good' | 'average' | 'needs_work';
  description: string;
  tips: string[];
}

export interface KeywordAnalysis {
  matchedKeywords: string[];
  missingKeywords: string[];
  jobTitleKeywords: string[];
  relevanceScore: number; // 0 - 100
  totalTargetKeywords: number;
}

export interface BulletImprovement {
  id: string;
  original: string;
  improved: string;
  rationale: string;
  category: 'metric_impact' | 'action_verb' | 'clarity' | 'ats_conciseness';
}

export interface FormattingCheck {
  title: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

export interface PrioritizedFix {
  id: string;
  priority: 'high' | 'medium' | 'quick_win';
  title: string;
  explanation: string;
  expectedImpact: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  fileName?: string;
  wordCount: number;
  readingTimeMinutes: number;
  overallScore: number; // 0 - 100
  overallVerdict: string;
  isAiEnhanced: boolean;
  aiProviderLabel: string;
  targetJobTitle?: string;
  hasJobDescription: boolean;
  experienceLevel: ExperienceLevel;

  // Category scores
  scores: {
    atsReadability: ScoreCategory;
    contentQuality: ScoreCategory;
    jobMatch: ScoreCategory;
    completeness: ScoreCategory;
  };

  // Keywords
  keywords: KeywordAnalysis;

  // Specific findings
  formattingChecks: FormattingCheck[];
  prioritizedImprovements: PrioritizedFix[];
  summarySuggestion?: {
    originalFound: boolean;
    suggestedSummary: string;
    advice: string;
  };
  bulletSuggestions: BulletImprovement[];

  // Structure detection
  detectedSections: {
    name: string;
    found: boolean;
  }[];
  contactInfo: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasLinkedIn: boolean;
    hasGitHubOrPortfolio: boolean;
    detectedEmail?: string;
    detectedPhone?: string;
    detectedLinkedIn?: string;
    detectedLocation?: string;
  };
  rawResumeText?: string;
  scoringBreakdown?: {
    methodology: string;
    atsFormula: string;
    contentFormula: string;
    jobMatchFormula: string;
    completenessFormula: string;
    disclaimer: string;
  };
  entitlement?: {
    hasAccess: boolean;
    consumed: boolean;
    remainingUsages: number;
    email?: string;
    notice?: string;
    upgradeOffer?: {
      productId: string;
      name: string;
      priceRupees: number;
      amountPaise: number;
    };
  };
}


export interface AnalysisRequest {
  resumeText?: string;
  targetJobTitle?: string;
  targetJobDescription?: string;
  experienceLevel?: ExperienceLevel;
}

// Resume Builder Types
export interface WorkExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  field: string;
  institution: string;
  location: string;
  gradYear: string;
  details?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  technologies: string;
  link?: string;
  bullets: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  url?: string;
}

export interface ResumeContact {
  fullName: string;
  targetRole: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}

export type ResumeSectionKey = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications';

export interface ResumeData {
  id: string;
  contact: ResumeContact;
  summary: string;
  experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  sectionOrder: ResumeSectionKey[];
  visibleSections: Record<ResumeSectionKey, boolean>;
  layout: 'classic' | 'modern';
}

import { AnalysisResult, BulletImprovement } from '@/types';

interface AiEnhancementOptions {
  resumeText: string;
  targetJobTitle?: string;
  targetJobDescription?: string;
  deterministicResult: AnalysisResult;
}

export async function enhanceWithAiIfAvailable(
  options: AiEnhancementOptions
): Promise<AnalysisResult> {
  const { resumeText, targetJobTitle, targetJobDescription, deterministicResult } = options;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openAiKey) {
    // Return honestly labelled deterministic report
    return deterministicResult;
  }

  // Construct prompt
  const candidateBullets = deterministicResult.bulletSuggestions.map(b => b.original);
  const prompt = `You are an elite executive resume coach at TALVYN.
You are given an excerpt of an actual resume and an optional target job description.
DO NOT hallucinate or invent new companies, degrees, or unmentioned career history.

Resume Excerpt:
"""
${resumeText.slice(0, 3000)}
"""

Target Role: ${targetJobTitle || 'Not specified'}
Target Job Description: ${targetJobDescription ? targetJobDescription.slice(0, 1000) : 'None provided'}

Candidate Bullets from Resume to Upgrade:
${candidateBullets.map((b, i) => `${i + 1}. "${b}"`).join('\n')}

Task:
1. Provide a sharp, executive rewrite for up to 3 candidate bullets. For each bullet, maintain the truth of their real experience, but start with a commanding action verb and add realistic metrics/impact structure (Google X-Y-Z formula: Accomplished X as measured by Y by doing Z).
2. Provide a 3-sentence high-impact executive summary rewrite tailored for the candidate's background.
3. Suggest 1 additional high-impact improvement note.

Output strictly valid JSON matching this schema:
{
  "bulletRewrites": [
    {
      "original": "exact original bullet",
      "improved": "high-impact upgraded bullet",
      "rationale": "specific explanation of why this is better"
    }
  ],
  "suggestedSummary": "3-sentence executive summary",
  "summaryAdvice": "why this summary works better for their target role",
  "aiCoachNote": "brief executive tip"
}`;

  try {
    // 1. Try Gemini if configured
    if (geminiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Using gemini-1.5-flash or gemini-2.5-flash
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const parsed = JSON.parse(textContent);
          return applyAiEnhancements(deterministicResult, parsed, 'AI-Enhanced (Gemini Flash)');
        }
      }
    }

    // 2. Try OpenAI if configured
    if (openAiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return applyAiEnhancements(deterministicResult, parsed, 'AI-Enhanced (GPT-4o Mini)');
        }
      }
    }
  } catch (err) {
    // If AI fails or times out, safely return deterministic report with clear label
    console.warn('[Talvyn AI] API call failed or timed out. Falling back to deterministic analysis:', err);
  }

  return deterministicResult;
}

function applyAiEnhancements(
  base: AnalysisResult,
  aiData: {
    bulletRewrites?: { original: string; improved: string; rationale: string }[];
    suggestedSummary?: string;
    summaryAdvice?: string;
    aiCoachNote?: string;
  },
  providerLabel: string
): AnalysisResult {
  const enhancedBullets: BulletImprovement[] = [];

  if (Array.isArray(aiData.bulletRewrites) && aiData.bulletRewrites.length > 0) {
    aiData.bulletRewrites.forEach((item, idx) => {
      if (item.original && item.improved) {
        enhancedBullets.push({
          id: `ai-bullet-${idx + 1}`,
          original: item.original,
          improved: item.improved,
          rationale: item.rationale || 'Enhanced with active verbs and quantifiable outcome framing.',
          category: 'metric_impact',
        });
      }
    });
  }

  return {
    ...base,
    isAiEnhanced: true,
    aiProviderLabel: providerLabel,
    bulletSuggestions: enhancedBullets.length > 0 ? enhancedBullets : base.bulletSuggestions,
    summarySuggestion: aiData.suggestedSummary
      ? {
          originalFound: base.summarySuggestion?.originalFound ?? false,
          suggestedSummary: aiData.suggestedSummary,
          advice: aiData.summaryAdvice || base.summarySuggestion?.advice || 'Tailored to highlight your target competency positioning.',
        }
      : base.summarySuggestion,
  };
}

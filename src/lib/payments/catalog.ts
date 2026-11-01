/**
 * STRUCT AUTHORITATIVE PRODUCT & ENTITLEMENT CATALOG
 * 
 * Strict rule: The browser must NEVER determine or dictate the amount charged.
 * Product prices and entitlement units are authoritatively resolved on the server.
 */

export interface ProductDefinition {
  id: string;
  name: string;
  description: string;
  amountPaise: number; // In INR Paise (₹49 = 4900 paise)
  currency: 'INR';
  featureType: 'resume_ai_usage' | 'mock_interview_attempt';
  unitsGranted: number;
  badge?: string;
  popular?: boolean;
}

export const PRODUCT_CATALOG: Record<string, ProductDefinition> = {
  resume_ai_pack_49: {
    id: 'resume_ai_pack_49',
    name: 'Executive AI Polish + Detailed ATS Analysis',
    description: '2 Complete Usages. Includes Google X-Y-Z bullet rewrites, tailored executive summary, and ATS PDF export.',
    amountPaise: 4900, // ₹49
    currency: 'INR',
    featureType: 'resume_ai_usage',
    unitsGranted: 2,
    badge: 'Launch Special • ₹24.50 / usage',
    popular: true,
  },
  // Future products defined for catalog validation without being publicly purchasable in Phase 3
  mock_interview_1_29: {
    id: 'mock_interview_1_29',
    name: 'AI Mock Technical Interview (1 Attempt)',
    description: '1 full proctored technical interview simulation with real-time feedback.',
    amountPaise: 2900, // ₹29
    currency: 'INR',
    featureType: 'mock_interview_attempt',
    unitsGranted: 1,
  },
  mock_interview_5_99: {
    id: 'mock_interview_5_99',
    name: 'AI Mock Technical Interview (5 Attempts)',
    description: '5 full proctored technical interview simulations.',
    amountPaise: 9900, // ₹99
    currency: 'INR',
    featureType: 'mock_interview_attempt',
    unitsGranted: 5,
  },
};

export const APPROVED_PUBLIC_PRODUCTS = ['resume_ai_pack_49'];

export function getProductOrThrow(productId: string): ProductDefinition {
  const product = PRODUCT_CATALOG[productId];
  if (!product) {
    throw new Error(`INVALID_PRODUCT_ID: Product "${productId}" does not exist in authoritative catalog.`);
  }
  if (!APPROVED_PUBLIC_PRODUCTS.includes(productId)) {
    throw new Error(`UNAVAILABLE_PRODUCT: Product "${productId}" is not available for public purchase in this phase.`);
  }
  return product;
}

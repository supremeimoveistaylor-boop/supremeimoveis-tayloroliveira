export interface SEOGlobalConfig {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  keywords: string[];
  city: string;
  state: string;
  phone: string;
  companyName: string;
  canonicalBase: string;
}

export interface SEOPageConfig {
  id: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  h2List: string[];
  bodyText: string;
  faqItems: { question: string; answer: string }[];
  // Local SEO
  neighborhood: string;
  region: string;
  propertyType: string;
  priceRange: string;
  focusKeyword: string;
}

export interface SEOScore {
  total: number;
  titleLength: boolean;
  titleHasKeyword: boolean;
  descriptionLength: boolean;
  descriptionHasKeyword: boolean;
  hasH1: boolean;
  hasSlug: boolean;
  hasFaq: boolean;
  keywordDensity: number;
}

export function calculateSEOScore(page: Partial<SEOPageConfig>): SEOScore {
  const title = page.metaTitle || '';
  const desc = page.metaDescription || '';
  const keyword = (page.focusKeyword || '').toLowerCase();
  const body = (page.bodyText || '').toLowerCase();

  const titleLength = title.length >= 30 && title.length <= 60;
  const titleHasKeyword = keyword.length > 2 && title.toLowerCase().includes(keyword);
  const descriptionLength = desc.length >= 120 && desc.length <= 160;
  const descriptionHasKeyword = keyword.length > 2 && desc.toLowerCase().includes(keyword);
  const hasH1 = (page.h1 || '').length > 5;
  const hasSlug = (page.slug || '').length > 3 && (page.slug || '').startsWith('/');
  const hasFaq = (page.faqItems || []).length >= 3;

  // Keyword density calculation
  const words = body.split(/\s+/).filter(Boolean);
  const keywordCount = keyword.length > 2 ? words.filter(w => w.includes(keyword)).length : 0;
  const keywordDensity = words.length > 0 ? (keywordCount / words.length) * 100 : 0;

  const checks = [titleLength, titleHasKeyword, descriptionLength, descriptionHasKeyword, hasH1, hasSlug, hasFaq];
  const passed = checks.filter(Boolean).length;
  const total = Math.round((passed / checks.length) * 100);

  return {
    total,
    titleLength,
    titleHasKeyword,
    descriptionLength,
    descriptionHasKeyword,
    hasH1,
    hasSlug,
    hasFaq,
    keywordDensity,
  };
}

export function getSEOLevel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 80) return { label: 'Excelente', color: 'text-green-400', emoji: '🟢' };
  if (score >= 50) return { label: 'Médio', color: 'text-yellow-400', emoji: '🟡' };
  return { label: 'Fraco', color: 'text-red-400', emoji: '🔴' };
}

export function generateDynamicTitle(config: SEOGlobalConfig, page?: Partial<SEOPageConfig>): string {
  if (page?.metaTitle) return page.metaTitle;
  if (page?.propertyType && config.city) {
    return `${page.propertyType} em ${config.city} | ${config.companyName}`;
  }
  return config.defaultTitle || `${config.companyName} - Imóveis em ${config.city}`;
}

export function generateDynamicDescription(config: SEOGlobalConfig, page?: Partial<SEOPageConfig>): string {
  if (page?.metaDescription) return page.metaDescription;
  if (page?.propertyType && config.city) {
    return `Encontre ${page.propertyType.toLowerCase()} em ${config.city}. ${config.companyName} oferece as melhores oportunidades com segurança e exclusividade.`;
  }
  return config.defaultDescription || `Encontre seu imóvel ideal em ${config.city} com a ${config.companyName}.`;
}

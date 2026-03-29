// UTM & Source Tracking Capture Utility
// Captures UTM parameters, gclid, and referrer on page load

export interface SourceData {
  source: string | null;
  source_detail: string | null;
  medium: string | null;
  campaign: string | null;
  origin_url: string | null;
}

const UTM_STORAGE_KEY = 'supreme_utm_data';

export function captureUTMParams(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const gclid = params.get('gclid');
    const fbclid = params.get('fbclid');

    // Only save if we have tracking params
    if (!utmSource && !gclid && !fbclid) return;

    const data: SourceData = {
      source: gclid ? 'google_ads' : fbclid ? 'meta_ads' : utmSource,
      source_detail: gclid ? `gclid:${gclid}` : fbclid ? `fbclid:${fbclid}` : null,
      medium: utmMedium || (gclid ? 'cpc' : fbclid ? 'paid_social' : null),
      campaign: utmCampaign || null,
      origin_url: window.location.href,
    };

    // Never overwrite existing UTM data (first touch wins)
    const existing = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!existing) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Silently fail
  }
}

export function getStoredUTMData(): SourceData | null {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Silently fail
  }

  // Fallback: detect source from referrer
  try {
    const referrer = document.referrer;
    if (!referrer) return { source: 'direto', source_detail: null, medium: null, campaign: null, origin_url: window.location.href };

    if (referrer.includes('google.com')) return { source: 'google', source_detail: 'organic', medium: 'organic', campaign: null, origin_url: window.location.href };
    if (referrer.includes('instagram.com')) return { source: 'instagram', source_detail: 'referral', medium: 'social', campaign: null, origin_url: window.location.href };
    if (referrer.includes('facebook.com')) return { source: 'facebook', source_detail: 'referral', medium: 'social', campaign: null, origin_url: window.location.href };

    return { source: 'referral', source_detail: new URL(referrer).hostname, medium: 'referral', campaign: null, origin_url: window.location.href };
  } catch {
    return null;
  }
}

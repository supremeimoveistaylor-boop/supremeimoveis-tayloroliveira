// GA4 + Meta Pixel Custom Events Helper

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
  }
}

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  // GA4
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
  // Meta Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, params);
  }
};

// WhatsApp click events
export const trackWhatsAppClick = (source: string, propertyId?: string, propertyTitle?: string) => {
  trackEvent('whatsapp_click', {
    event_category: 'engagement',
    event_label: source,
    property_id: propertyId,
    property_title: propertyTitle,
  });
};

// Form submission events
export const trackFormSubmit = (formName: string, extra?: Record<string, any>) => {
  trackEvent('form_submit', {
    event_category: 'conversion',
    form_name: formName,
    ...extra,
  });
};

// Property view details
export const trackViewDetails = (propertyId: string, propertyTitle: string) => {
  trackEvent('view_property_details', {
    event_category: 'engagement',
    property_id: propertyId,
    property_title: propertyTitle,
  });
};

// Financing simulator events
export const trackSimulatorStarted = () => {
  trackEvent('simulator_started', {
    event_category: 'conversion',
    event_label: 'financing_simulator',
  });
};

export const trackSimulatorCompleted = (banco?: string, valorImovel?: number) => {
  trackEvent('simulator_completed', {
    event_category: 'conversion',
    event_label: 'financing_simulator',
    banco,
    valor_imovel: valorImovel,
  });
};

export const trackSimulatorRegistration = () => {
  trackEvent('simulator_registration', {
    event_category: 'conversion',
    event_label: 'financing_user_registration',
  });
};

// =====================================================
// CHAT TRACKING EVENTS
// =====================================================
export const trackChatOpened = (source: string = 'widget') => {
  trackEvent('chat_opened', { event_category: 'chat', source });
};

export const trackChatFirstMessage = () => {
  trackEvent('chat_first_message', { event_category: 'chat' });
};

export const trackChatNameCaptured = () => {
  trackEvent('chat_name_captured', { event_category: 'chat_conversion' });
};

export const trackChatPhoneCaptured = () => {
  trackEvent('chat_phone_captured', { event_category: 'chat_conversion' });
};

export const trackChatLeadQualified = (category?: string) => {
  trackEvent('chat_lead_qualified', { event_category: 'chat_conversion', lead_category: category });
};

export const trackChatLeadInterest = (interestType: string) => {
  trackEvent('chat_lead_interest', { event_category: 'chat_conversion', interest_type: interestType });
};

export const trackChatFinished = () => {
  trackEvent('chat_finished', { event_category: 'chat' });
};

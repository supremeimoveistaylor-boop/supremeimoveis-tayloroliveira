// GA4 Custom Events Helper
// Uses the gtag.js already loaded in index.html

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
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

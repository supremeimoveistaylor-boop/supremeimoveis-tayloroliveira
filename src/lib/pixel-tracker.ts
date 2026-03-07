/**
 * Supreme Pixel Tracker - Sistema interno de rastreamento de eventos
 * Similar ao Meta Pixel, mas salva direto no CRM/Supabase
 */

const TRACK_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/track-event`;

// Session ID persistente (por sessão do navegador)
function getSessionId(): string {
  let sid = sessionStorage.getItem("supreme_session_id");
  if (!sid) {
    sid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("supreme_session_id", sid);
  }
  return sid;
}

// User ID (do localStorage se disponível)
function getUserId(): string | null {
  try {
    return localStorage.getItem("supreme_chat_lead_id") || null;
  } catch {
    return null;
  }
}

// Detectar tipo de dispositivo
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

// Detectar navegador
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

type EventType =
  | "page_view"
  | "button_click"
  | "whatsapp_click"
  | "lead_generated"
  | "checkout_started"
  | "purchase_completed"
  | "chat_started"
  | "chat_message_sent"
  | "property_viewed"
  | "financing_started"
  | "financing_completed"
  | "contact_form_submitted"
  | "phone_click"
  | "share_click"
  | "search_performed";

/**
 * Enviar evento de rastreamento para o backend
 */
export function trackEvent(eventType: EventType, metadata: Record<string, unknown> = {}) {
  try {
    const payload = {
      event: eventType,
      session_id: getSessionId(),
      user_id: getUserId(),
      page_url: window.location.href,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      browser: getBrowser(),
      metadata,
    };

    // Usar sendBeacon para não bloquear navegação
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(TRACK_URL, blob);
    } else {
      fetch(TRACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silencioso - nunca quebrar a UX por causa de tracking
  }
}

/**
 * Tracker global acessível via window.crmTracker
 */
export function initGlobalTracker() {
  (window as any).crmTracker = trackEvent;

  // Auto-track page_view
  trackEvent("page_view");

  // Track page views em navegação SPA (popstate)
  window.addEventListener("popstate", () => {
    trackEvent("page_view");
  });
}

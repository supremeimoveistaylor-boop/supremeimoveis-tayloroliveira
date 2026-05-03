import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BPzeTEyio6OSTyQmAmNEkMMG4b-1LYu_2BjVSI5wD-uzCu_wVWgAHelxKDT4Th_tv8cfCJw_WpAWFE8erp8pyrc";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (isPreviewHost()) return;

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Pedir permissão (iOS exige gesto, mas tentamos no load se já concedida)
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted" || cancelled) return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const json = sub.toJSON() as any;
        const { data: userData } = await supabase.auth.getUser();

        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userData?.user?.id ?? null,
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" }
        );
      } catch (e) {
        console.warn("[push] erro ao registrar:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

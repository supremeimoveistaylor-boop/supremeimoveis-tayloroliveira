import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * 🔔 Sistema unificado de notificações em tempo real para o painel admin.
 *
 * - Toca som diferente para novo lead e nova mensagem (WhatsApp / chat / Instagram).
 * - Estratégia de auto-unlock para autoplay em mobile (Android/iOS).
 * - Suporte a vibração, Web Notifications (background) e repetição.
 * - Reconnect automático em quedas do Realtime.
 * - Wake Lock para manter a tela ativa quando aberto em mobile.
 *
 * Persistência em localStorage da preferência do usuário (volume, ON/OFF, tipo).
 */

const STORAGE_KEY = "admin-notifications-prefs:v1";

export type LeadSoundKey = "new-lead" | "chime" | "notification";
export type MessageSoundKey = "new-message" | "chime" | "notification";

export interface NotificationPrefs {
  enabled: boolean;
  volume: number; // 0..1
  leadSound: LeadSoundKey;
  messageSound: MessageSoundKey;
  repeatUntilSeen: boolean;
  vibrate: boolean;
  desktopNotifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  volume: 0.9,
  leadSound: "new-lead",
  messageSound: "new-message",
  repeatUntilSeen: false,
  vibrate: true,
  desktopNotifications: true,
};

const SOUND_FILES: Record<string, string> = {
  "new-lead": "/sounds/new-lead.wav",
  "new-message": "/sounds/new-message.wav",
  chime: "/sounds/chime.wav",
  notification: "/sounds/notification.wav",
};

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

interface UseAdminNotificationsOptions {
  enabled?: boolean;
  /** ID do usuário admin (filtra mensagens das próprias conversas/conexões). */
  userId?: string | null;
  onNewLead?: (lead: any) => void;
  onNewMessage?: (msg: any) => void;
}

export function useAdminNotifications({
  enabled = true,
  userId = null,
  onNewLead,
  onNewMessage,
}: UseAdminNotificationsOptions = {}) {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(loadPrefs);
  const [latestNewLeadId, setLatestNewLeadId] = useState<string | null>(null);
  const [latestNewMessageId, setLatestNewMessageId] = useState<string | null>(null);
  const [unseenCount, setUnseenCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const unlockedRef = useRef(false);
  const repeatTimerRef = useRef<number | null>(null);
  const seenLeadsRef = useRef<Set<string>>(new Set());
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const setPrefs = useCallback((updater: Partial<NotificationPrefs> | ((p: NotificationPrefs) => NotificationPrefs)) => {
    setPrefsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      savePrefs(next);
      return next;
    });
  }, []);

  // Pré-carrega os áudios na primeira renderização
  useEffect(() => {
    Object.entries(SOUND_FILES).forEach(([key, url]) => {
      if (audioCacheRef.current.has(key)) return;
      const a = new Audio(url);
      a.preload = "auto";
      audioCacheRef.current.set(key, a);
    });
  }, []);

  // Destrava autoplay no primeiro gesto do usuário (essencial p/ mobile)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      const promises: Promise<void>[] = [];
      audioCacheRef.current.forEach((a) => {
        const prevVol = a.volume;
        a.volume = 0;
        const p = a
          .play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = prevVol;
          })
          .catch(() => {
            a.volume = prevVol;
          });
        promises.push(p);
      });
      Promise.allSettled(promises).then(() => {
        unlockedRef.current = true;
      });
    };
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playSoundOnce = useCallback((key: string) => {
    const p = prefsRef.current;
    if (!p.enabled) return;
    const a = audioCacheRef.current.get(key);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.volume = Math.max(0, Math.min(1, p.volume));
      void a.play().catch((err) => {
        console.warn("[notifications] autoplay bloqueado:", err);
      });
    } catch (err) {
      console.warn("[notifications] erro ao tocar som:", err);
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!prefsRef.current.vibrate) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* ignore */
    }
  }, []);

  const showDesktopNotification = useCallback((title: string, body: string) => {
    if (!prefsRef.current.desktopNotifications) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (typeof document !== "undefined" && document.visibilityState === "visible") return; // só em background
    try {
      const n = new Notification(title, { body, icon: "/icon-192.png", tag: title });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      /* ignore */
    }
  }, []);

  const stopRepeat = useCallback(() => {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  const startRepeat = useCallback(
    (key: string) => {
      if (!prefsRef.current.repeatUntilSeen) return;
      stopRepeat();
      repeatTimerRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          stopRepeat();
          return;
        }
        playSoundOnce(key);
      }, 6000);
    },
    [playSoundOnce, stopRepeat]
  );

  const acknowledge = useCallback(() => {
    setUnseenCount(0);
    setLatestNewLeadId(null);
    setLatestNewMessageId(null);
    stopRepeat();
  }, [stopRepeat]);

  // Para repetição quando a aba volta a ficar visível
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") stopRepeat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stopRepeat]);

  // Pede permissão de notificação no primeiro mount
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Wake Lock — mantém tela ativa enquanto o painel está aberto
  useEffect(() => {
    if (!enabled) return;
    let wakeLock: any = null;
    let released = false;

    const request = async () => {
      try {
        // @ts-expect-error wakeLock pode não existir em todos os browsers
        if (navigator.wakeLock?.request) {
          // @ts-expect-error
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* ignore */
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && !released) request();
    };
    request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        wakeLock?.release?.();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);

  // 🔌 Realtime — leads
  useEffect(() => {
    if (!enabled) return;

    let channel = supabase
      .channel("admin-notif-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead: any = payload.new;
          if (!lead?.id || seenLeadsRef.current.has(lead.id)) return;
          seenLeadsRef.current.add(lead.id);

          playSoundOnce(prefsRef.current.leadSound);
          vibrate([200, 80, 200, 80, 200]);
          setLatestNewLeadId(lead.id);
          setUnseenCount((c) => c + 1);
          startRepeat(prefsRef.current.leadSound);

          const title = "🔔 Novo lead recebido!";
          const desc = `${lead.name || "Visitante"}${lead.phone ? " • " + lead.phone : ""}`;
          toast({ title, description: desc });
          showDesktopNotification(title, desc);

          onNewLead?.(lead);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, playSoundOnce, vibrate, startRepeat, showDesktopNotification, onNewLead]);

  // 🔌 Realtime — mensagens (omnichat + channel_messages)
  useEffect(() => {
    if (!enabled) return;

    const handleIncoming = (msg: any, source: "omnichat" | "channel") => {
      if (!msg?.id || seenMessagesRef.current.has(msg.id)) return;

      // Só queremos mensagens RECEBIDAS (cliente -> nós), não enviadas pelo próprio admin
      if (source === "omnichat") {
        // sender_type esperado: 'user' (cliente) | 'agent' | 'bot'
        if (msg.sender_type && msg.sender_type !== "user") return;
      } else {
        // channel_messages: direction 'inbound' = recebida
        if (msg.direction && msg.direction !== "inbound") return;
        // Filtra para o usuário/conexão dono se possível
        if (userId && msg.user_id && msg.user_id !== userId) return;
      }

      seenMessagesRef.current.add(msg.id);

      playSoundOnce(prefsRef.current.messageSound);
      vibrate(120);
      setLatestNewMessageId(msg.id);
      setUnseenCount((c) => c + 1);
      startRepeat(prefsRef.current.messageSound);

      const title = "💬 Nova mensagem";
      const preview = (msg.content || "").toString().slice(0, 80) || "(mídia)";
      toast({ title, description: preview });
      showDesktopNotification(title, preview);

      onNewMessage?.(msg);
    };

    const ch = supabase
      .channel("admin-notif-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "omnichat_messages" },
        (payload) => handleIncoming(payload.new, "omnichat")
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages" },
        (payload) => handleIncoming(payload.new, "channel")
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [enabled, userId, playSoundOnce, vibrate, startRepeat, showDesktopNotification, onNewMessage]);

  // 🔁 Reconnect automático em caso de perda de rede
  useEffect(() => {
    const onOnline = () => {
      // O cliente Supabase já tenta reconectar sozinho, mas forçamos um "kick".
      try {
        supabase.realtime?.connect?.();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Limpa cache de IDs vistos quando passa de 1000 (evita memory leak)
  useEffect(() => {
    const t = window.setInterval(() => {
      if (seenLeadsRef.current.size > 1000) seenLeadsRef.current.clear();
      if (seenMessagesRef.current.size > 1000) seenMessagesRef.current.clear();
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  return {
    prefs,
    setPrefs,
    latestNewLeadId,
    latestNewMessageId,
    unseenCount,
    connected,
    acknowledge,
    playSoundOnce,
    // Helpers para preview no painel de configurações
    previewLead: () => playSoundOnce(prefs.leadSound),
    previewMessage: () => playSoundOnce(prefs.messageSound),
  };
}

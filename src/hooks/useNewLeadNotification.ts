import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SOUND_URL = "/sounds/notification.wav";

interface UseNewLeadNotificationOptions {
  enabled?: boolean;
  onNewLead?: (lead: any) => void;
}

/**
 * Hook que escuta INSERTs em tempo real na tabela `leads` via Supabase Realtime,
 * toca um som de notificação e expõe o id do último lead novo (para destaque visual).
 *
 * Estratégia para autoplay:
 *  - Pré-carrega o Audio em uma ref
 *  - Tenta um play() silenciado no primeiro clique/keydown do usuário para
 *    "destravar" a permissão de autoplay no browser.
 */
export function useNewLeadNotification({
  enabled = true,
  onNewLead,
}: UseNewLeadNotificationOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [latestNewLeadId, setLatestNewLeadId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Cria o Audio uma única vez
  useEffect(() => {
    const a = new Audio(SOUND_URL);
    a.preload = "auto";
    a.volume = 0.7;
    audioRef.current = a;
  }, []);

  // Destrava autoplay no primeiro gesto do usuário
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current || !audioRef.current) return;
      const a = audioRef.current;
      const prev = a.volume;
      a.volume = 0;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.volume = prev;
          unlockedRef.current = true;
        })
        .catch(() => {
          a.volume = prev;
        });
    };
    window.addEventListener("click", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
    window.addEventListener("touchstart", unlock, { once: false });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playSound = useCallback(() => {
    const a = audioRef.current;
    if (!a || !soundEnabled) return;
    try {
      a.currentTime = 0;
      void a.play().catch((err) => {
        console.warn("[useNewLeadNotification] autoplay bloqueado:", err);
      });
    } catch (err) {
      console.warn("[useNewLeadNotification] erro ao tocar som:", err);
    }
  }, [soundEnabled]);

  // Listener Realtime
  useEffect(() => {
    if (!enabled) return;

    console.log("[useNewLeadNotification] inscrevendo no canal realtime de leads");

    const channel = supabase
      .channel("realtime-new-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead: any = payload.new;
          if (!lead?.id) return;

          // Evita duplicidade caso o evento chegue 2x
          if (seenIdsRef.current.has(lead.id)) return;
          seenIdsRef.current.add(lead.id);

          console.log("[useNewLeadNotification] novo lead:", lead.id, lead.name);

          playSound();
          setLatestNewLeadId(lead.id);

          toast({
            title: "🔔 Novo lead recebido!",
            description: `${lead.name || "Visitante"} ${lead.phone ? "• " + lead.phone : ""}`,
          });

          onNewLead?.(lead);
        }
      )
      .subscribe((status) => {
        console.log("[useNewLeadNotification] status canal:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, playSound, onNewLead]);

  return {
    latestNewLeadId,
    clearLatestNewLeadId: () => setLatestNewLeadId(null),
    soundEnabled,
    setSoundEnabled,
    playSound,
  };
}

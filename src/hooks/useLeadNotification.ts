import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Base64 encoded short notification sound (beep)
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVocEpfR6bpxMQQml8rrw31NHBCb0O21eFQPD5fQ77t9VQ0Pm87utXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwP';

interface LeadPayload {
  id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
}

export function useLeadNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialLoadRef = useRef(true);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
    audioRef.current.volume = 0.5; // 50% volume for discrete notification
    
    // Mark initial load as complete after a short delay
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Browser may block autoplay, silently handle
        console.log('Audio playback blocked:', err);
      });
    }
  }, []);

  // Subscribe to realtime INSERT events on leads table
  useEffect(() => {
    const channel = supabase
      .channel('leads-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          // Skip notification during initial load to avoid false positives
          if (isInitialLoadRef.current) return;

          const newLead = payload.new as LeadPayload;
          
          // Play notification sound
          playNotificationSound();

          // Show toast notification
          toast({
            title: '🔔 Novo Lead!',
            description: `${newLead.name || 'Novo contato'} - ${newLead.phone || 'Sem telefone'}`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);
}

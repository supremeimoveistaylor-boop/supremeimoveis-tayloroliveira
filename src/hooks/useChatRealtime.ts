import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

interface UseChatRealtimeReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<boolean>;
  reconnect: () => void;
}

const CHAT_FUNCTION_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/send-chat-message";

export function useChatRealtime(): UseChatRealtimeReturn {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load message history
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Using raw query since the table was just created and types not regenerated
      const { data, error: fetchError } = await supabase
        .from("general_chat_messages" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100) as { data: ChatMessage[] | null; error: any };

      if (fetchError) {
        console.error("Error loading chat history:", fetchError);
        setError("Erro ao carregar histórico");
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error("Error in loadHistory:", err);
      setError("Erro ao carregar histórico");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  const subscribe = useCallback(() => {
    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log("Subscribing to chat realtime...");

    const channel = supabase
      .channel("general_chat_room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "general_chat_messages",
        },
        (payload) => {
          console.log("New message received:", payload.new);
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "general_chat_messages",
        },
        (payload) => {
          console.log("Message deleted:", payload.old);
          const deletedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
          // Auto-reconnect after 3 seconds
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...");
            subscribe();
          }, 3000);
        }
      });

    channelRef.current = channel;
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    subscribe();
    loadHistory();
  }, [subscribe, loadHistory]);

  // Send message via edge function
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (!user || !session) {
        setError("Você precisa estar logado");
        return false;
      }

      const trimmedMessage = message.trim();
      if (!trimmedMessage || trimmedMessage.length > 1000) {
        setError("Mensagem inválida");
        return false;
      }

      try {
        const response = await fetch(CHAT_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: trimmedMessage,
            user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Erro ao enviar mensagem");
          return false;
        }

        setError(null);
        return true;
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Erro de conexão");
        return false;
      }
    },
    [user, session]
  );

  // Initialize on mount
  useEffect(() => {
    loadHistory();
    subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadHistory, subscribe]);

  return {
    messages,
    isLoading,
    isConnected,
    error,
    sendMessage,
    reconnect,
  };
}

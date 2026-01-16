import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle, X, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RealEstateChatProps {
  propertyId?: string;
  propertyName?: string;
  origin?: string;
}

const CHAT_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real-estate-chat`;

export const RealEstateChat = ({ propertyId, propertyName, origin }: RealEstateChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Iniciar conversa automaticamente ao abrir
  const startConversation = useCallback(async () => {
    if (hasStarted) return;
    setHasStarted(true);
    setIsLoading(true);

    try {
      // Buscar mensagem de abertura da IA
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc`,
        },
        body: JSON.stringify({
          messages: [],
          propertyId,
          propertyName,
          pageUrl: window.location.href,
          origin: origin || "Direto",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao iniciar conversa");
      }

      // Capturar leadId do header
      const responseLeadId = response.headers.get("X-Lead-Id");
      if (responseLeadId) {
        setLeadId(responseLeadId);
      }

      // Processar stream
      await processStream(response, "");
    } catch (error) {
      console.error("Erro ao iniciar:", error);
      // Fallback para mensagem padrão
      setMessages([{
        id: "1",
        role: "assistant",
        content: propertyName 
          ? `Olá 😊 Vi que você está olhando o imóvel ${propertyName}. Posso te ajudar com alguma informação?`
          : "Olá 😊 Seja bem-vindo(a)! Posso te ajudar a encontrar um imóvel ideal para você?",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [hasStarted, propertyId, propertyName, origin]);

  useEffect(() => {
    if (isOpen && !hasStarted) {
      startConversation();
    }
  }, [isOpen, hasStarted, startConversation]);

  const processStream = async (response: Response, userContent: string) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    // Adicionar mensagem do assistente vazia para streaming
    const assistantMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => prev.map(m => 
              m.id === assistantMsgId 
                ? { ...m, content: assistantContent }
                : m
            ));
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Salvar resposta do assistente no banco
    if (leadId && assistantContent) {
      await supabase.from("chat_messages").insert({
        lead_id: leadId,
        role: "assistant",
        content: assistantContent,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          leadId,
          propertyId,
          propertyName,
          pageUrl: window.location.href,
          origin: origin || "Direto",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar mensagem");
      }

      // Capturar leadId se ainda não tiver
      const responseLeadId = response.headers.get("X-Lead-Id");
      if (responseLeadId && !leadId) {
        setLeadId(responseLeadId);
      }

      await processStream(response, inputMessage);
    } catch (error) {
      console.error("Erro ao enviar:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Desculpe, tive um problema técnico. Pode tentar novamente?",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-6 left-6 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg cursor-pointer z-50 flex items-center gap-2"
        onClick={() => setIsMinimized(false)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Chat</span>
        {messages.length > 0 && (
          <span className="bg-primary-foreground/20 rounded-full px-2 py-0.5 text-xs">
            {messages.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 w-[380px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-background rounded-2xl shadow-2xl flex flex-col z-50 border">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold">S</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Supreme Imóveis</h3>
            <p className="text-xs opacity-80">
              {isLoading ? "Digitando..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[85%] p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span
                className={`text-xs mt-1 block ${
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {formatTime(message.timestamp)}
              </span>
            </Card>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <Card className="bg-card p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background rounded-b-2xl">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RealEstateChat;

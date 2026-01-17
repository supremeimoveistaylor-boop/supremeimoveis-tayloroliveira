import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle, X, Minimize2, History, Image, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
  timestamp: Date;
  imageUrl?: string;
}

interface RealEstateChatProps {
  propertyId?: string;
  propertyName?: string;
  origin?: string;
}

const CHAT_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real-estate-chat`;
const LEAD_STORAGE_KEY = "supreme_chat_lead_id";
const SUPABASE_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co";

export const RealEstateChat = ({ propertyId, propertyName, origin }: RealEstateChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; file: File } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar leadId do localStorage ao iniciar
  useEffect(() => {
    const storedLeadId = localStorage.getItem(LEAD_STORAGE_KEY);
    if (storedLeadId) {
      setLeadId(storedLeadId);
    }
  }, []);

  // Salvar leadId no localStorage quando mudar
  useEffect(() => {
    if (leadId) {
      localStorage.setItem(LEAD_STORAGE_KEY, leadId);
    }
  }, [leadId]);

  // Carregar histórico de mensagens do banco
  const loadChatHistory = useCallback(async (currentLeadId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("lead_id", currentLeadId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar histórico:", error);
        return false;
      }

      if (data && data.length > 0) {
        const historyMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(historyMessages);
        setHasHistory(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      return false;
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Iniciar conversa automaticamente ao abrir
  const startConversation = useCallback(async () => {
    if (hasStarted) return;
    setHasStarted(true);

    // Se já tem leadId, tentar carregar histórico primeiro
    if (leadId) {
      const hasLoadedHistory = await loadChatHistory(leadId);
      if (hasLoadedHistory) {
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc`,
        },
        body: JSON.stringify({
          messages: [],
          leadId,
          propertyId,
          propertyName,
          pageUrl: window.location.href,
          origin: origin || "Direto",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao iniciar conversa");
      }

      const responseLeadId = response.headers.get("X-Lead-Id");
      if (responseLeadId) {
        setLeadId(responseLeadId);
      }

      await processStream(response, "", responseLeadId || leadId);
    } catch (error) {
      console.error("Erro ao iniciar:", error);
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
  }, [hasStarted, propertyId, propertyName, origin, leadId, loadChatHistory]);

  useEffect(() => {
    if (isOpen && !hasStarted) {
      startConversation();
    }
  }, [isOpen, hasStarted, startConversation]);

  const processStream = async (response: Response, userContent: string, currentLeadId: string | null) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

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

    if (currentLeadId && assistantContent) {
      await supabase.from("chat_messages").insert({
        lead_id: currentLeadId,
        role: "assistant",
        content: assistantContent,
      });
    }
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const fileName = `chat/${leadId || "anonymous"}/${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        alert("Erro ao enviar imagem. Tente novamente.");
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(data.path);

      setPendingImage({ url: urlData.publicUrl, file });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao enviar imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !pendingImage) || isLoading) return;

    // Build message content
    let messageContent: string | MessageContent[] = inputMessage.trim();
    let displayContent = inputMessage.trim();
    let imageUrl: string | undefined;

    if (pendingImage) {
      imageUrl = pendingImage.url;
      const contentParts: MessageContent[] = [];
      
      if (inputMessage.trim()) {
        contentParts.push({ type: "text", text: inputMessage.trim() });
      }
      
      contentParts.push({
        type: "image_url",
        image_url: { url: pendingImage.url }
      });
      
      messageContent = contentParts;
      displayContent = inputMessage.trim() || "[Imagem enviada]";
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      imageUrl,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setPendingImage(null);
    setIsLoading(true);

    try {
      // Build messages array for API
      const apiMessages = [...messages, { role: "user", content: messageContent }].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc`,
        },
        body: JSON.stringify({
          messages: apiMessages,
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

      const responseLeadId = response.headers.get("X-Lead-Id");
      if (responseLeadId && !leadId) {
        setLeadId(responseLeadId);
      }

      await processStream(response, inputMessage, responseLeadId || leadId);
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

  const handleNewConversation = () => {
    localStorage.removeItem(LEAD_STORAGE_KEY);
    setLeadId(null);
    setMessages([]);
    setHasStarted(false);
    setHasHistory(false);
    setPendingImage(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTextContent = (content: string | MessageContent[]): string => {
    if (typeof content === "string") return content;
    const textPart = content.find(c => c.type === "text");
    return textPart?.text || "";
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
              {isLoading ? "Digitando..." : isLoadingHistory ? "Carregando histórico..." : hasHistory ? "Conversa retomada" : "Online"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {hasHistory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleNewConversation}
              title="Nova conversa"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
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

      {/* History indicator */}
      {hasHistory && (
        <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground text-center border-b">
          📜 Histórico de conversa carregado
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            </div>
          </div>
        ) : (
          <>
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
                  {/* Show image if present */}
                  {message.imageUrl && (
                    <img 
                      src={message.imageUrl} 
                      alt="Imagem enviada" 
                      className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-cover"
                    />
                  )}
                  <p className="text-sm whitespace-pre-wrap">
                    {typeof message.content === "string" ? message.content : getTextContent(message.content)}
                  </p>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="relative inline-block">
            <img 
              src={pendingImage.url} 
              alt="Preview" 
              className="h-16 w-auto rounded-lg object-cover"
            />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-background rounded-b-2xl">
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Image upload button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isLoadingHistory || isUploading}
            className="shrink-0"
            title="Enviar imagem"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pendingImage ? "Adicione uma legenda..." : "Digite sua mensagem..."}
            disabled={isLoading || isLoadingHistory}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !pendingImage) || isLoading || isLoadingHistory}
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

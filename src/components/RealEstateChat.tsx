import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle, X, Minimize2, History, Loader2, Paperclip, FileText, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log("Audio not supported");
  }
};

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Attachment {
  type: "image" | "document";
  url: string;
  name: string;
  mimeType: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
  timestamp: Date;
  attachment?: Attachment;
}

interface RealEstateChatProps {
  propertyId?: string;
  propertyName?: string;
  origin?: string;
}

const CHAT_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real-estate-chat`;
const LEAD_STORAGE_KEY = "supreme_chat_lead_id";

// Allowed file types
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const ALL_ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

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
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const storedLeadId = localStorage.getItem(LEAD_STORAGE_KEY);
    if (storedLeadId) {
      setLeadId(storedLeadId);
    }
  }, []);

  useEffect(() => {
    if (leadId) {
      localStorage.setItem(LEAD_STORAGE_KEY, leadId);
    }
  }, [leadId]);

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

  const startConversation = useCallback(async () => {
    if (hasStarted) return;
    setHasStarted(true);

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

      await processStream(response, responseLeadId || leadId);
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

  const processStream = async (response: Response, currentLeadId: string | null) => {
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

    // Play notification sound when message is complete
    if (assistantContent && soundEnabled) {
      playNotificationSound();
    }

    if (currentLeadId && assistantContent) {
      await supabase.from("chat_messages").insert({
        lead_id: currentLeadId,
        role: "assistant",
        content: assistantContent,
      });
    }
  };

  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "FILE";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      alert("Formato não suportado. Use imagens (JPG, PNG, WebP, GIF) ou documentos (PDF, DOC, DOCX, XLS, XLSX, TXT).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const fileName = `chat/${leadId || "anonymous"}/${timestamp}.${ext}`;

      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        alert("Erro ao enviar arquivo. Tente novamente.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(data.path);

      const isImage = IMAGE_TYPES.includes(file.type);
      
      setPendingAttachment({
        type: isImage ? "image" : "document",
        url: urlData.publicUrl,
        name: file.name,
        mimeType: file.type,
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !pendingAttachment) || isLoading) return;

    let messageContent: string | MessageContent[] = inputMessage.trim();
    let displayContent = inputMessage.trim();

    if (pendingAttachment) {
      if (pendingAttachment.type === "image") {
        const contentParts: MessageContent[] = [];
        
        if (inputMessage.trim()) {
          contentParts.push({ type: "text", text: inputMessage.trim() });
        }
        
        contentParts.push({
          type: "image_url",
          image_url: { url: pendingAttachment.url }
        });
        
        messageContent = contentParts;
        displayContent = inputMessage.trim() || "[Imagem enviada]";
      } else {
        // For documents, append file info to text message
        const docInfo = `[Documento anexado: ${pendingAttachment.name}]`;
        displayContent = inputMessage.trim() ? `${inputMessage.trim()}\n${docInfo}` : docInfo;
        messageContent = displayContent;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      attachment: pendingAttachment || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setPendingAttachment(null);
    setIsLoading(true);

    try {
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

      await processStream(response, responseLeadId || leadId);
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
    setPendingAttachment(null);
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

  const renderAttachment = (attachment: Attachment) => {
    if (attachment.type === "image") {
      return (
        <img 
          src={attachment.url} 
          alt={attachment.name} 
          className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-cover cursor-pointer"
          onClick={() => window.open(attachment.url, "_blank")}
        />
      );
    }

    return (
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-2 hover:bg-muted transition-colors"
      >
        <FileText className="h-8 w-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">{getFileExtension(attachment.name)}</p>
        </div>
      </a>
    );
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
              {isLoading ? "Digitando..." : isLoadingHistory ? "Carregando..." : hasHistory ? "Conversa retomada" : "Online"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
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

      {hasHistory && (
        <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground text-center border-b">
          📜 Histórico carregado
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
                  {message.attachment && renderAttachment(message.attachment)}
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

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="relative inline-block">
            {pendingAttachment.type === "image" ? (
              <img 
                src={pendingAttachment.url} 
                alt="Preview" 
                className="h-16 w-auto rounded-lg object-cover"
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-xs truncate max-w-32">{pendingAttachment.name}</span>
              </div>
            )}
            <button
              onClick={() => setPendingAttachment(null)}
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
          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isLoadingHistory || isUploading}
            className="shrink-0"
            title="Enviar arquivo"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pendingAttachment ? "Adicione uma legenda..." : "Digite sua mensagem..."}
            disabled={isLoading || isLoadingHistory}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !pendingAttachment) || isLoading || isLoadingHistory}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          📎 Imagens, PDFs, DOC, XLS até 10MB
        </p>
      </div>
    </div>
  );
};

export default RealEstateChat;

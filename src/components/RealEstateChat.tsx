import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle, X, Minimize2, History, Loader2, Paperclip, FileText, Volume2, VolumeX, Mic, Square, Smile, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { trackChatOpened, trackChatFirstMessage, trackChatNameCaptured, trackChatPhoneCaptured, trackChatLeadInterest, trackChatFinished } from "@/lib/analytics";
// Lead capture removido - extração silenciosa ativa

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

// Wave animation component for typing indicator
const TypingWaveAnimation = () => (
  <div className="flex items-center gap-1 px-2">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="w-1 rounded-full animate-pulse"
        style={{
          height: `${Math.random() * 12 + 8}px`,
          animationDelay: `${i * 0.1}s`,
          animationDuration: "0.6s",
          background: '#C6A85B',
        }}
      />
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% { transform: scaleY(0.5); }
        50% { transform: scaleY(1); }
      }
    `}</style>
  </div>
);

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Attachment {
  type: "image" | "document" | "audio";
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
  reactions?: string[];
}

// Emoji categories for picker
const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤗", "🤔", "😐", "😏"],
  gestures: ["👍", "👎", "👏", "🙌", "🤝", "👊", "✌️", "🤞", "🤟", "🤙", "👋", "🙏", "💪", "👀", "❤️", "💕", "💯", "🔥", "⭐", "✨"],
  objects: ["🏠", "🏡", "🏢", "🏗️", "🏘️", "📍", "📞", "📧", "💰", "💵", "🔑", "🚗", "📝", "📋", "📅", "🎉", "🎊", "🛏️", "🛁", "🚿"],
};

// Quick reactions for messages
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// Interface para imóveis da página de listagem
interface PageProperty {
  id: string;
  title: string;
  price: number;
  location?: string;
  property_type?: string;
}

interface RealEstateChatProps {
  propertyId?: string;
  propertyName?: string;
  origin?: string;
  pageProperties?: PageProperty[]; // Lista de imóveis da página atual (para contexto de listagem)
  pageContext?: string; // Contexto da página (ex: "casas em condomínio", "apartamentos para alugar")
}

const CHAT_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real-estate-chat`;
const LEADS_URL = `https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real_estate_leads`;
const LEAD_STORAGE_KEY = "supreme_chat_lead_id";
const AUTO_OPEN_STORAGE_KEY = "supreme_chat_auto_opened";
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

const SESSION_STORAGE_KEY = "supreme_chat_session_id";

export const RealEstateChat = ({ propertyId, propertyName, origin, pageProperties, pageContext }: RealEstateChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishSummary, setFinishSummary] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  // Extração silenciosa de dados do lead
  const [clientName, setClientName] = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [storeInterest, setStoreInterest] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState<number>(50);
  const [leadSaveAttempted, setLeadSaveAttempted] = useState(false);
  const leadScoreRef = useRef<number>(50);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    // Recuperar score salvo
    try {
      const storedScore = localStorage.getItem("supreme_chat_lead_score");
      if (storedScore) {
        const parsed = parseInt(storedScore, 10);
        if (!isNaN(parsed)) { setLeadScore(parsed); leadScoreRef.current = parsed; }
      }
    } catch (_) {}
  }, []);

  // Auto-open chat apenas 1x na primeira visita (armazenado em localStorage)
  useEffect(() => {
    const hasAutoOpened = localStorage.getItem(AUTO_OPEN_STORAGE_KEY) === 'true';
    
    if (!hasAutoOpened) {
      const autoOpenTimer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(AUTO_OPEN_STORAGE_KEY, 'true');
      }, 7000);
      
      return () => clearTimeout(autoOpenTimer);
    }
  }, []);

  useEffect(() => {
    if (leadId) {
      localStorage.setItem(LEAD_STORAGE_KEY, leadId);
    }
  }, [leadId]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

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

  // Extração silenciosa de nome
  const extractNameFromText = useCallback((text: string): string | null => {
    const patterns = [
      /(?:meu nome [eé]|me chamo|sou o?a?\s*)\s*([A-Za-zÀ-ÿ]+)/i,
      /(?:pode me chamar de|chamo[- ]me)\s+([A-Za-zÀ-ÿ]+)/i,
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match?.[1] && match[1].length >= 2) return match[1].trim();
    }
    return null;
  }, []);

  // Extração silenciosa de telefone
  const extractPhoneFromText = useCallback((text: string): string | null => {
    const phonePattern = /(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[\s-]?\d{4}/g;
    const match = text.match(phonePattern);
    if (match) {
      const digits = match[0].replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 11) return digits;
    }
    const allDigits = text.replace(/\D/g, "");
    if (allDigits.length >= 10 && allDigits.length <= 11) return allDigits;
    return null;
  }, []);

  // Extração silenciosa de tipo de imóvel
  const extractPropertyTypeFromText = useCallback((text: string): string | null => {
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mappings: { keywords: string[]; value: string }[] = [
      { keywords: ["apartamento", "ape", "ap ", "apto"], value: "Apartamento" },
      { keywords: ["casa em condominio", "condominio fechado"], value: "Casa em condomínio" },
      { keywords: ["casa"], value: "Casa" },
      { keywords: ["terreno", "lote"], value: "Terreno" },
      { keywords: ["sala comercial", "sala"], value: "Sala comercial" },
      { keywords: ["loja"], value: "Loja" },
      { keywords: ["galpao", "barracao"], value: "Galpão" },
      { keywords: ["kitnet", "studio", "kitnete", "estudio"], value: "Kitnet / Studio" },
      { keywords: ["fazenda", "sitio", "chacara", "rural"], value: "Fazenda / Sítio / Chácara" },
    ];
    for (const m of mappings) {
      for (const kw of m.keywords) {
        if (lower.includes(kw)) return m.value;
      }
    }
    return null;
  }, []);

  // Extração de interesse em loja
  const extractStoreInterest = useCallback((text: string): string | null => {
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const storeKeywords = ["loja", "ponto comercial", "espaco comercial", "comercio"];
    for (const kw of storeKeywords) {
      if (lower.includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
    return null;
  }, []);

  // Análise de sentimento para scoring
  const analyzeSentiment = useCallback((text: string): number => {
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const veryPositive = [
      "quero comprar agora", "fechar negocio", "vou comprar", "quero assinar",
      "onde assino", "pode fechar", "fechado", "vamos fechar", "quero ja",
      "excelente", "perfeito", "maravilhoso", "amei", "sensacional",
      "quero agendar visita", "quando posso visitar", "vou visitar"
    ];
    const positive = [
      "gostei", "interessante", "quero saber mais", "me interessa",
      "pode enviar", "quero ver", "bom", "legal", "otimo", "bacana",
      "show", "top", "massa", "pode ser", "tenho interesse",
      "quanto custa", "qual o valor", "tem disponivel", "aceita proposta"
    ];
    const negative = [
      "nao gostei", "caro", "muito caro", "nao tenho interesse",
      "nao quero", "desisto", "esquece", "nao preciso",
      "ruim", "horrivel", "pessimo", "nao vale", "absurdo"
    ];
    const veryNegative = [
      "nunca mais", "cancelar", "reclamar", "processo",
      "denuncia", "vergonha", "fraude", "golpe", "enganacao",
      "nao me ligue", "pare de me", "nao entre em contato"
    ];

    for (const kw of veryPositive) { if (lower.includes(kw)) return 15; }
    for (const kw of veryNegative) { if (lower.includes(kw)) return -20; }
    for (const kw of positive) { if (lower.includes(kw)) return 10; }
    for (const kw of negative) { if (lower.includes(kw)) return -10; }

    return 0; // Neutro
  }, []);

  // Atualizar score com limites
  const updateLeadScore = useCallback((delta: number) => {
    if (delta === 0) return;
    const newScore = Math.max(0, Math.min(100, leadScoreRef.current + delta));
    leadScoreRef.current = newScore;
    setLeadScore(newScore);
    try { localStorage.setItem("supreme_chat_lead_score", String(newScore)); } catch (_) {}
    console.log(`[Chat] 📊 Lead score: ${newScore} (${delta > 0 ? "+" : ""}${delta})`);
  }, []);

  // Salvar lead silenciosamente quando nome + telefone disponíveis
  const saveLeadSilently = useCallback(async (name: string, phone: string) => {
    if (leadSaveAttempted) return;
    setLeadSaveAttempted(true);
    try {
      const response = await fetch(LEADS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: name, clientPhone: phone, origin: "Chat" }),
      });
      const json = await response.json().catch(() => ({} as any));
      if (response.ok && json?.leadId) {
        setLeadId(json.leadId);
        localStorage.setItem(LEAD_STORAGE_KEY, json.leadId);
        console.log("[Chat] ✅ Lead salvo silenciosamente:", json.leadId);
      }
    } catch (e) {
      console.error("[Chat] Erro ao salvar lead silenciosamente:", e);
      setLeadSaveAttempted(false);
    }
  }, [leadSaveAttempted]);

  // Função de extração silenciosa + scoring chamada a cada mensagem do usuário
  const silentExtract = useCallback((text: string) => {
    try {
      let currentName = clientName;
      let currentPhone = clientPhone;
      const hadName = !!currentName;
      const hadPhone = !!currentPhone;

      if (!currentName) {
        const name = extractNameFromText(text);
        if (name) { setClientName(name); currentName = name; }
      }
      if (!currentPhone) {
        const phone = extractPhoneFromText(text);
        if (phone) { setClientPhone(phone); currentPhone = phone; }
      }
      if (!propertyType) {
        const pt = extractPropertyTypeFromText(text);
        if (pt) setPropertyType(pt);
      }
      if (!storeInterest) {
        const si = extractStoreInterest(text);
        if (si) setStoreInterest(si);
      }

      // Track name/phone capture
      if (!hadName && currentName) trackChatNameCaptured();
      if (!hadPhone && currentPhone) trackChatPhoneCaptured();

      // Track interests
      const lower = text.toLowerCase();
      if (lower.match(/\b(luxo|alto padr[aã]o|acima de 2|milh[oõ]es)\b/)) trackChatLeadInterest('luxo');
      else if (lower.match(/\b(condom[ií]nio fechado|condominio)\b/)) trackChatLeadInterest('condominio_fechado');
      else if (lower.match(/\b(financ|parcela|entrada|fgts)\b/)) trackChatLeadInterest('financiamento');
      else if (lower.match(/\b(at[eé] 800|500 mil|600 mil|700 mil)\b/)) trackChatLeadInterest('economico');

      // Análise de sentimento → atualizar score
      const scoreDelta = analyzeSentiment(text);
      updateLeadScore(scoreDelta);

      if (currentName && currentPhone) {
        saveLeadSilently(currentName, currentPhone);
      }
    } catch (_) {}
  }, [clientName, clientPhone, propertyType, storeInterest, extractNameFromText, extractPhoneFromText, extractPropertyTypeFromText, extractStoreInterest, analyzeSentiment, updateLeadScore, saveLeadSilently]);

  const startConversation = useCallback(async (overrideLeadId?: string) => {
    if (hasStarted) return;

    const effectiveLeadId = overrideLeadId ?? leadId;

    // Sem leadId, iniciar sem histórico (extração silenciosa coletará dados)

    setHasStarted(true);

    if (effectiveLeadId) {
      const hasLoadedHistory = await loadChatHistory(effectiveLeadId);
      if (hasLoadedHistory) {
        await createOrGetSession(effectiveLeadId);
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
          leadId: effectiveLeadId,
          propertyId,
          propertyName,
          pageUrl: window.location.href,
          origin: origin || "Direto",
          pageProperties: pageProperties?.slice(0, 10),
          pageContext,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          skipLeadCreation: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao iniciar conversa");
      }

      // Criar sessão de chat com atribuição automática de atendente
      await createOrGetSession(effectiveLeadId);

      await processStream(response, effectiveLeadId);
    } catch (error) {
      console.error("Erro ao iniciar:", error);
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: propertyName
            ? `Olá 😊 Vi que você está olhando o imóvel ${propertyName}. Posso te ajudar com alguma informação?\n\nComo posso te chamar?`
            : "Olá 😊 Seja bem-vindo(a) à Supreme Empreendimentos!\n\nComo posso te chamar?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [hasStarted, leadId, loadChatHistory, propertyId, propertyName, origin, pageProperties, pageContext, clientName, clientPhone]);
  useEffect(() => {
    if (isOpen && !hasStarted) {
      trackChatOpened('react_component');
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const fileName = `chat/${leadId || "anonymous"}/${timestamp}.webm`;

      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, audioBlob, {
          cacheControl: "3600",
          contentType: "audio/webm",
        });

      if (error) {
        console.error("Upload error:", error);
        alert("Erro ao enviar áudio. Tente novamente.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(data.path);

      setPendingAttachment({
        type: "audio",
        url: urlData.publicUrl,
        name: `audio_${timestamp}.webm`,
        mimeType: "audio/webm",
      });

      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao enviar áudio. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

    // Track first user message
    if (messages.filter(m => m.role === 'user').length === 0) {
      trackChatFirstMessage();
    }

    // Extração silenciosa de dados do lead
    if (inputMessage.trim()) {
      silentExtract(inputMessage.trim());
    }

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
      } else if (pendingAttachment.type === "audio") {
        // For audio, append audio info to text message
        const audioInfo = "[🎤 Mensagem de voz]";
        displayContent = inputMessage.trim() ? `${inputMessage.trim()}\n${audioInfo}` : audioInfo;
        messageContent = displayContent;
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
          pageProperties: pageProperties?.slice(0, 10),
          pageContext,
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
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setLeadId(null);
    setSessionId(null);
    setMessages([]);
    setHasStarted(false);
    setHasHistory(false);
    setPendingAttachment(null);
  };

  // Criar ou recuperar sessão de chat
  const createOrGetSession = async (currentLeadId: string) => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    
    if (storedSessionId) {
      // Verificar se a sessão ainda está ativa
      const { data: existingSession } = await supabase
        .from("chat_sessions")
        .select("id, status")
        .eq("id", storedSessionId)
        .eq("status", "active")
        .maybeSingle();
      
      if (existingSession) {
        setSessionId(storedSessionId);
        return storedSessionId;
      }
    }

    // Criar nova sessão com atribuição round-robin
    const { data: attendantId } = await supabase.rpc("assign_attendant_round_robin");
    
    const { data: newSession, error } = await supabase
      .from("chat_sessions")
      .insert({
        lead_id: currentLeadId,
        attendant_id: attendantId,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar sessão:", error);
      return null;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
    setSessionId(newSession.id);
    return newSession.id;
  };

  // Finalizar atendimento e enviar para WhatsApp
  const handleFinishAttendance = async () => {
    if (!sessionId) {
      console.error("Nenhuma sessão ativa");
      return;
    }

    setIsFinishing(true);

    try {
      const { data: result, error } = await supabase.rpc("finish_chat_session", {
        p_session_id: sessionId,
        p_summary: finishSummary || "Atendimento finalizado pelo chat",
      });

      if (error) throw error;

      const resultData = result as any;

      if (!resultData?.success) {
        throw new Error(resultData?.error || "Erro ao finalizar sessão");
      }

      // Gerar mensagem para WhatsApp
      const whatsappMessage = `📩 NOVO LEAD DO CHAT

👤 Cliente: ${resultData.lead_name}
📱 Telefone: ${resultData.lead_phone}
📧 Email: ${resultData.lead_email || "Não informado"}
🎯 Interesse: ${resultData.lead_intent || "Não informado"}
💬 Mensagens trocadas: ${resultData.message_count}

📝 Resumo: ${resultData.summary}

➡️ Continuar atendimento pelo WhatsApp.`;

      // Marcar WhatsApp como enviado
      await supabase
        .from("chat_sessions")
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Abrir WhatsApp se tiver telefone do atendente
      if (resultData.attendant_phone) {
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/${resultData.attendant_phone.replace(/\D/g, "")}?text=${encodedMessage}`;
        window.open(whatsappUrl, "_blank");
      }

      // Limpar sessão local e iniciar nova conversa
      setShowFinishDialog(false);
      setFinishSummary("");
      handleNewConversation();

      // Adicionar mensagem de despedida
      setMessages([{
        id: Date.now().toString(),
        role: "assistant",
        content: "Obrigado pelo seu contato! 😊 Um de nossos corretores entrará em contato com você em breve pelo WhatsApp. Até logo!",
        timestamp: new Date(),
      }]);
      setHasStarted(true);

    } catch (error) {
      console.error("Erro ao finalizar atendimento:", error);
    } finally {
      setIsFinishing(false);
    }
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

  const insertEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const currentReactions = msg.reactions || [];
        const hasReaction = currentReactions.includes(emoji);
        return {
          ...msg,
          reactions: hasReaction 
            ? currentReactions.filter(r => r !== emoji)
            : [...currentReactions, emoji]
        };
      }
      return msg;
    }));
    setActiveReactionMsgId(null);
  };

  const EmojiPicker = () => (
    <div className="w-64 max-h-48 overflow-y-auto p-2">
      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
        <div key={category} className="mb-2">
          <p className="text-xs text-muted-foreground capitalize mb-1">{category}</p>
          <div className="flex flex-wrap gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const ReactionPicker = ({ messageId }: { messageId: string }) => (
    <div className="flex gap-1 bg-background shadow-lg rounded-full px-2 py-1 border">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(messageId, emoji)}
          className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-sm"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

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

    if (attachment.type === "audio") {
      return (
        <div className="mb-2">
          <audio src={attachment.url} controls className="w-full h-10" />
        </div>
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
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-[56px] w-[56px] rounded-[18px] z-[9999] flex items-center justify-center transition-all duration-500 ease-out hover:scale-105 hover:shadow-[0_8px_30px_rgba(198,165,91,0.5)]"
        style={{
          background: 'linear-gradient(135deg, #C6A85B, #D4B86A)',
          boxShadow: '0 6px 24px rgba(198,165,91,0.4)',
        }}
        title="Especialista Imobiliário"
      >
        <MessageCircle className="h-6 w-6 text-[#111]" strokeWidth={2.2} />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-6 right-6 rounded-[16px] px-4 py-3 cursor-pointer z-[9999] flex items-center gap-2 transition-all duration-300 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #C6A85B, #D4B86A)',
          color: '#111',
          boxShadow: '0 6px 24px rgba(198,165,91,0.4)',
        }}
        onClick={() => setIsMinimized(false)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Chat</span>
        {messages.length > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {messages.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-40px)] rounded-[20px] flex flex-col z-[9999] animate-scale-in" style={{ background: '#111111', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="p-4 rounded-t-[20px] flex items-center justify-between" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)', borderBottom: '1px solid #C6A85B' }}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#0f172a' }}>
            <img src="/images/chat-avatar.png" alt="Supreme" className="w-full h-full object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse" style={{ background: '#22c55e', border: '2px solid #C6A85B' }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#f5f5f5', letterSpacing: '0.3px' }}>Especialista Imobiliário</h3>
            <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
              {isLoading ? "Digitando..." : isLoadingHistory ? "Carregando..." : hasHistory ? "Conversa retomada" : "Atendimento Exclusivo"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            style={{ color: '#f5f5f5' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {messages.length > 2 && sessionId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-green-500/30"
              style={{ color: '#4ade80' }}
              onClick={() => setShowFinishDialog(true)}
              title="Finalizar Atendimento"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          {hasHistory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/10"
              style={{ color: '#f5f5f5' }}
              onClick={handleNewConversation}
              title="Nova conversa"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            style={{ color: '#f5f5f5' }}
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            style={{ color: '#f5f5f5' }}
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasHistory && (
        <div className="px-4 py-2 text-xs text-center" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          📜 Histórico carregado
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#0b0b0c' }}>
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
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="relative group">
                  <div
                    className="max-w-[85%] p-3 rounded-[14px] text-sm leading-relaxed"
                    style={
                      message.role === "user"
                        ? { background: 'linear-gradient(135deg, #C6A85B, #D4B86A)', color: '#111', borderBottomRightRadius: '6px' }
                        : { background: '#1C1C1C', color: '#f0f0f0', borderBottomLeftRadius: '6px' }
                    }
                    onDoubleClick={() => setActiveReactionMsgId(activeReactionMsgId === message.id ? null : message.id)}
                  >
                    {message.attachment && renderAttachment(message.attachment)}
                    <p className="text-sm whitespace-pre-wrap">
                      {typeof message.content === "string" ? message.content : getTextContent(message.content)}
                    </p>
                    <span
                      className="text-xs mt-1 block"
                      style={{ color: message.role === "user" ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)' }}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Reaction trigger button */}
                  <button
                    onClick={() => setActiveReactionMsgId(activeReactionMsgId === message.id ? null : message.id)}
                    className={`absolute -bottom-1 ${message.role === "user" ? "left-0" : "right-0"} opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow rounded-full w-6 h-6 flex items-center justify-center text-xs border`}
                  >
                    😊
                  </button>

                  {/* Reaction picker */}
                  {activeReactionMsgId === message.id && (
                    <div className={`absolute -bottom-8 ${message.role === "user" ? "right-0" : "left-0"} z-10`}>
                      <ReactionPicker messageId={message.id} />
                    </div>
                  )}
                </div>

                {/* Display reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className={`flex gap-0.5 mt-1 ${message.role === "user" ? "mr-1" : "ml-1"}`}>
                    {message.reactions.map((reaction, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-muted rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-muted/80"
                        onClick={() => toggleReaction(message.id, reaction)}
                      >
                        {reaction}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="p-3 flex items-center gap-2 rounded-[14px]" style={{ background: '#1C1C1C' }}>
                  <TypingWaveAnimation />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Digitando...</span>
                </div>
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

      {/* Audio recording preview */}
      {audioBlob && !isRecording && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAudioBlob(null)}
              className="shrink-0 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={sendVoiceMessage}
              disabled={isUploading}
              className="shrink-0 h-8 w-8"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="px-3 py-2 border-t bg-destructive/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium text-destructive">Gravando...</span>
              <span className="text-sm text-muted-foreground">{formatRecordingTime(recordingTime)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="shrink-0 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={stopRecording}
              className="shrink-0 h-8 w-8"
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 rounded-b-[20px]" style={{ background: '#111111', borderTop: '1px solid rgba(198,165,91,0.3)' }}>
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
            disabled={isLoading || isLoadingHistory || isUploading || isRecording}
            className="shrink-0 hover:bg-white/10"
            style={{ color: '#C6A85B' }}
            title="Enviar arquivo"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={isLoading || isLoadingHistory || isUploading || isRecording}
            className="shrink-0 hover:bg-white/10"
            style={{ color: '#C6A85B' }}
            title="Gravar áudio"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLoading || isLoadingHistory || isRecording}
                className="shrink-0 hover:bg-white/10"
                style={{ color: '#C6A85B' }}
                title="Emojis"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="p-0 w-auto">
              <EmojiPicker />
            </PopoverContent>
          </Popover>

          <input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={pendingAttachment ? "Adicione uma legenda..." : "Digite sua mensagem..."}
            disabled={isLoading || isLoadingHistory || isRecording}
            className="flex-1 rounded-[12px] px-3 py-2 text-sm outline-none"
            style={{ background: '#0b0b0c', border: '1px solid rgba(198,165,91,0.3)', color: '#f5f5f5' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !pendingAttachment) || isLoading || isLoadingHistory || isRecording}
            className="rounded-[12px] px-3 flex items-center justify-center disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #C6A85B, #D4B86A)', color: '#111' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          📎 Arquivos • 🎤 Áudio • 😊 Emojis • 2x toque para reagir
        </p>
      </div>

      {/* Lead capture removido - extração silenciosa ativa */}

      {/* Dialog para finalizar atendimento */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Finalizar Atendimento
            </DialogTitle>
            <DialogDescription>
              Ao finalizar, um resumo será enviado para o WhatsApp do atendente responsável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resumo do atendimento (opcional)</label>
              <Textarea
                placeholder="Ex: Cliente interessado em apartamento 2 quartos na zona sul. Quer agendar visita para sábado."
                value={finishSummary}
                onChange={(e) => setFinishSummary(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFinishDialog(false)}
              disabled={isFinishing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinishAttendance}
              disabled={isFinishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalizar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RealEstateChat;

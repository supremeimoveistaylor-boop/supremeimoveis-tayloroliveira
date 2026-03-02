import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare, Phone, Instagram, Send, Bot, User, Wifi, WifiOff,
  ArrowRight, X, Clock, RefreshCw, LayoutGrid, Search, PhoneCall,
  Video, MoreVertical, Globe, Tag, Sparkles, Pencil, Check
} from "lucide-react";

interface Conversation {
  id: string;
  user_id: string;
  lead_id: string | null;
  channel: "whatsapp" | "instagram";
  external_contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  assigned_to: string | null;
  bot_active: boolean;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  connection_id: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "client" | "agent" | "bot";
  channel: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  status: string | null;
}

function playNotification() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function resolveDisplayName(conv: Conversation): string {
  if (conv.contact_name && !/^\d+$/.test(conv.contact_name)) return conv.contact_name;
  const id = conv.external_contact_id || "0000";
  const suffix = id.slice(-4);
  return conv.channel === "instagram" ? `Instagram User #${suffix}` : `WhatsApp #${suffix}`;
}

function getInitials(name: string): string {
  return name.replace(/[@#]/g, "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const channelConfig = {
  whatsapp: { icon: Phone, color: "bg-green-500", textColor: "text-green-400", bgLight: "bg-green-500/10", label: "WhatsApp" },
  instagram: { icon: Instagram, color: "bg-gradient-to-br from-purple-500 to-pink-500", textColor: "text-pink-400", bgLight: "bg-pink-500/10", label: "Instagram" },
};

export const OmnichatInboxPanel = () => {
  const { user, session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadStatus = async () => {
      const { data } = await supabase
        .from("agent_status" as any).select("status").eq("user_id", user.id).maybeSingle();
      setIsOnline((data as any)?.status === "online");
    };
    loadStatus();
  }, [user]);

  const toggleOnline = async () => {
    if (!user) return;
    const newStatus = isOnline ? "offline" : "online";
    const { error } = await supabase
      .from("agent_status" as any)
      .upsert({ user_id: user.id, status: newStatus, last_seen: new Date().toISOString() } as any, { onConflict: "user_id" });
    if (!error) {
      setIsOnline(!isOnline);
      toast({ title: newStatus === "online" ? "🟢 Você está Online" : "🔴 Modo Offline ativado" });
    }
  };

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("omnichat_conversations" as any).select("*").order("last_message_at", { ascending: false }).limit(100) as any;
    if (!error && data) setConversations(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const channel = supabase
      .channel("omnichat_conv_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "omnichat_conversations" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newConv = payload.new as Conversation;
          setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
          playNotification();
          toast({ title: `📩 Nova conversa - ${newConv.channel}`, description: resolveDisplayName(newConv) });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Conversation;
          setConversations(prev => {
            const filtered = prev.filter(c => c.id !== updated.id);
            return [updated, ...filtered];
          });
          if (updated.unread_count > 0) playNotification();
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("omnichat_messages" as any).select("*").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200) as any;
    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    supabase.from("omnichat_conversations" as any).update({ unread_count: 0 } as any).eq("id", selectedConv.id);
  }, [selectedConv, loadMessages]);

  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel(`omnichat_msgs_${selectedConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "omnichat_messages", filter: `conversation_id=eq.${selectedConv.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || !session || isSending) return;
    setIsSending(true);
    try {
      if (selectedConv.channel === "whatsapp") {
        const res = await fetch(`https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/send-whatsapp`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: selectedConv.external_contact_id, message: newMessage.trim() }),
        });
        if (!res.ok) throw new Error("Falha ao enviar WhatsApp");
      } else {
        const res = await supabase.functions.invoke("send-instagram-message", {
          body: { recipient_id: selectedConv.external_contact_id, message: newMessage.trim(), connection_id: selectedConv.connection_id },
        });
        if (res.error) throw res.error;
      }
      await supabase.from("omnichat_messages" as any).insert({
        conversation_id: selectedConv.id, sender_type: "agent", channel: selectedConv.channel, content: newMessage.trim(), status: "sent",
      } as any);
      await supabase.from("omnichat_conversations" as any).update({
        last_message_at: new Date().toISOString(), last_message_preview: newMessage.trim().substring(0, 100), bot_active: false,
      } as any).eq("id", selectedConv.id);
      setNewMessage("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleAssume = async () => {
    if (!selectedConv || !user) return;
    await supabase.from("omnichat_conversations" as any).update({ assigned_to: user.id, bot_active: false } as any).eq("id", selectedConv.id);
    setSelectedConv(prev => prev ? { ...prev, assigned_to: user.id, bot_active: false } : null);
    toast({ title: "✅ Conversa assumida" });
  };

  const handleClose = async () => {
    if (!selectedConv) return;
    await supabase.from("omnichat_conversations" as any).update({ status: "closed" } as any).eq("id", selectedConv.id);
    setSelectedConv(null);
    loadConversations();
    toast({ title: "Conversa encerrada" });
  };

  const handleMoveToCRM = async () => {
    if (!selectedConv) return;
    try {
      const displayName = resolveDisplayName(selectedConv);
      const newCard = {
        titulo: displayName,
        cliente: displayName,
        telefone: selectedConv.contact_phone || selectedConv.external_contact_id || null,
        coluna: 'leads',
        origem_lead: `Omnichat - ${selectedConv.channel}`,
        lead_id: selectedConv.lead_id || null,
        classificacao: 'morno',
        prioridade: 'normal',
        valor_estimado: 0,
        lead_score: 0,
        probabilidade_fechamento: 0,
        historico: JSON.stringify([{ tipo: 'origem', descricao: `Importado do Omnichat (${selectedConv.channel})`, data: new Date().toISOString() }]),
        notas: `Conversa ${selectedConv.channel} com ${messages.length} mensagens.`,
      };
      const { error } = await (supabase as any).from('crm_cards').insert(newCard);
      if (error) throw error;
      toast({ title: '✅ Lead movido para o CRM Kanban', description: 'Card criado na coluna "Leads".' });
    } catch (err: any) {
      toast({ title: 'Erro ao mover para CRM', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveName = async () => {
    if (!selectedConv || !editNameValue.trim()) return;
    const newName = editNameValue.trim();
    try {
      await supabase.from("omnichat_conversations" as any).update({ contact_name: newName } as any).eq("id", selectedConv.id);
      if (selectedConv.channel === "instagram" && selectedConv.external_contact_id) {
        await supabase.from("channel_messages" as any).update({ contact_name: newName } as any).eq("contact_instagram_id", selectedConv.external_contact_id);
      }
      setSelectedConv(prev => prev ? { ...prev, contact_name: newName } : null);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, contact_name: newName } : c));
      setIsEditingName(false);
      toast({ title: "✅ Nome atualizado" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar nome", description: err.message, variant: "destructive" });
    }
  };

  const filtered = conversations
    .filter(c => channelFilter === "all" || c.channel === channelFilter)
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const name = resolveDisplayName(c).toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || c.external_contact_id.includes(searchQuery);
    });
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const selectedName = selectedConv ? resolveDisplayName(selectedConv) : "";
  const chCfg = selectedConv ? channelConfig[selectedConv.channel] : null;

  return (
    <div className="h-[calc(100vh-280px)] min-h-[600px] flex flex-col gap-3 flex-1">
      {/* ═══ Top Bar ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Omnichat</h2>
          {totalUnread > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {totalUnread} nova{totalUnread > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isOnline ? "default" : "outline"}
            onClick={toggleOnline}
            className={`rounded-full transition-all ${isOnline
              ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25"
              : "border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4 mr-1.5" /> : <WifiOff className="w-4 h-4 mr-1.5" />}
            {isOnline ? "Online" : "Offline"}
          </Button>
          <Button size="icon" variant="ghost" onClick={loadConversations} className="text-muted-foreground hover:text-foreground rounded-full">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ═══ 3-Column Layout ═══ */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">

        {/* ━━━ COLUMN 1: Conversation List ━━━ */}
        <div className="col-span-4 xl:col-span-3 bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0 rounded-xl h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
          </div>

          {/* Channel filter tabs */}
          <div className="px-3 pt-2 pb-1">
            <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as any)}>
              <TabsList className="w-full bg-muted/50 h-8 rounded-lg p-0.5">
                <TabsTrigger value="all" className="flex-1 text-xs h-7 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Todos ({conversations.length})
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex-1 text-xs h-7 rounded-md data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
                  <Phone className="w-3 h-3 mr-1" /> {conversations.filter(c => c.channel === "whatsapp").length}
                </TabsTrigger>
                <TabsTrigger value="instagram" className="flex-1 text-xs h-7 rounded-md data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-500">
                  <Instagram className="w-3 h-3 mr-1" /> {conversations.filter(c => c.channel === "instagram").length}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation items */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map(conv => {
                  const name = resolveDisplayName(conv);
                  const cfg = channelConfig[conv.channel];
                  const isActive = selectedConv?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all hover:bg-muted/50 ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className={`text-xs font-semibold ${cfg.bgLight} ${cfg.textColor}`}>
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Channel dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${cfg.color} rounded-full flex items-center justify-center ring-2 ring-card`}>
                          <cfg.icon className="w-2.5 h-2.5 text-white" />
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium text-foreground truncate">{name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview || "..."}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {conv.bot_active && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                              <Bot className="w-2.5 h-2.5" /> IA
                            </span>
                          )}
                          {conv.status === "closed" && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Fechada</span>
                          )}
                        </div>
                      </div>
                      {/* Unread badge */}
                      {conv.unread_count > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ━━━ COLUMN 2: Active Chat ━━━ */}
        <div className="col-span-5 xl:col-span-6 bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className={`text-xs font-semibold ${chCfg?.bgLight} ${chCfg?.textColor}`}>
                      {getInitials(selectedName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{selectedName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white ${chCfg?.color}`}>
                        {chCfg?.label?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv.contact_phone || selectedConv.external_contact_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedConv.bot_active && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-500/5 text-[10px] mr-2">
                      <Sparkles className="w-3 h-3 mr-1" /> IA Ativa
                    </Badge>
                  )}
                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 text-muted-foreground"><PhoneCall className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 text-muted-foreground"><Video className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 bg-muted/20">
                <div className="p-4 space-y-3">
                  {messages.map(msg => {
                    const isClient = msg.sender_type === "client";
                    const isBot = msg.sender_type === "bot";
                    return (
                      <div key={msg.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          isClient
                            ? "bg-card border border-border text-foreground rounded-bl-md"
                            : isBot
                            ? "bg-blue-500/10 text-foreground border border-blue-500/20 rounded-br-md"
                            : "bg-green-600 text-white rounded-br-md"
                        }`}>
                          {isClient && (
                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                              <User className="w-2.5 h-2.5" /> Cliente
                            </span>
                          )}
                          {isBot && (
                            <span className="text-[10px] font-medium text-blue-400 flex items-center gap-1 mb-1">
                              <Bot className="w-2.5 h-2.5" /> Assistente IA
                            </span>
                          )}
                          {msg.media_url && (
                            <img src={msg.media_url} alt="" className="max-w-full rounded-lg mb-2" />
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className={`text-[10px] mt-1.5 text-right ${isClient || isBot ? "text-muted-foreground" : "text-white/70"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex gap-2 items-center">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 rounded-xl bg-muted/50 border-0 h-10 focus-visible:ring-1 focus-visible:ring-primary/50"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={selectedConv.status === "closed"}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending || selectedConv.status === "closed"}
                    className="rounded-full h-10 w-10 bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7 opacity-40" />
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Nenhuma conversa selecionada</p>
                  <p className="text-xs text-muted-foreground mt-1">Selecione uma conversa na lista ao lado</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ━━━ COLUMN 3: Contact Details ━━━ */}
        <div className="col-span-3 bg-card border border-border rounded-2xl overflow-auto shadow-sm">
          {selectedConv ? (
            <div className="p-4 space-y-5">
              {/* Profile */}
              <div className="flex flex-col items-center text-center pt-2">
                <Avatar className="w-16 h-16 mb-3">
                  <AvatarFallback className={`text-lg font-bold ${chCfg?.bgLight} ${chCfg?.textColor}`}>
                    {getInitials(selectedName)}
                  </AvatarFallback>
                </Avatar>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 w-full max-w-[200px]">
                    <Input
                      value={editNameValue}
                      onChange={e => setEditNameValue(e.target.value)}
                      className="h-8 text-sm text-center rounded-lg"
                      autoFocus
                      onKeyDown={e => e.key === "Enter" && handleSaveName()}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-green-500" onClick={handleSaveName}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={() => setIsEditingName(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-foreground">{selectedName}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditNameValue(selectedConv.contact_name || selectedName); setIsEditingName(true); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{selectedConv.contact_phone || selectedConv.external_contact_id}</p>
                <span className={`mt-2 text-[10px] px-2.5 py-1 rounded-full font-semibold text-white ${chCfg?.color}`}>
                  {chCfg?.label?.toUpperCase()}
                </span>
              </div>

              {/* Info grid */}
              <div className="space-y-3 bg-muted/30 rounded-xl p-3">
                <DetailRow label="Canal" value={
                  <Badge className={`${chCfg?.bgLight} ${chCfg?.textColor} border-0 text-[10px]`}>{selectedConv.channel}</Badge>
                } />
                <DetailRow label="ID Externo" value={
                  <span className="text-[10px] font-mono text-muted-foreground break-all">{selectedConv.external_contact_id}</span>
                } />
                <DetailRow label="Status" value={
                  <Badge variant="outline" className={`text-[10px] ${selectedConv.status === "open" ? "text-green-400 border-green-400/30" : "text-muted-foreground border-muted"}`}>
                    {selectedConv.status === "open" ? "🟢 Aberta" : "Fechada"}
                  </Badge>
                } />
                <DetailRow label="IA Ativa" value={
                  <span className={`text-xs font-medium ${selectedConv.bot_active ? "text-blue-400" : "text-muted-foreground"}`}>
                    {selectedConv.bot_active ? "Sim" : "Não"}
                  </span>
                } />
                <DetailRow label="Mensagens" value={
                  <span className="text-xs font-medium text-foreground">{messages.length}</span>
                } />
                <DetailRow label="Criado em" value={
                  <span className="text-[10px] text-muted-foreground">{new Date(selectedConv.created_at).toLocaleString("pt-BR")}</span>
                } />
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedConv.channel}</span>
                  {selectedConv.bot_active && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">IA ativa</span>}
                  {selectedConv.status === "open" && <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">aberta</span>}
                  {selectedConv.unread_count > 0 && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">não lida</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Button size="sm" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" onClick={handleMoveToCRM}>
                  <LayoutGrid className="w-4 h-4 mr-2" /> Mover para CRM
                </Button>
                {!selectedConv.assigned_to && selectedConv.status === "open" && (
                  <Button size="sm" variant="outline" className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5" onClick={handleAssume}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Assumir Conversa
                  </Button>
                )}
                {selectedConv.status === "open" && (
                  <Button size="sm" variant="ghost" className="w-full rounded-xl text-destructive hover:bg-destructive/5" onClick={handleClose}>
                    <X className="w-4 h-4 mr-2" /> Encerrar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
              <div className="text-center space-y-2">
                <User className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">Selecione uma conversa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>
      <div className="text-right">{value}</div>
    </div>
  );
}

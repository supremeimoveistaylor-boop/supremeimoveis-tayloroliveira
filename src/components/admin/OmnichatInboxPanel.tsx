import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare, Phone, Instagram, Send, Bot, User, Wifi, WifiOff,
  ArrowRight, X, Clock, RefreshCw, Volume2, Image as ImageIcon, LayoutGrid
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

const notificationSound = typeof Audio !== "undefined" ? new Audio("data:audio/wav;base64,UklGRl9vT19teleVm...") : null;

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

export const OmnichatInboxPanel = () => {
  const { user, session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agent status
  useEffect(() => {
    if (!user) return;
    const loadStatus = async () => {
      const { data } = await supabase
        .from("agent_status" as any)
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsOnline((data as any)?.status === "online");
    };
    loadStatus();
  }, [user]);

  // Toggle online/offline
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

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("omnichat_conversations" as any)
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100) as any;
    if (!error && data) setConversations(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Realtime conversations
  useEffect(() => {
    const channel = supabase
      .channel("omnichat_conv_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "omnichat_conversations" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newConv = payload.new as Conversation;
          setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
          playNotification();
          toast({ title: `📩 Nova conversa - ${newConv.channel}`, description: newConv.contact_name || newConv.external_contact_id });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Conversation;
          setConversations(prev => {
            const filtered = prev.filter(c => c.id !== updated.id);
            return [updated, ...filtered];
          });
          if (updated.unread_count > 0) playNotification();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("omnichat_messages" as any)
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200) as any;
    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    // Mark as read
    supabase.from("omnichat_conversations" as any).update({ unread_count: 0 } as any).eq("id", selectedConv.id);
  }, [selectedConv, loadMessages]);

  // Realtime messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel(`omnichat_msgs_${selectedConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "omnichat_messages", filter: `conversation_id=eq.${selectedConv.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || !session || isSending) return;
    setIsSending(true);
    try {
      if (selectedConv.channel === "whatsapp") {
        const res = await fetch(`https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: selectedConv.external_contact_id, message: newMessage.trim() }),
        });
        if (!res.ok) throw new Error("Falha ao enviar WhatsApp");
      } else {
        const res = await supabase.functions.invoke("send-instagram-message", {
          body: { recipient_id: selectedConv.external_contact_id, message: newMessage.trim(), connection_id: selectedConv.connection_id },
        });
        if (res.error) throw res.error;
      }

      // Save agent message to omnichat_messages
      await supabase.from("omnichat_messages" as any).insert({
        conversation_id: selectedConv.id,
        sender_type: "agent",
        channel: selectedConv.channel,
        content: newMessage.trim(),
        status: "sent",
      } as any);

      // Update conversation
      await supabase.from("omnichat_conversations" as any).update({
        last_message_at: new Date().toISOString(),
        last_message_preview: newMessage.trim().substring(0, 100),
        bot_active: false,
      } as any).eq("id", selectedConv.id);

      setNewMessage("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Assume conversation
  const handleAssume = async () => {
    if (!selectedConv || !user) return;
    await supabase.from("omnichat_conversations" as any).update({
      assigned_to: user.id,
      bot_active: false,
    } as any).eq("id", selectedConv.id);
    setSelectedConv(prev => prev ? { ...prev, assigned_to: user.id, bot_active: false } : null);
    toast({ title: "✅ Conversa assumida" });
  };

  // Close conversation
  const handleClose = async () => {
    if (!selectedConv) return;
    await supabase.from("omnichat_conversations" as any).update({ status: "closed" } as any).eq("id", selectedConv.id);
    setSelectedConv(null);
    loadConversations();
    toast({ title: "Conversa encerrada" });
  };

  // Move to CRM Kanban
  const handleMoveToCRM = async () => {
    if (!selectedConv) return;
    try {
      const newCard = {
        titulo: selectedConv.contact_name || selectedConv.external_contact_id || 'Lead Omnichat',
        cliente: selectedConv.contact_name || 'Não informado',
        telefone: selectedConv.contact_phone || selectedConv.external_contact_id || null,
        coluna: 'leads',
        origem_lead: `Omnichat - ${selectedConv.channel}`,
        lead_id: selectedConv.lead_id || null,
        classificacao: 'morno',
        prioridade: 'normal',
        valor_estimado: 0,
        lead_score: 0,
        probabilidade_fechamento: 0,
        historico: JSON.stringify([{
          tipo: 'origem',
          descricao: `Importado do Omnichat (${selectedConv.channel})`,
          data: new Date().toISOString(),
        }]),
        notas: `Conversa ${selectedConv.channel} com ${messages.length} mensagens.`,
      };

      const { error } = await (supabase as any).from('crm_cards').insert(newCard);
      if (error) throw error;

      toast({ title: '✅ Lead movido para o CRM Kanban', description: `Card criado na coluna "Leads".` });
    } catch (err: any) {
      toast({ title: 'Erro ao mover para CRM', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = conversations.filter(c => channelFilter === "all" || c.channel === channelFilter);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="h-[calc(100vh-280px)] min-h-[600px] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Omnichat Inbox</h2>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 text-white">{totalUnread} novas</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isOnline ? "default" : "outline"}
            onClick={toggleOnline}
            className={isOnline ? "bg-green-600 hover:bg-green-700 text-white" : "border-slate-600 text-slate-300"}
          >
            {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
            {isOnline ? "ONLINE" : "OFFLINE"}
          </Button>
          <Button size="sm" variant="outline" onClick={loadConversations} className="border-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Channel tabs */}
      <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as any)}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
            Todos ({conversations.length})
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Phone className="w-3 h-3 mr-1" /> WhatsApp ({conversations.filter(c => c.channel === "whatsapp").length})
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
            <Instagram className="w-3 h-3 mr-1" /> Instagram ({conversations.filter(c => c.channel === "instagram").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Conversation list */}
        <div className="col-span-4 bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-8 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left p-3 hover:bg-slate-700/50 transition ${selectedConv?.id === conv.id ? "bg-slate-700/70" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${conv.channel === "whatsapp" ? "bg-green-500/20" : "bg-pink-500/20"}`}>
                        {conv.channel === "whatsapp" ? <Phone className="w-4 h-4 text-green-400" /> : <Instagram className="w-4 h-4 text-pink-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">
                            {conv.contact_name || conv.external_contact_id}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-red-500 text-white text-xs ml-1">{conv.unread_count}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.last_message_preview || "..."}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500">
                            {new Date(conv.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {conv.bot_active && <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400 px-1 py-0">IA</Badge>}
                          {conv.status === "closed" && <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-400 px-1 py-0">Fechada</Badge>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="col-span-5 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedConv.channel === "whatsapp" ? "bg-green-500/20" : "bg-pink-500/20"}`}>
                    {selectedConv.channel === "whatsapp" ? <Phone className="w-4 h-4 text-green-400" /> : <Instagram className="w-4 h-4 text-pink-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedConv.contact_name || selectedConv.external_contact_id}</p>
                    <p className="text-xs text-slate-400">{selectedConv.channel} • {selectedConv.contact_phone || selectedConv.external_contact_id}</p>
                  </div>
                </div>
                {selectedConv.bot_active && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <Bot className="w-3 h-3 mr-1" /> IA Ativa
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender_type === "client"
                          ? "bg-slate-700 text-white"
                          : msg.sender_type === "bot"
                          ? "bg-blue-600/20 text-blue-100 border border-blue-500/30"
                          : "bg-green-600/20 text-green-100 border border-green-500/30"
                      }`}>
                        <div className="flex items-center gap-1 mb-1">
                          {msg.sender_type === "client" && <User className="w-3 h-3 text-slate-400" />}
                          {msg.sender_type === "bot" && <Bot className="w-3 h-3 text-blue-400" />}
                          {msg.sender_type === "agent" && <User className="w-3 h-3 text-green-400" />}
                          <span className="text-[10px] text-slate-400">
                            {msg.sender_type === "client" ? "Cliente" : msg.sender_type === "bot" ? "IA" : "Agente"}
                          </span>
                        </div>
                        {msg.media_url && (
                          <img src={msg.media_url} alt="" className="max-w-full rounded mb-1" />
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[10px] text-slate-500 mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-slate-700">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={selectedConv.status === "closed"}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending || selectedConv.status === "closed"}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Selecione uma conversa</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Lead details */}
        <div className="col-span-3 bg-slate-800/50 border border-slate-700 rounded-lg p-4 overflow-auto">
          {selectedConv ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Detalhes</h3>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-400">Contato</p>
                  <p className="text-sm text-white">{selectedConv.contact_name || "Desconhecido"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Canal</p>
                  <Badge className={selectedConv.channel === "whatsapp" ? "bg-green-500/20 text-green-400" : "bg-pink-500/20 text-pink-400"}>
                    {selectedConv.channel}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-400">ID Externo</p>
                  <p className="text-xs text-slate-300 font-mono break-all">{selectedConv.external_contact_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <Badge variant="outline" className={selectedConv.status === "open" ? "text-green-400 border-green-500/30" : "text-slate-400 border-slate-500"}>{selectedConv.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-400">IA Ativa</p>
                  <p className="text-sm text-white">{selectedConv.bot_active ? "Sim" : "Não"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Criado em</p>
                  <p className="text-xs text-slate-300">{new Date(selectedConv.created_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-700">
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleMoveToCRM}>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Mover para CRM Kanban
                </Button>
                {!selectedConv.assigned_to && selectedConv.status === "open" && (
                  <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900" onClick={handleAssume}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Assumir Conversa
                  </Button>
                )}
                {selectedConv.status === "open" && (
                  <Button size="sm" variant="outline" className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleClose}>
                    <X className="w-4 h-4 mr-2" />
                    Encerrar Conversa
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <p>Selecione uma conversa para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

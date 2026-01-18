import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, MessageSquare, Phone, User, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  lead_id: string;
  attendant_id: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: string | null;
  whatsapp_sent: boolean;
  created_at: string;
  lead?: {
    name: string | null;
    phone: string | null;
    email: string | null;
    intent: string | null;
  };
  attendant?: {
    name: string;
    phone: string;
  };
}

export const ChatSessionsPanel = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "finished">("active");

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select(`
          *,
          lead:leads(name, phone, email, intent),
          attendant:chat_attendants(name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
      toast.error("Erro ao carregar sessões de chat");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (started: string, finished: string | null) => {
    if (!finished) return "Em andamento";
    
    const start = new Date(started);
    const end = new Date(finished);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case "finished":
        return <Badge variant="secondary">Finalizado</Badge>;
      case "transferred":
        return <Badge variant="outline">Transferido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openWhatsApp = (phone: string, leadName: string) => {
    const message = encodeURIComponent(
      `Olá! Aqui é da Supreme Imóveis. Estou dando continuidade ao atendimento de ${leadName || "seu interesse"}.`
    );
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const filteredSessions = sessions.filter(session =>
    activeTab === "active" ? session.status === "active" : session.status !== "active"
  );

  const activeSessions = sessions.filter(s => s.status === "active").length;
  const finishedSessions = sessions.filter(s => s.status === "finished").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Sessões de Chat
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{activeSessions}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{finishedSessions}</p>
              <p className="text-sm text-muted-foreground">Finalizados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {sessions.filter(s => s.whatsapp_sent).length}
              </p>
              <p className="text-sm text-muted-foreground">Enviados p/ WhatsApp</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "finished")}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Ativos ({activeSessions})</TabsTrigger>
            <TabsTrigger value="finished">Finalizados ({finishedSessions})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma sessão {activeTab === "active" ? "ativa" : "finalizada"} encontrada.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Atendente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Resumo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {session.lead?.name || "Não informado"}
                            </span>
                            {session.lead?.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {session.lead.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.attendant?.name || (
                            <span className="text-muted-foreground">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(session.started_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {calculateDuration(session.started_at, session.finished_at)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm max-w-32 truncate block">
                            {session.summary || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {session.lead?.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openWhatsApp(session.lead!.phone!, session.lead!.name!)}
                              className="gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              WhatsApp
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChatSessionsPanel;

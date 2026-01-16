import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Users, MessageSquare, Settings, Plus, Phone, Mail, 
  ArrowLeft, Eye, UserPlus, Trash2, Edit2
} from "lucide-react";

interface Broker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string;
  active: boolean;
  created_at: string;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  intent: string | null;
  origin: string | null;
  visit_requested: boolean;
  property_id: string | null;
  broker_id: string | null;
  created_at: string;
  properties?: { title: string } | null;
  brokers?: { name: string } | null;
}

interface CompanySettings {
  id: string;
  distribution_rule: string;
  default_broker_id: string | null;
}

const LeadsManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadMessages, setLeadMessages] = useState<any[]>([]);
  const [newBroker, setNewBroker] = useState({ name: "", email: "", phone: "", whatsapp: "" });
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({ title: "Acesso negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      navigate("/");
      return;
    }

    if (!authLoading && isAdmin) {
      fetchData();
    }
  }, [authLoading, isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [brokersRes, leadsRes, settingsRes] = await Promise.all([
        supabase.from("brokers").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*, properties(title), brokers(name)").order("created_at", { ascending: false }),
        supabase.from("company_settings").select("*").single(),
      ]);

      if (brokersRes.data) setBrokers(brokersRes.data);
      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBroker = async () => {
    if (!newBroker.name || !newBroker.whatsapp) {
      toast({ title: "Erro", description: "Nome e WhatsApp são obrigatórios", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("brokers").insert({
      name: newBroker.name,
      email: newBroker.email || null,
      phone: newBroker.phone || null,
      whatsapp: newBroker.whatsapp,
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar o corretor", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Corretor adicionado" });
      setNewBroker({ name: "", email: "", phone: "", whatsapp: "" });
      setIsAddBrokerOpen(false);
      fetchData();
    }
  };

  const toggleBrokerActive = async (brokerId: string, active: boolean) => {
    const { error } = await supabase.from("brokers").update({ active: !active }).eq("id", brokerId);
    if (!error) {
      fetchData();
    }
  };

  const deleteBroker = async (brokerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este corretor?")) return;
    const { error } = await supabase.from("brokers").delete().eq("id", brokerId);
    if (!error) {
      toast({ title: "Corretor excluído" });
      fetchData();
    }
  };

  const updateSettings = async (field: string, value: string) => {
    if (!settings) return;
    const { error } = await supabase.from("company_settings").update({ [field]: value }).eq("id", settings.id);
    if (!error) {
      setSettings({ ...settings, [field]: value });
      toast({ title: "Configuração atualizada" });
    }
  };

  const viewLeadMessages = async (lead: Lead) => {
    setSelectedLead(lead);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true });
    setLeadMessages(data || []);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      novo: { label: "Novo", variant: "default" },
      em_atendimento: { label: "Em Atendimento", variant: "secondary" },
      qualificado: { label: "Qualificado", variant: "default" },
      visita_solicitada: { label: "Visita Solicitada", variant: "default" },
      nao_respondeu: { label: "Não Respondeu", variant: "destructive" },
      encerrado: { label: "Encerrado", variant: "outline" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Gestão de Leads e Corretores</h1>
          </div>
        </div>

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">
              <MessageSquare className="h-4 w-4 mr-2" />
              Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="brokers">
              <Users className="h-4 w-4 mr-2" />
              Corretores ({brokers.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Data</th>
                        <th className="text-left p-3">Nome</th>
                        <th className="text-left p-3">Telefone</th>
                        <th className="text-left p-3">Imóvel</th>
                        <th className="text-left p-3">Corretor</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-3">{lead.name || "Não informado"}</td>
                          <td className="p-3">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                                {lead.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-sm">{lead.properties?.title || "Geral"}</td>
                          <td className="p-3 text-sm">{lead.brokers?.name || "Não atribuído"}</td>
                          <td className="p-3">{getStatusBadge(lead.status)}</td>
                          <td className="p-3">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => viewLeadMessages(lead)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Conversa com {selectedLead?.name || "Lead"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                  {leadMessages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`p-3 rounded-lg ${
                                        msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                                      }`}
                                    >
                                      <p className="text-sm font-medium mb-1">
                                        {msg.role === "user" ? "Visitante" : "Atendente"}
                                      </p>
                                      <p className="text-sm">{msg.content}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(msg.created_at).toLocaleString("pt-BR")}
                                      </p>
                                    </div>
                                  ))}
                                  {leadMessages.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                      Nenhuma mensagem registrada
                                    </p>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      ))}
                      {leads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            Nenhum lead registrado ainda
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brokers Tab */}
          <TabsContent value="brokers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Corretores</CardTitle>
                <Dialog open={isAddBrokerOpen} onOpenChange={setIsAddBrokerOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Corretor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Corretor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={newBroker.name}
                          onChange={(e) => setNewBroker({ ...newBroker, name: e.target.value })}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label>WhatsApp *</Label>
                        <Input
                          value={newBroker.whatsapp}
                          onChange={(e) => setNewBroker({ ...newBroker, whatsapp: e.target.value })}
                          placeholder="5562999999999"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={newBroker.email}
                          onChange={(e) => setNewBroker({ ...newBroker, email: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={newBroker.phone}
                          onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })}
                          placeholder="(62) 99999-9999"
                        />
                      </div>
                      <Button onClick={handleAddBroker} className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {brokers.map((broker) => (
                    <Card key={broker.id} className={!broker.active ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{broker.name}</h3>
                            {broker.email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {broker.email}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {broker.whatsapp}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Switch
                              checked={broker.active}
                              onCheckedChange={() => toggleBrokerActive(broker.id, broker.active)}
                            />
                            <Button variant="ghost" size="sm" onClick={() => deleteBroker(broker.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <Badge variant={broker.active ? "default" : "secondary"} className="mt-2">
                          {broker.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {brokers.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Nenhum corretor cadastrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Distribuição</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Regra de Distribuição de Leads</Label>
                  <Select
                    value={settings?.distribution_rule || "round_robin"}
                    onValueChange={(value) => updateSettings("distribution_rule", value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Rodízio entre corretores ativos</SelectItem>
                      <SelectItem value="fixed">Corretor fixo padrão</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {settings?.distribution_rule === "round_robin"
                      ? "Leads são distribuídos alternadamente entre todos os corretores ativos"
                      : "Todos os leads vão para um corretor específico"}
                  </p>
                </div>

                {settings?.distribution_rule === "fixed" && (
                  <div>
                    <Label>Corretor Padrão</Label>
                    <Select
                      value={settings?.default_broker_id || ""}
                      onValueChange={(value) => updateSettings("default_broker_id", value)}
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Selecione um corretor" />
                      </SelectTrigger>
                      <SelectContent>
                        {brokers.filter((b) => b.active).map((broker) => (
                          <SelectItem key={broker.id} value={broker.id}>
                            {broker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Corretor Exclusivo por Imóvel</h4>
                  <p className="text-sm text-muted-foreground">
                    Você pode definir um corretor exclusivo para cada imóvel na página de edição do imóvel.
                    Quando um lead é gerado para um imóvel com corretor exclusivo, ele é automaticamente
                    direcionado para esse corretor.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeadsManagement;
